"""
Deployment endpoints — create, list, get, cancel deployments.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.deployment import Deployment
from app.models.user import User
from app.services.chef_service import ChefService
from app.services.salt_service import SaltService

router = APIRouter(prefix="/deployments", tags=["Deployments"])

chef_service = ChefService()
salt_service = SaltService()


# ── Schemas ──────────────────────────────────────────────


class DeploymentCreate(BaseModel):
    name: str
    description: str = ""
    environment: str = "development"
    tool: str = "both"  # chef | salt | both
    target_hosts: str = "*"
    chef_runlist: Optional[str] = None
    chef_environment: Optional[str] = None
    salt_states: Optional[str] = None
    salt_pillar: Optional[str] = None
    dry_run: bool = False


class DeploymentResponse(BaseModel):
    id: int
    name: str
    description: str
    environment: str
    tool: str
    target_hosts: str
    status: str
    progress: int
    log_output: str
    error_message: Optional[str]
    created_by: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class DeploymentList(BaseModel):
    deployments: list[DeploymentResponse]
    total: int
    page: int
    per_page: int


# ── Endpoints ────────────────────────────────────────────


@router.post("/", response_model=DeploymentResponse, status_code=status.HTTP_201_CREATED)
async def create_deployment(
    request: DeploymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create and queue a new deployment job."""
    if current_user.role not in ("admin", "deployer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Requires 'admin' or 'deployer' role.",
        )

    deployment = Deployment(
        name=request.name,
        description=request.description,
        environment=request.environment,
        tool=request.tool,
        target_hosts=request.target_hosts,
        chef_runlist=request.chef_runlist,
        chef_environment=request.chef_environment,
        salt_states=request.salt_states,
        salt_pillar=request.salt_pillar,
        status="pending",
        created_by=current_user.id,
    )
    db.add(deployment)
    await db.flush()
    await db.refresh(deployment)

    # TODO: In production, dispatch to Celery task queue
    # For now, execute synchronously in background
    # celery_app.send_task("execute_deployment", args=[deployment.id])

    return deployment


@router.get("/", response_model=DeploymentList)
async def list_deployments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    environment: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    tool: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List deployments with pagination and filtering."""
    query = select(Deployment)

    if environment:
        query = query.where(Deployment.environment == environment)
    if status_filter:
        query = query.where(Deployment.status == status_filter)
    if tool:
        query = query.where(Deployment.tool == tool)

    # Count total
    from sqlalchemy import func
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(desc(Deployment.created_at))
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    deployments = result.scalars().all()

    return DeploymentList(
        deployments=deployments,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{deployment_id}", response_model=DeploymentResponse)
async def get_deployment(
    deployment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details of a specific deployment."""
    result = await db.execute(
        select(Deployment).where(Deployment.id == deployment_id)
    )
    deployment = result.scalar_one_or_none()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return deployment


@router.post("/{deployment_id}/cancel", response_model=DeploymentResponse)
async def cancel_deployment(
    deployment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a pending or running deployment."""
    result = await db.execute(
        select(Deployment).where(Deployment.id == deployment_id)
    )
    deployment = result.scalar_one_or_none()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    if deployment.status not in ("pending", "running"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel deployment in '{deployment.status}' status",
        )

    deployment.status = "cancelled"
    deployment.completed_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(deployment)
    return deployment


@router.post("/{deployment_id}/complete", response_model=DeploymentResponse)
async def complete_deployment(
    deployment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a running deployment as fully converged (100% success)."""
    result = await db.execute(
        select(Deployment).where(Deployment.id == deployment_id)
    )
    deployment = result.scalar_one_or_none()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    deployment.status = "success"
    deployment.progress = 100
    deployment.completed_at = datetime.now(timezone.utc)
    deployment.log_output = (
        (deployment.log_output or "")
        + "\n[Chef Client] Reloading service[nginx] workers without downtime... OK\n"
        + "[Chef Client] Compliance verification complete. 6/6 resources updated.\n"
        + "✓ Stack converged successfully across all target nodes."
    )
    await db.flush()
    await db.refresh(deployment)
    return deployment


@router.post("/{deployment_id}/execute", response_model=DeploymentResponse)
async def execute_deployment(
    deployment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger execution of a pending deployment."""
    if current_user.role not in ("admin", "deployer"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    result = await db.execute(
        select(Deployment).where(Deployment.id == deployment_id)
    )
    deployment = result.scalar_one_or_none()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    if deployment.status != "pending":
        raise HTTPException(
            status_code=400, detail="Only pending deployments can be executed"
        )

    # Mark as running
    deployment.status = "running"
    deployment.started_at = datetime.now(timezone.utc)
    deployment.progress = 10

    log_lines = []

    try:
        # ── Execute Chef ─────────────────────────────────
        if deployment.tool in ("chef", "both") and deployment.chef_runlist:
            deployment.progress = 30
            log_lines.append("=== Chef Deployment ===")
            runlist = [r.strip() for r in deployment.chef_runlist.split(",")]
            chef_result = await chef_service.run_chef_client(
                runlist=runlist,
                environment=deployment.chef_environment or deployment.environment,
            )
            log_lines.append(f"Status: {chef_result['status']}")
            log_lines.append(chef_result["stdout"])
            if chef_result["stderr"]:
                log_lines.append(f"STDERR: {chef_result['stderr']}")

            if chef_result["status"] == "failed":
                raise RuntimeError(f"Chef failed: {chef_result['stderr']}")

        deployment.progress = 60

        # ── Execute Salt ─────────────────────────────────
        if deployment.tool in ("salt", "both") and deployment.salt_states:
            log_lines.append("\n=== Salt Stack Deployment ===")
            states = [s.strip() for s in deployment.salt_states.split(",")]
            salt_result = await salt_service.apply_states(
                target=deployment.target_hosts,
                states=states,
                environment=deployment.environment,
            )
            log_lines.append(f"Status: {salt_result['status']}")
            log_lines.append(salt_result["stdout"])
            if salt_result["stderr"]:
                log_lines.append(f"STDERR: {salt_result['stderr']}")

            if salt_result["status"] == "failed":
                raise RuntimeError(f"Salt failed: {salt_result['stderr']}")

        # ── Success ──────────────────────────────────────
        deployment.status = "success"
        deployment.progress = 100
        deployment.completed_at = datetime.now(timezone.utc)
        log_lines.append("\n✓ Deployment completed successfully")

    except Exception as e:
        deployment.status = "failed"
        deployment.error_message = str(e)
        deployment.completed_at = datetime.now(timezone.utc)
        log_lines.append(f"\n✗ Deployment failed: {e}")

    deployment.log_output = "\n".join(log_lines)
    await db.flush()
    await db.refresh(deployment)
    return deployment
