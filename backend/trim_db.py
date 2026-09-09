import os
from dotenv import load_dotenv
from core.config import settings

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL") or settings.DATABASE_URL

async def main():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        print("Finding top 200 users...")
        res = await conn.execute(text("SELECT id FROM users ORDER BY id LIMIT 200"))
        keep_ids = [str(r[0]) for r in res.fetchall()]
        
        if not keep_ids:
            print("No users found.")
            return

        print(f"Keeping {len(keep_ids)} users.")
        
        placeholders = ', '.join(f"'{uid}'" for uid in keep_ids)
        
        print("Deleting claims...")
        await conn.execute(text(f"""
            DELETE FROM claims WHERE farm_id IN (
                SELECT id FROM farms WHERE user_id NOT IN ({placeholders})
            )
        """))
        
        print("Deleting policies...")
        await conn.execute(text(f"DELETE FROM insurance_policies WHERE user_id NOT IN ({placeholders})"))
        
        print("Deleting farms...")
        await conn.execute(text(f"DELETE FROM farms WHERE user_id NOT IN ({placeholders})"))
        
        print("Deleting users...")
        await conn.execute(text(f"DELETE FROM users WHERE id NOT IN ({placeholders})"))

    print("Database trimmed successfully.")

if __name__ == "__main__":
    asyncio.run(main())
