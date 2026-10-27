from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from core.config import settings

# Normalize Supabase / Render PostgreSQL URLs to asyncpg
db_url = (settings.DATABASE_URL or "").strip()
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

connect_args = {}
if ":6543" in db_url or "pooler" in db_url:
    # Disable asyncpg prepared statements for PgBouncer / Supabase transaction pooler compatibility
    connect_args["statement_cache_size"] = 0

engine = create_async_engine(
    db_url,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20,
    connect_args=connect_args
)
AsyncSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

