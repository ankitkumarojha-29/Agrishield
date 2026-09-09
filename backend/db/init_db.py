import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

from core.config import settings
from db.models import Base, User, UserRole
from core.security import get_password_hash

logger = logging.getLogger(__name__)

async def init_db():
    logger.info("Initializing database...")
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))
        # Enable PostGIS
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Check if admin exists
        # Actually since we dropped all, it doesn't exist
        logger.info("Creating default admin account...")
        admin = User(
            email="admin@agrishield.com",
            name="Default Admin",
            role=UserRole.ADMIN,
            hashed_password=get_password_hash("admin123")  # Using default password
        )
        session.add(admin)
        await session.commit()
        logger.info("Database initialized with default admin.")

if __name__ == "__main__":
    asyncio.run(init_db())
