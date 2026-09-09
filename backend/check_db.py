import os
from dotenv import load_dotenv
from core.config import settings

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL") or settings.DATABASE_URL

async def check():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print('User count:', (await conn.execute(text('SELECT COUNT(*) FROM users'))).scalar())
        print('Farm count:', (await conn.execute(text('SELECT COUNT(*) FROM farms'))).scalar())
        print('Policy count:', (await conn.execute(text('SELECT COUNT(*) FROM insurance_policies'))).scalar())
        print('Claim count:', (await conn.execute(text('SELECT COUNT(*) FROM claims'))).scalar())

if __name__ == '__main__':
    asyncio.run(check())
