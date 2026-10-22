"""
Database migration: Adds google_id column and unique index to users table.
Safe to run repeatedly (uses IF NOT EXISTS). Does not delete any existing farmer data.
"""
import asyncio
import logging
from sqlalchemy import text
from db.session import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def migrate_google_oauth():
    logger.info("Starting Google OAuth column migration on users table...")
    try:
        async with engine.begin() as conn:
            # 1. Add google_id column if it doesn't already exist
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR;"))
            # 2. Add unique index on google_id if it doesn't already exist
            await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id ON users(google_id);"))
            logger.info("Successfully added google_id column and unique index to users table.")
    except Exception as e:
        logger.error(f"Migration error (could be SQLite in testing or permissions): {e}")

if __name__ == "__main__":
    asyncio.run(migrate_google_oauth())
