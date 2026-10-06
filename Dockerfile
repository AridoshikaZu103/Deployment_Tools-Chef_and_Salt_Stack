# ============================================================
# Nova-Orchestrator - SRE Command Center Standard Dockerfile
# Production & Local Container Image for FastAPI Backend
# ============================================================
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

WORKDIR /app

# Install minimal system dependencies for infrastructure orchestration & health checking
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    openssh-client \
    ruby \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies from backend/requirements.txt
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source files (excludes .env, venv, node_modules via .dockerignore)
COPY backend/app ./app
COPY chef ./chef
COPY salt ./salt
COPY environments ./environments

# Create runtime logs directory
RUN mkdir -p logs

EXPOSE 8000

# Container healthcheck targeting real FastAPI /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Production ASGI server execution respecting $PORT environment variable
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]
