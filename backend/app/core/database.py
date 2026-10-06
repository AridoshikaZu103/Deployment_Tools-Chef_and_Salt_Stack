"""
Async SQLAlchemy database engine and session management.
"""

from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()


def get_normalized_database_url(raw_url: str) -> str:
    """
    Normalize database connection URL for SQLAlchemy async engine.
    Supports standard postgresql:// and postgres:// schemes by mapping to asyncpg,
    and strips incompatible query parameters (such as channel_binding).
    """
    url = raw_url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    if "postgresql+asyncpg" in url and "?" in url:
        u = urlparse(url)
        query_params = parse_qs(u.query)
        # asyncpg does not support channel_binding
        query_params.pop("channel_binding", None)
        # map sslmode to ssl for asyncpg
        if "sslmode" in query_params:
            mode = query_params.pop("sslmode")[0]
            query_params["ssl"] = [mode]
        new_query = urlencode(query_params, doseq=True)
        url = urlunparse(u._replace(query=new_query))
    return url


from sqlalchemy.pool import NullPool

engine = create_async_engine(
    get_normalized_database_url(settings.database_url),
    echo=settings.debug,
    future=True,
    poolclass=NullPool,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Backwards compatibility alias
async_session = AsyncSessionLocal


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency that yields a request-scoped database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            if session.is_active:
                try:
                    await session.rollback()
                except Exception:
                    pass
            raise


async def init_db() -> None:
    """Create all tables on application startup and ensure schema migrations."""
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Ensure new columns on existing deployments table
        try:
            await conn.execute(text("ALTER TABLE deployments ADD COLUMN IF NOT EXISTS engine VARCHAR(20) DEFAULT 'hybrid';"))
            await conn.execute(text("ALTER TABLE deployments ADD COLUMN IF NOT EXISTS strategy VARCHAR(20) DEFAULT 'rolling';"))
            await conn.execute(text("ALTER TABLE deployments ADD COLUMN IF NOT EXISTS is_simulation BOOLEAN DEFAULT FALSE;"))
        except Exception as e:
            # Table might not exist yet or sqlite/other dialect
            pass

