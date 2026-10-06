"""
Server management and health check endpoints.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.server import Server
from app.models.user import User
from app.services.health_service import HealthService

router = APIRouter(prefix="/servers", tags=["Servers"])

health_service = HealthService()


# ── Schemas ──────────────────────────────────────────────


class ServerCreate(BaseModel):
    hostname: str
    ip_address: str
    fqdn: Optional[str] = None
    environment: str = "development"
    role: str = "webserver"
    os_family: str = "linux"
    os_version: Optional[str] = None
    managed_by: str = "both"
    chef_node_name: Optional[str] = None
    chef_run_list: Optional[str] = None
    salt_minion_id: Optional[str] = None


class ServerResponse(BaseModel):
    id: int
    hostname: str
    ip_address: str
    fqdn: Optional[str]
    environment: str
    role: str
    os_family: str
    os_version: Optional[str]
    managed_by: str
    is_active: bool
    health_status: str
    last_health_check: Optional[datetime] = None
    chef_node_name: Optional[str]
    salt_minion_id: Optional[str]

    model_config = {"from_attributes": True}


class HealthCheckResponse(BaseModel):
    hostname: str
    ip_address: str
    health_status: str
    checks: list[dict]
    checked_at: str


# ── Endpoints ────────────────────────────────────────────


@router.post("/", response_model=ServerResponse, status_code=status.HTTP_201_CREATED)
async def create_server(
    request: ServerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a new managed server."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    existing = await db.execute(
        select(Server).where(Server.hostname == request.hostname)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Server already registered")

    server = Server(**request.model_dump())
    db.add(server)
    await db.flush()
    await db.refresh(server)
    return server


@router.get("/", response_model=list[ServerResponse])
async def list_servers(
    environment: Optional[str] = None,
    role: Optional[str] = None,
    health_status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all managed servers with optional filtering."""
    query = select(Server).where(Server.is_active == True)  # noqa: E712

    if environment:
        query = query.where(Server.environment == environment)
    if role:
        query = query.where(Server.role == role)
    if health_status:
        query = query.where(Server.health_status == health_status)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{server_id}", response_model=ServerResponse)
async def get_server(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific server's details."""
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


@router.post("/{server_id}/health-check", response_model=HealthCheckResponse)
async def check_server_health(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run a health check on a specific server."""
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    check_result = await health_service.check_server(server)

    # Persist verification result and timestamp to SQLite/PostgreSQL
    import json
    from datetime import datetime, timezone
    server.health_status = check_result["health_status"]
    server.last_health_check = datetime.now(timezone.utc)
    server.health_details = json.dumps(check_result["checks"])
    await db.commit()
    await db.refresh(server)

    return HealthCheckResponse(
        hostname=server.hostname,
        ip_address=server.ip_address,
        **check_result,
    )


@router.post("/health-check-all", response_model=list[HealthCheckResponse])
async def check_all_servers_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run health checks on all active servers."""
    results = await health_service.check_all_servers(db)
    return results


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_server(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete (deactivate) a managed server."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    server.is_active = False
    await db.flush()
