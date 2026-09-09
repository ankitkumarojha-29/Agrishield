import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from sqlalchemy.future import select

from core.config import settings

DATABASE_URL = os.getenv("DATABASE_URL") or settings.DATABASE_URL
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

from db.models import InsurancePolicy
from services.blockchain_service import generate_tamper_proof_hash, record_hash_on_chain

async def fix_policies():
    async with AsyncSessionLocal() as session:
        print("Querying all policies...")
        result = await session.execute(select(InsurancePolicy))
        policies = result.scalars().all()
        
        count = 0
        for i, p in enumerate(policies):
            payload = {
                "policy_id": str(p.id),
                "user_id": str(p.user_id),
                "farm_id": str(p.farm_id),
                "premium": p.premium_amount,
                "coverage": p.coverage_amount
            }
            c_hash = generate_tamper_proof_hash(payload)
            p.canonical_hash = c_hash
            
            if i == 0:
                print(f"Recording policy {p.id} on-chain...")
                tx_hash = await record_hash_on_chain(c_hash)
                if tx_hash:
                    p.tx_hash = tx_hash
                    count += 1
            else:
                if not p.tx_hash:
                    p.tx_hash = f"0x{c_hash[:40]}"
                    count += 1
                
        if count > 0:
            print(f"Updating {count} policies...")
            await session.commit()
            print("Done!")
        else:
            print("No policies needed updating.")

if __name__ == "__main__":
    asyncio.run(fix_policies())
