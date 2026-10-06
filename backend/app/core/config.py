"""
Application configuration using Pydantic Settings.
Loads from environment variables and .env files.
"""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


def _resolve_repo_path(sub_path: str) -> str:
    """Resolve directory path checking backend package first, then repo root."""
    backend_sub = Path(__file__).resolve().parents[2] / sub_path
    if backend_sub.exists():
        return str(backend_sub)
    root_sub = Path(__file__).resolve().parents[3] / sub_path
    if root_sub.exists():
        return str(root_sub)
    cwd_backend_sub = Path.cwd() / "backend" / sub_path
    if cwd_backend_sub.exists():
        return str(cwd_backend_sub)
    cwd_sub = Path.cwd() / sub_path
    if cwd_sub.exists():
        return str(cwd_sub)
    return str(backend_sub)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── Application ──────────────────────────────────────
    app_name: str = "Deployment Tools"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"  # development | staging | production

    # ── Server ───────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ── Database ─────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./deployment_tools.db"

    # ── Authentication ───────────────────────────────────
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # ── Chef Configuration ───────────────────────────────
    chef_binary: str = "chef-client"
    chef_repo_path: str = _resolve_repo_path("chef")
    knife_config_path: Optional[str] = None

    # ── Salt Stack Configuration ─────────────────────────
    salt_binary: str = "salt"
    salt_master_config: str = "/etc/salt/master"
    salt_repo_path: str = _resolve_repo_path("salt")

    # ── Celery / Redis ───────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # ── AI Agent (Gemini 3.8 Flash) ─────────────────────
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-3.8-flash"

    # ── Logging ──────────────────────────────────────────
    log_level: str = "INFO"
    log_file: str = "logs/deployment_tools.log"

    model_config = {
        "env_file": [
            str(Path(__file__).resolve().parents[2] / ".env"),
            ".env",
        ],
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()


settings = get_settings()
