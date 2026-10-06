"""
Deployment API Endpoints — Create, List, Get, Cancel, Retry, Delete, Steps, Logs, and Real-Time SSE Streams.
"""

import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.events import broadcaster
from app.core.security import get_current_user
from app.models.deployment import (
    Deployment,
    DeploymentStep,
    DeploymentTarget,
    DeploymentLog,
    DeploymentAudit,
)
from app.models.user import User
from app.services.deployment_service import deployment_service

router = APIRouter(prefix="/deployments", tags=["Deployments"])


# ── Schemas ──────────────────────────────────────────────


class StepResponse(BaseModel):
    id: int
    step_order: int
    name: str
    step_type: str
    target_name: Optional[str] = None
    status: str
    progress: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    message: Optional[str] = None
    error: Optional[str] = None

    model_config = {"from_attributes": True}


class TargetResponse(BaseModel):
    id: int
    node_hostname: str
    target_service: str
    status: str
    progress: int
    message: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LogResponse(BaseModel):
    id: int
    step_id: Optional[int] = None
    level: str
    message: str
    node_hostname: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditResponse(BaseModel):
    id: int
    username: str
    action: str
    details: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DeploymentCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    environment: str = "development"  # development | staging | production
    engine: Optional[str] = "hybrid"  # chef | salt | hybrid
    tool: Optional[str] = None  # backward compatibility alias: chef | salt | both
    strategy: str = "rolling"  # rolling | all-at-once | canary
    targets: Optional[List[str]] = None
    nodes: Optional[List[str]] = None
    target_hosts: Optional[str] = None  # backward compatibility comma-separated / glob
    chef_runlist: Optional[str] = None
    chef_environment: Optional[str] = None
    salt_states: Optional[str] = None
    salt_pillar: Optional[str] = None
    auto_confirm: bool = True


class DeploymentResponse(BaseModel):
    id: int
    name: str
    description: str
    environment: str
    engine: str
    tool: str
    strategy: str
    target_hosts: str
    status: str
    progress: int
    is_simulation: bool
    log_output: str
    error_message: Optional[str] = None
    created_by: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    steps: Optional[List[StepResponse]] = None
    targets: Optional[List[TargetResponse]] = None
    logs: Optional[List[LogResponse]] = None
    audits: Optional[List[AuditResponse]] = None

    model_config = {"from_attributes": True}


class DeploymentListResponse(BaseModel):
    deployments: List[DeploymentResponse]
    total: int
    page: int
    per_page: int


# ── Real-Time Server-Sent Events (SSE) ────────────────────


@router.get("/events")
async def stream_deployment_events(request: Request):
    """
    Server-Sent Events (SSE) endpoint for live deployment activity.
    Broadcasts real-time events to React frontend.
    """
    async def event_generator():
        # First send recent buffer so reconnecting client is in sync
        recent = broadcaster.get_recent_events(limit=10)
        for evt in recent:
            yield f"data: {json.dumps(evt)}\n\n"

        # Stream new events
        async for event in broadcaster.subscribe():
            if await request.is_disconnected():
                break
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Core Deployment CRUD Endpoints ────────────────────────


@router.post("/", response_model=DeploymentResponse, status_code=status.HTTP_201_CREATED)
async def create_deployment(
    request: DeploymentCreateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new deployment with granular steps, target nodes, and background execution.
    """
    if current_user.role not in ("admin", "deployer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Requires 'admin' or 'deployer' role.",
        )

    # Resolve engine from engine or tool
    engine = request.engine or ("hybrid" if request.tool == "both" else request.tool) or "hybrid"

    # Resolve target nodes
    nodes = request.nodes
    if nodes is None:
        if request.target_hosts:
            nodes = [h.strip() for h in request.target_hosts.split(",") if h.strip()]
        else:
            nodes = ["prod-web-01", "prod-app-01", "prod-db-01", "prod-mon-01"]
    else:
        nodes = [n.strip() for n in nodes if n.strip()]

    # Resolve infrastructure targets
    targets = request.targets
    if targets is None:
        targets = ["nginx", "fastapi", "postgresql", "prometheus"]
    else:
        targets = [t.strip() for t in targets if t.strip()]

    if not targets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one infrastructure target must be selected (e.g. nginx, fastapi, postgresql, prometheus)",
        )

    if not nodes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one target node must be specified (e.g. web-01, prod-web-01)",
        )

    try:
        deployment = await deployment_service.create_deployment(
            name=request.name,
            environment=request.environment,
            engine=engine,
            targets=targets,
            nodes=nodes,
            strategy=request.strategy or "rolling",
            description=request.description or "",
            user_id=current_user.id,
            username=current_user.username,
            auto_confirm=request.auto_confirm,
            chef_runlist=request.chef_runlist,
            salt_states=request.salt_states,
            session=db,
        )
        if request.auto_confirm:
            background_tasks.add_task(deployment_service.executor.start_execution, deployment.id)
        return deployment
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create deployment: {e}")


@router.get("/", response_model=DeploymentListResponse)
async def list_deployments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    environment: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    engine: Optional[str] = None,
    tool: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List deployments with filtering, pagination, and full step relationships."""
    query = (
        select(Deployment)
        .options(
            selectinload(Deployment.steps),
            selectinload(Deployment.targets),
            selectinload(Deployment.audits),
        )
    )

    if environment and environment != "all":
        query = query.where(Deployment.environment.ilike(environment))
    if status_filter and status_filter != "all":
        query = query.where(Deployment.status.ilike(status_filter))
    
    eng = engine or tool
    if eng and eng != "all":
        if eng == "both":
            eng = "hybrid"
        query = query.where((Deployment.engine.ilike(eng)) | (Deployment.tool.ilike(eng)))

    # Total count
    count_query = select(func.count(Deployment.id))
    if environment and environment != "all":
        count_query = count_query.where(Deployment.environment.ilike(environment))
    if status_filter and status_filter != "all":
        count_query = count_query.where(Deployment.status.ilike(status_filter))

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    # Paginate
    query = query.order_by(desc(Deployment.created_at))
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    deployments = result.scalars().all()

    return DeploymentListResponse(
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
    """Get full details of a specific deployment including steps, targets, logs, and audits."""
    stmt = (
        select(Deployment)
        .options(
            selectinload(Deployment.steps),
            selectinload(Deployment.targets),
            selectinload(Deployment.logs),
            selectinload(Deployment.audits),
        )
        .where(Deployment.id == deployment_id)
    )
    result = await db.execute(stmt)
    deployment = result.scalar_one_or_none()
    if not deployment:
        raise HTTPException(status_code=404, detail=f"Deployment #{deployment_id} not found")

    return deployment


@router.get("/{deployment_id}/steps", response_model=List[StepResponse])
async def get_deployment_steps(
    deployment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all workflow steps for a deployment."""
    stmt = (
        select(DeploymentStep)
        .where(DeploymentStep.deployment_id == deployment_id)
        .order_by(DeploymentStep.step_order)
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/{deployment_id}/logs", response_model=List[LogResponse])
async def get_deployment_logs(
    deployment_id: int,
    level: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get structured logs for a deployment with optional level filter."""
    stmt = select(DeploymentLog).where(DeploymentLog.deployment_id == deployment_id)
    if level and level != "ALL":
        stmt = stmt.where(DeploymentLog.level == level.upper())
    stmt = stmt.order_by(DeploymentLog.id)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/{deployment_id}/confirm", response_model=DeploymentResponse)
async def confirm_deployment(
    deployment_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm a planned deployment and queue execution."""
    if current_user.role not in ("admin", "deployer"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        dep = await deployment_service.confirm_deployment(
            deployment_id=deployment_id,
            username=current_user.username,
            session=db,
        )
        background_tasks.add_task(deployment_service.executor.start_execution, deployment_id)
        return dep
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{deployment_id}/cancel", response_model=DeploymentResponse)
async def cancel_deployment(
    deployment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a pending, queued, or running deployment."""
    if current_user.role not in ("admin", "deployer"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    await deployment_service.cancel_deployment(
        deployment_id=deployment_id,
        username=current_user.username,
    )
    stmt = (
        select(Deployment)
        .options(
            selectinload(Deployment.steps),
            selectinload(Deployment.targets),
            selectinload(Deployment.logs),
            selectinload(Deployment.audits),
        )
        .where(Deployment.id == deployment_id)
    )
    res = await db.execute(stmt)
    dep = res.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return dep


@router.post("/{deployment_id}/retry", response_model=DeploymentResponse)
async def retry_deployment(
    deployment_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Safely retry a failed or cancelled deployment."""
    if current_user.role not in ("admin", "deployer"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        dep = await deployment_service.retry_deployment(
            deployment_id=deployment_id,
            username=current_user.username,
            session=db,
        )
        background_tasks.add_task(deployment_service.executor.start_execution, deployment_id)
        return dep
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{deployment_id}")
async def delete_deployment(
    deployment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a deployment record.
    Cannot delete RUNNING or QUEUED deployments without cancelling first.
    """
    if current_user.role not in ("admin", "deployer"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        await deployment_service.delete_deployment(
            deployment_id=deployment_id,
            username=current_user.username,
            session=db,
        )
        return {"success": True, "message": f"Deployment #{deployment_id} deleted successfully."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Backward compatibility aliases
@router.post("/{deployment_id}/execute", response_model=DeploymentResponse)
async def legacy_execute_deployment(
    deployment_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute alias that delegates to confirm_deployment and launches executor."""
    return await confirm_deployment(deployment_id, background_tasks, db, current_user)


@router.post("/{deployment_id}/complete", response_model=DeploymentResponse)
async def legacy_complete_deployment(
    deployment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Complete alias that marks deployment and all steps as converged."""
    stmt = (
        select(Deployment)
        .options(
            selectinload(Deployment.steps),
            selectinload(Deployment.targets),
            selectinload(Deployment.logs),
            selectinload(Deployment.audits),
        )
        .where(Deployment.id == deployment_id)
    )
    res = await db.execute(stmt)
    dep = res.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")
    dep.status = "SUCCESS"
    dep.progress = 100
    dep.completed_at = datetime.now(timezone.utc)
    if not dep.started_at:
        dep.started_at = datetime.now(timezone.utc)
    if dep.steps:
        for s in dep.steps:
            s.status = "SUCCEEDED"
            s.progress = 100
    if dep.targets:
        for t in dep.targets:
            t.status = "SUCCEEDED"
            t.progress = 100
    audit = DeploymentAudit(
        deployment_id=dep.id,
        username=current_user.username,
        action="completed",
        details="Operator marked deployment as converged (100% complete).",
        created_at=datetime.now(timezone.utc),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(dep)
    await broadcaster.broadcast({
        "type": "deployment.updated",
        "deployment_id": dep.id,
        "status": dep.status,
        "progress": dep.progress,
    })
    return dep
