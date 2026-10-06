"""
Vercel Serverless Function entrypoint.
Exposes the FastAPI application instance for Vercel Python runtime.
"""

import os
import sys

# Ensure the backend root directory is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

__all__ = ["app"]
