"""
Deployment Tools — FastAPI Application Entry Point.

Mounts all API routers, configures CORS, and initializes the database.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api import auth, configs, deployments, servers, ai
from app.core.config import get_settings
from app.core.database import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown hooks."""
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")

    # Initialize database tables
    await init_db()
    logger.info("Database initialized")

    # Seed initial test data
    from app.core.seed import seed_initial_data
    await seed_initial_data()
    logger.info("Default seed records verified")

    yield

    logger.info("Shutting down")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "REST API for orchestrating infrastructure deployments "
        "with Chef and Salt Stack."
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers ──────────────────────────────────────────

API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(deployments.router, prefix=API_PREFIX)
app.include_router(servers.router, prefix=API_PREFIX)
app.include_router(configs.router, prefix=API_PREFIX)
app.include_router(ai.router, prefix=API_PREFIX)


# ── Root Endpoints ───────────────────────────────────────


@app.get("/", tags=["Root"])
async def root():
    """API root — basic info and links."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "docs": "/api/docs",
        "api_prefix": API_PREFIX,
    }


@app.get("/health", tags=["Root"])
async def health_check():
    """Application-level health check."""
    from app.services.chef_service import ChefService
    from app.services.salt_service import SaltService

    chef = ChefService()
    salt = SaltService()

    return {
        "status": "healthy",
        "version": settings.app_version,
        "environment": settings.environment,
        "services": {
            "chef_available": chef.is_available(),
            "salt_available": salt.is_available(),
        },
    }
