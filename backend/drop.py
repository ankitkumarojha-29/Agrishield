import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = (os.getenv("DATABASE_URL") or "").replace("+asyncpg", "")

async def main():
    if not DATABASE_URL:
        print("DATABASE_URL is not set.")
        return
    conn = await asyncpg.connect(DATABASE_URL)
    await conn.execute("DROP TABLE IF EXISTS claims, farms, users, alembic_version CASCADE;")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
