"""
Main entrypoint for Vercel Serverless and ASGI servers.
Exposes the FastAPI application instance.
"""

from app.main import app

__all__ = ["app"]
