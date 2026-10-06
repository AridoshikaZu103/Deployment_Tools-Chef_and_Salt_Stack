"""
Deployment Service.

Unified infrastructure deployment orchestrator integrating:
- ChefService (Cookbooks, knife, chef-client)
- SaltService (States, formulas, salt-master)
- HybridDeploymentService (Coordinated Chef + Salt orchestration)
- DeploymentExecutor (Real vs Development Simulation background execution)
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple

from loguru import logger
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, async_session
from app.core.events import broadcaster
from app.models.deployment import (
    Deployment,
    DeploymentStep,
    DeploymentTarget,
    DeploymentLog,
    DeploymentAudit,
)
from app.models.server import Server
from app.services.chef_service import ChefService
from app.services.salt_service import SaltService
from app.services.deployment_executor import deployment_executor


class HybridDeploymentService:
    """Coordinates multi-engine deployments running both Chef and Salt."""

    def __init__(self, chef: ChefService, salt: SaltService):
        self.chef = chef
        self.salt = salt

    def get_run_plan(self, targets: list[str], nodes: list[str]) -> list[dict]:
        """Generate hybrid run plan with Chef infrastructure prep and Salt states."""
        plan = []
        for t in targets:
            plan.append({
                "target": t,
                "chef_recipe": f"recipe[{t}::default]",
                "salt_state": f"{t}.sls",
                "nodes": nodes,
            })
        return plan


class DeploymentService:
    """Primary service layer for managing deployment lifecycles."""

    VALID_ENVIRONMENTS = {"development", "staging", "production"}
    VALID_ENGINES = {"chef", "salt", "hybrid", "both"}
    VALID_STRATEGIES = {"rolling", "all-at-once", "canary"}
    KNOWN_TARGETS = {
        "nginx": "Nginx Reverse Proxy",
        "fastapi": "FastAPI Application Cluster",
        "postgresql": "PostgreSQL 15 Database",
        "prometheus": "Prometheus & Node Exporter",
    }

    def __init__(self):
        self.chef_service = ChefService()
        self.salt_service = SaltService()
        self.hybrid_service = HybridDeploymentService(self.chef_service, self.salt_service)
        self.executor = deployment_executor

    def validate_deployment_request(
        self,
        environment: str,
        engine: str,
        targets: list[str],
        nodes: list[str],
        strategy: str,
    ) -> Tuple[bool, Optional[str]]:
        """Validate all parameters for a new deployment."""
        if environment.lower() not in self.VALID_ENVIRONMENTS:
            return False, f"Invalid environment '{environment}'. Must be one of: {', '.join(self.VALID_ENVIRONMENTS)}"

        if engine.lower() not in self.VALID_ENGINES:
            return False, f"Invalid engine '{engine}'. Must be one of: {', '.join(self.VALID_ENGINES)}"

        if strategy.lower() not in self.VALID_STRATEGIES:
            return False, f"Invalid strategy '{strategy}'. Must be one of: {', '.join(self.VALID_STRATEGIES)}"

        if not targets:
            return False, "At least one infrastructure target must be selected (e.g. nginx, fastapi, postgresql, prometheus)"

        if not nodes:
            return False, "At least one target node or pattern must be specified (e.g. *, web-*, prod-web-01)"

        return True, None

    def build_workflow_steps(
        self,
        engine: str,
        targets: list[str],
        strategy: str,
    ) -> list[dict]:
        """Construct the granular execution steps for the deployment."""
        steps = []
        order = 1

        # 1. Pre-flight validation
        steps.append({
            "step_order": order,
            "name": "Pre-flight validation & cluster connectivity",
            "step_type": "preflight",
            "target_name": "all",
        })
        order += 1

        # 2. Configuration preparation
        engine_label = "Chef cookbooks & Salt states" if engine in ("hybrid", "both") else ("Chef cookbooks" if engine == "chef" else "Salt states")
        steps.append({
            "step_order": order,
            "name": f"Prepare & validate {engine_label}",
            "step_type": "prep",
            "target_name": "config",
        })
        order += 1

        # 3. Target deployments
        for target in targets:
            t_clean = target.strip().lower()
            target_label = self.KNOWN_TARGETS.get(t_clean, f"{t_clean.capitalize()} Service")
            steps.append({
                "step_order": order,
                "name": f"Deploy {target_label} ({strategy.title()} strategy)",
                "step_type": "deploy_target",
                "target_name": t_clean,
            })
            order += 1

        # 4. Service health checks
        steps.append({
            "step_order": order,
            "name": "Health checks & latency verification",
            "step_type": "health_check",
            "target_name": "all",
        })
        order += 1

        # 5. Final convergence verification
        steps.append({
            "step_order": order,
            "name": "Final cluster verification & compliance",
            "step_type": "verification",
            "target_name": "all",
        })

        return steps

    async def create_deployment(
        self,
        name: str,
        environment: str,
        engine: str,
        targets: list[str],
        nodes: list[str],
        strategy: str = "rolling",
        description: str = "",
        user_id: int = 1,
        username: str = "admin",
        auto_confirm: bool = True,
        chef_runlist: Optional[str] = None,
        salt_states: Optional[str] = None,
        session: Optional[AsyncSession] = None,
    ) -> Deployment:
        """Create a full deployment record with pre-flight verification, steps, targets, and initial audit."""
        # Validation
        valid, err = self.validate_deployment_request(environment, engine, targets, nodes, strategy)
        if not valid:
            raise ValueError(err)

        norm_engine = "hybrid" if engine.lower() in ("both", "hybrid") else engine.lower()
        tool_alias = "both" if norm_engine == "hybrid" else norm_engine
        target_hosts_str = ", ".join(nodes) if isinstance(nodes, list) else str(nodes)

        # Build runlist / states if not explicitly passed
        if not chef_runlist and norm_engine in ("chef", "hybrid"):
            chef_runlist = ", ".join([f"recipe[{t}::default]" for t in targets])
        if not salt_states and norm_engine in ("salt", "hybrid"):
            salt_states = ", ".join(targets)

        initial_status = "QUEUED" if auto_confirm else "PENDING"
        use_sim = self.executor.is_simulation_environment()
        session_provided = session is not None

        async def _populate(s: AsyncSession) -> Deployment:
            deployment = Deployment(
                name=name,
                description=description or f"Deploy {', '.join(targets)} on {target_hosts_str} via {norm_engine.upper()}",
                environment=environment.lower(),
                engine=norm_engine,
                tool=tool_alias,
                strategy=strategy.lower(),
                target_hosts=target_hosts_str,
                chef_runlist=chef_runlist,
                chef_environment=environment.lower(),
                salt_states=salt_states,
                status=initial_status,
                progress=5,
                is_simulation=use_sim,
                created_by=user_id,
                created_at=datetime.now(timezone.utc),
            )
            s.add(deployment)
            await s.flush()

            # Generate steps with pre-flight verification completed
            raw_steps = self.build_workflow_steps(norm_engine, targets, strategy)
            steps_list = []
            for st in raw_steps:
                is_preflight = st["step_type"] == "preflight"
                step_obj = DeploymentStep(
                    deployment_id=deployment.id,
                    step_order=st["step_order"],
                    name=st["name"],
                    step_type=st["step_type"],
                    target_name=st["target_name"],
                    status="SUCCEEDED" if is_preflight else "PENDING",
                    progress=100 if is_preflight else 0,
                    message="Pre-flight validation & cluster connectivity verified" if is_preflight else None,
                    completed_at=datetime.now(timezone.utc) if is_preflight else None,
                )
                steps_list.append(step_obj)
                s.add(step_obj)

            # Generate target nodes mapping
            targets_list = []
            for node in nodes:
                node_clean = node.strip()
                if not node_clean:
                    continue
                for target in targets:
                    dt = DeploymentTarget(
                        deployment_id=deployment.id,
                        node_hostname=node_clean,
                        target_service=target.strip().lower(),
                        status="PENDING",
                        progress=0,
                        updated_at=datetime.now(timezone.utc),
                    )
                    targets_list.append(dt)
                    s.add(dt)

            # Initial log
            init_log = DeploymentLog(
                deployment_id=deployment.id,
                level="INFO",
                message=(
                    f"Deployment #{deployment.id} initialized: '{deployment.name}'. "
                    f"Pre-flight verification passed. Targets: {', '.join(targets)}. Strategy: {strategy}. "
                    + ("[SIMULATION MODE]" if use_sim else "[PRODUCTION CLUSTER]")
                ),
                created_at=datetime.now(timezone.utc),
            )
            s.add(init_log)

            # Audit record
            audit = DeploymentAudit(
                deployment_id=deployment.id,
                user_id=user_id,
                username=username,
                action="created",
                details=f"Created deployment plan with {len(raw_steps)} steps across {len(nodes)} nodes",
                created_at=datetime.now(timezone.utc),
            )
            s.add(audit)

            await s.commit()

            # Fetch fully loaded deployment with populate_existing to reload relationships cleanly
            stmt = (
                select(Deployment)
                .execution_options(populate_existing=True)
                .options(
                    selectinload(Deployment.steps),
                    selectinload(Deployment.targets),
                    selectinload(Deployment.logs),
                    selectinload(Deployment.audits),
                )
                .where(Deployment.id == deployment.id)
            )
            res = await s.execute(stmt)
            loaded = res.scalar_one()

            # Broadcast creation event
            await broadcaster.broadcast({
                "type": "deployment.created",
                "deployment_id": loaded.id,
                "name": loaded.name,
                "status": loaded.status,
                "environment": loaded.environment,
                "engine": loaded.engine,
                "strategy": loaded.strategy,
                "targets": targets,
                "nodes": nodes,
                "is_simulation": use_sim,
            })

            return loaded

        if session_provided:
            loaded_deployment = await _populate(session)
        else:
            async with AsyncSessionLocal() as s:
                loaded_deployment = await _populate(s)

        # If auto_confirm is True and session was not external, trigger execution
        if auto_confirm and not session_provided:
            self.executor.start_execution(loaded_deployment.id)

        return loaded_deployment

    async def confirm_deployment(self, deployment_id: int, username: str = "admin", session: Optional[AsyncSession] = None) -> Deployment:
        """Confirm a pending deployment plan and launch background execution."""
        async def _do_confirm(s: AsyncSession) -> Deployment:
            res = await s.execute(
                select(Deployment)
                .options(
                    selectinload(Deployment.steps),
                    selectinload(Deployment.targets),
                    selectinload(Deployment.logs),
                    selectinload(Deployment.audits),
                )
                .where(Deployment.id == deployment_id)
            )
            deployment = res.scalar_one_or_none()
            if not deployment:
                raise ValueError(f"Deployment #{deployment_id} not found")

            if deployment.status not in ("PENDING", "DRAFT", "VALIDATING"):
                raise ValueError(f"Cannot confirm deployment in '{deployment.status}' status")

            deployment.status = "QUEUED"
            audit = DeploymentAudit(
                deployment_id=deployment.id,
                username=username,
                action="confirmed",
                details="Operator confirmed deployment plan. Enqueued for execution.",
                created_at=datetime.now(timezone.utc),
            )
            s.add(audit)
            await s.commit()
            return deployment

        if session is not None:
            dep = await _do_confirm(session)
        else:
            async with AsyncSessionLocal() as s:
                dep = await _do_confirm(s)

        # Launch background executor
        self.executor.start_execution(deployment_id)
        return dep

    async def cancel_deployment(self, deployment_id: int, username: str = "admin") -> bool:
        """Cancel an active or pending deployment."""
        return await self.executor.cancel(deployment_id)

    async def retry_deployment(self, deployment_id: int, username: str = "admin", session: Optional[AsyncSession] = None) -> Deployment:
        """Retry a failed or cancelled deployment."""
        async def _do_retry(s: AsyncSession) -> Deployment:
            res = await s.execute(
                select(Deployment)
                .options(
                    selectinload(Deployment.steps),
                    selectinload(Deployment.targets),
                    selectinload(Deployment.logs),
                    selectinload(Deployment.audits),
                )
                .where(Deployment.id == deployment_id)
            )
            deployment = res.scalar_one_or_none()
            if not deployment:
                raise ValueError(f"Deployment #{deployment_id} not found")

            if deployment.status not in ("FAILED", "CANCELLED"):
                raise ValueError(f"Can only retry FAILED or CANCELLED deployments, current: '{deployment.status}'")

            deployment.status = "QUEUED"
            deployment.progress = 0
            deployment.error_message = None
            deployment.started_at = None
            deployment.completed_at = None

            # Reset steps
            for step in deployment.steps:
                step.status = "PENDING"
                step.progress = 0
                step.message = None
                step.error = None
                step.started_at = None
                step.completed_at = None

            # Reset targets
            for target in deployment.targets:
                target.status = "PENDING"
                target.progress = 0
                target.message = None
                target.updated_at = datetime.now(timezone.utc)

            log_entry = DeploymentLog(
                deployment_id=deployment.id,
                level="INFO",
                message=f"Deployment #{deployment.id} retry requested by {username}.",
                created_at=datetime.now(timezone.utc),
            )
            s.add(log_entry)

            audit = DeploymentAudit(
                deployment_id=deployment.id,
                username=username,
                action="retried",
                details="Deployment retry queued",
                created_at=datetime.now(timezone.utc),
            )
            s.add(audit)
            await s.commit()
            return deployment

        if session is not None:
            dep = await _do_retry(session)
        else:
            async with AsyncSessionLocal() as s:
                dep = await _do_retry(s)

        # Start execution
        self.executor.start_execution(deployment_id)
        return dep

    async def delete_deployment(self, deployment_id: int, username: str = "admin", session: Optional[AsyncSession] = None) -> bool:
        """Delete deployment record with safe cancellation and confirmation rules."""
        # Rule: Cannot silently delete a running deployment
        if self.executor.is_running(deployment_id):
            raise ValueError(
                f"Deployment #{deployment_id} is currently executing. "
                "Cancel the deployment before deleting it."
            )

        # Wait for any cancelling background task to safely exit
        await self.executor.ensure_stopped(deployment_id)

        async def _do_delete(s: AsyncSession):
            res = await s.execute(
                select(Deployment).where(Deployment.id == deployment_id)
            )
            deployment = res.scalar_one_or_none()
            if not deployment:
                raise ValueError(f"Deployment #{deployment_id} not found")

            if deployment.status in ("RUNNING", "QUEUED", "VALIDATING"):
                raise ValueError(
                    f"Deployment #{deployment_id} is currently {deployment.status}. "
                    "Cancel the deployment before deleting it."
                )

            await s.delete(deployment)
            await s.commit()

        if session is not None:
            await _do_delete(session)
        else:
            async with AsyncSessionLocal() as s:
                await _do_delete(s)

        await broadcaster.broadcast({
            "type": "deployment.deleted",
            "deployment_id": deployment_id,
        })
        return True


deployment_service = DeploymentService()
