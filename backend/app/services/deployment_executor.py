"""
Deployment Executor Architecture.

Coordinates background execution across:
- RealChefExecutor (invokes chef-client / knife)
- RealSaltExecutor (invokes salt / salt-call)
- DevelopmentSimulationExecutor (explicit simulation when CLI binaries are missing)

Tracks cancellation tokens, step execution, target node status, and real-time logs.
"""

import asyncio
import os
import shutil
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple

from loguru import logger
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

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


class RealChefExecutor:
    """Executes real Chef recipes using chef-client CLI."""

    def __init__(self, chef_service: ChefService):
        self.chef = chef_service

    async def execute_step(
        self,
        step: DeploymentStep,
        deployment: Deployment,
        cancel_event: asyncio.Event,
    ) -> Tuple[bool, str, list[str]]:
        """Run real Chef client execution for a specific step."""
        if cancel_event.is_set():
            return False, "Cancelled before Chef execution", []

        runlist = []
        if step.target_name:
            runlist = [f"recipe[{step.target_name}::default]"]
        elif deployment.chef_runlist:
            runlist = [r.strip() for r in deployment.chef_runlist.split(",") if r.strip()]

        result = await self.chef.run_chef_client(
            runlist=runlist,
            environment=deployment.chef_environment or deployment.environment,
            target_host=deployment.target_hosts,
        )

        logs = [result.get("stdout", "")]
        if result.get("stderr"):
            logs.append(f"STDERR: {result['stderr']}")

        success = result.get("status") == "success" and result.get("return_code") == 0
        message = "Chef cookbook converged successfully" if success else result.get("stderr", "Chef execution failed")
        return success, message, logs


class RealSaltExecutor:
    """Executes real SaltStack state formulas using salt CLI."""

    def __init__(self, salt_service: SaltService):
        self.salt = salt_service

    async def execute_step(
        self,
        step: DeploymentStep,
        deployment: Deployment,
        cancel_event: asyncio.Event,
    ) -> Tuple[bool, str, list[str]]:
        """Run real Salt state application for a specific step."""
        if cancel_event.is_set():
            return False, "Cancelled before Salt execution", []

        states = []
        if step.target_name:
            states = [step.target_name]
        elif deployment.salt_states:
            states = [s.strip() for s in deployment.salt_states.split(",") if s.strip()]

        result = await self.salt.apply_states(
            target=deployment.target_hosts,
            states=states,
            environment=deployment.environment,
        )

        logs = [result.get("stdout", "")]
        if result.get("stderr"):
            logs.append(f"STDERR: {result['stderr']}")

        success = result.get("status") == "success" and result.get("return_code") == 0
        message = "Salt state formula applied successfully" if success else result.get("stderr", "Salt execution failed")
        return success, message, logs


class DevelopmentSimulationExecutor:
    """
    Clearly labeled Simulation Executor for development environments without
    native Chef or SaltStack CLI binaries. Emits explicit [SIMULATION] telemetry.
    """

    STEP_DURATIONS = {
        "preflight": 0.2,
        "prep": 0.25,
        "deploy_target": 0.35,
        "health_check": 0.25,
        "verification": 0.2,
    }

    async def execute_step(
        self,
        step: DeploymentStep,
        deployment: Deployment,
        cancel_event: asyncio.Event,
    ) -> Tuple[bool, str, list[dict]]:
        """Run simulated step with realistic delay and explicit [SIMULATION] logs."""
        step_type = step.step_type
        duration = self.STEP_DURATIONS.get(step_type, 0.25)
        
        # Check cancellation before starting
        if cancel_event.is_set():
            return False, "Cancelled", []

        logs = []
        target = step.target_name or "cluster"

        if step_type == "preflight":
            logs.append({
                "level": "INFO",
                "msg": f"[SIMULATION] Verifying target hosts connectivity: {deployment.target_hosts} (SSH port 22 reachable)",
            })
            logs.append({
                "level": "INFO",
                "msg": f"[SIMULATION] Pre-flight checks passed for environment '{deployment.environment}'. Target nodes ready.",
            })
        elif step_type in ("chef_prep", "salt_prep", "prep"):
            eng = deployment.engine.lower()
            if eng == "salt":
                engine_text = "SaltStack Engine"
                assets_text = "Salt formulas (SLS) and pillar data: postgresql, app, nginx, prometheus."
            elif eng == "chef":
                engine_text = "Chef Client Engine"
                assets_text = "Chef cookbooks: nginx (1.0.0), app_server (1.0.0), postgresql, monitoring."
            else:
                engine_text = "Hybrid Orchestrator (Chef + Salt)"
                assets_text = "Chef cookbooks and Salt formulas: nginx, app_server, postgresql, monitoring."

            logs.append({
                "level": "INFO",
                "msg": f"[SIMULATION] Synchronizing configuration assets from repository ({engine_text})...",
            })
            logs.append({
                "level": "INFO",
                "msg": f"[SIMULATION] Loaded configuration assets: {assets_text}",
            })
        elif step_type == "deploy_target":
            logs.append({
                "level": "LIVE",
                "msg": f"[SIMULATION] Deploying infrastructure component '{target}' with strategy '{deployment.strategy}'...",
            })
            eng = deployment.engine.lower()
            is_chef = eng in ("chef", "hybrid", "both")
            is_salt = eng in ("salt", "hybrid", "both")

            if target == "nginx":
                if is_chef:
                    logs.append({
                        "level": "INFO",
                        "msg": "[SIMULATION] [Chef/Nginx] Template [/etc/nginx/sites-available/app_proxy.conf] rendered with upstream 127.0.0.1:8000.",
                    })
                if is_salt:
                    logs.append({
                        "level": "INFO",
                        "msg": "[SIMULATION] [Salt/Nginx] Service nginx reloaded via minion state. Zero-downtime worker reload successful.",
                    })
            elif target == "fastapi":
                if is_chef:
                    logs.append({
                        "level": "INFO",
                        "msg": "[SIMULATION] [Chef/App] Python virtualenv verified. Installing app dependencies via requirements.txt.",
                    })
                if is_salt:
                    logs.append({
                        "level": "INFO",
                        "msg": "[SIMULATION] [Salt/App] Systemd service [deployment-tools-api.service] active (running) on target minion.",
                    })
            elif target == "postgresql":
                if is_chef:
                    logs.append({
                        "level": "INFO",
                        "msg": "[SIMULATION] [Chef/Postgres] Recipe recipe[postgresql::default] converged. Connection pool healthy.",
                    })
                if is_salt:
                    logs.append({
                        "level": "INFO",
                        "msg": "[SIMULATION] [Salt/Postgres] PostgreSQL 15 database instance verified via state.sls postgresql.",
                    })
                    logs.append({
                        "level": "INFO",
                        "msg": "[SIMULATION] [Salt/Postgres] Executing database schema migrations... 100% applied.",
                    })
            elif target == "prometheus":
                if is_chef:
                    logs.append({
                        "level": "INFO",
                        "msg": "[SIMULATION] [Chef/Monitoring] Prometheus scrape targets configured for ports 8000, 9100.",
                    })
                if is_salt:
                    logs.append({
                        "level": "INFO",
                        "msg": "[SIMULATION] [Salt/Monitoring] Node exporter daemon started on target minions.",
                    })
            else:
                tool_prefix = "Chef" if eng == "chef" else ("Salt" if eng == "salt" else "Hybrid")
                logs.append({
                    "level": "INFO",
                    "msg": f"[SIMULATION] [{tool_prefix}] Target '{target}' configuration applied successfully.",
                })
        elif step_type == "health_check":
            logs.append({
                "level": "INFO",
                "msg": "[SIMULATION] Executing automated health checks across all target nodes...",
            })
            logs.append({
                "level": "INFO",
                "msg": "[SIMULATION] HTTP GET /health returned 200 OK (latency: 14ms).",
            })
        elif step_type == "verification":
            logs.append({
                "level": "INFO",
                "msg": "[SIMULATION] Final verification complete. Desired state matches cluster state.",
            })

        # Wait duration while respecting cancel_event
        intervals = max(1, int(duration / 0.05))
        for _ in range(intervals):
            if cancel_event.is_set():
                logs.append({"level": "WARNING", "msg": "[SIMULATION] Execution cancelled by operator."})
                return False, "Cancelled", logs
            await asyncio.sleep(0.05)

        return True, f"Step '{step.name}' converged successfully (Simulation Mode)", logs


class DeploymentExecutor:
    """Central Deployment Orchestration Executor."""

    def __init__(self):
        self.chef_service = ChefService()
        self.salt_service = SaltService()
        self.real_chef = RealChefExecutor(self.chef_service)
        self.real_salt = RealSaltExecutor(self.salt_service)
        self.simulation_executor = DevelopmentSimulationExecutor()

        self._active_tasks: Dict[int, asyncio.Task] = {}
        self._cancel_events: Dict[int, asyncio.Event] = {}

    def is_simulation_environment(self) -> bool:
        """Check if native Chef or Salt binaries exist in PATH."""
        chef_bin = shutil.which("chef-client") or shutil.which("knife")
        salt_bin = shutil.which("salt") or shutil.which("salt-call")
        return not bool(chef_bin or salt_bin)

    def is_running(self, deployment_id: int) -> bool:
        """Check if deployment is currently executing."""
        return deployment_id in self._active_tasks and not self._active_tasks[deployment_id].done()

    async def cancel(self, deployment_id: int) -> bool:
        """Cancel a running deployment immediately."""
        logger.info(f"Signalling cancellation for deployment #{deployment_id}")
        if deployment_id in self._cancel_events:
            self._cancel_events[deployment_id].set()

        # Update database status immediately with isolated session
        async with AsyncSessionLocal() as session:
            res = await session.execute(
                select(Deployment)
                .options(selectinload(Deployment.steps))
                .where(Deployment.id == deployment_id)
            )
            deployment = res.scalar_one_or_none()
            if deployment and deployment.status in ("PENDING", "VALIDATING", "QUEUED", "RUNNING"):
                deployment.status = "CANCELLED"
                deployment.completed_at = datetime.now(timezone.utc)
                deployment.error_message = "Deployment cancelled by user operator"

                # Mark incomplete steps as CANCELLED or SKIPPED
                for step in deployment.steps:
                    if step.status in ("PENDING", "RUNNING"):
                        step.status = "CANCELLED"
                        step.completed_at = datetime.now(timezone.utc)
                        step.message = "Cancelled during execution"

                # Add log entry
                log_entry = DeploymentLog(
                    deployment_id=deployment.id,
                    level="WARNING",
                    message="Deployment cancelled by operator request.",
                    created_at=datetime.now(timezone.utc),
                )
                session.add(log_entry)

                # Add audit entry
                audit = DeploymentAudit(
                    deployment_id=deployment.id,
                    username="admin",
                    action="cancelled",
                    details="Operator cancelled active deployment",
                    created_at=datetime.now(timezone.utc),
                )
                session.add(audit)

                await session.commit()

                # Broadcast event
                await broadcaster.broadcast({
                    "type": "deployment.cancelled",
                    "deployment_id": deployment.id,
                    "status": "CANCELLED",
                    "progress": deployment.progress,
                    "message": "Deployment cancelled",
                })
                return True
        return False

    async def ensure_stopped(self, deployment_id: int, timeout: float = 2.0) -> None:
        """Safely wait for any active background task to finish or cancel before deletion."""
        task = self._active_tasks.get(deployment_id)
        if task and not task.done():
            if deployment_id in self._cancel_events:
                self._cancel_events[deployment_id].set()
            try:
                await asyncio.wait_for(asyncio.shield(task), timeout=timeout)
            except (asyncio.TimeoutError, Exception):
                pass

    def start_execution(self, deployment_id: int) -> Optional[asyncio.Task]:
        """Launch background execution task for deployment with duplicate protection."""
        if self.is_running(deployment_id):
            logger.warning(f"Deployment #{deployment_id} is already executing. Ignoring duplicate start.")
            return self._active_tasks[deployment_id]

        cancel_event = asyncio.Event()
        self._cancel_events[deployment_id] = cancel_event

        task = asyncio.create_task(self._execute_deployment_worker(deployment_id, cancel_event))
        self._active_tasks[deployment_id] = task

        def _cleanup(t):
            self._active_tasks.pop(deployment_id, None)
            self._cancel_events.pop(deployment_id, None)

        task.add_done_callback(_cleanup)
        return task

    async def _execute_deployment_worker(self, deployment_id: int, cancel_event: asyncio.Event) -> None:
        """
        Internal worker executing deployment steps.
        Uses dedicated, short-lived AsyncSession instances for each state transition,
        ensuring NO database sessions are held open during external execution or sleeps.
        """
        logger.info(f"Starting execution worker for deployment #{deployment_id}")
        use_simulation = self.is_simulation_environment()

        # Step 1: Initial transition: QUEUED -> RUNNING
        async with AsyncSessionLocal() as session:
            res = await session.execute(
                select(Deployment)
                .options(selectinload(Deployment.steps), selectinload(Deployment.targets))
                .where(Deployment.id == deployment_id)
            )
            deployment = res.scalar_one_or_none()
            if not deployment:
                logger.error(f"Deployment #{deployment_id} not found for execution")
                return

            if deployment.status in ("CANCELLED", "FAILED", "SUCCEEDED"):
                logger.info(f"Deployment #{deployment_id} is in terminal state '{deployment.status}'. Aborting worker.")
                return

            if cancel_event.is_set():
                deployment.status = "CANCELLED"
                await session.commit()
                return

            deployment.status = "RUNNING"
            deployment.started_at = datetime.now(timezone.utc)
            deployment.progress = max(deployment.progress, 5)
            deployment.is_simulation = use_simulation

            # Audit record
            audit = DeploymentAudit(
                deployment_id=deployment.id,
                username="admin",
                action="started",
                details=f"Execution started with engine={deployment.engine}, simulation={use_simulation}",
                created_at=datetime.now(timezone.utc),
            )
            session.add(audit)

            # Initial log
            init_log = DeploymentLog(
                deployment_id=deployment.id,
                level="INFO",
                message=(
                    f"Deployment #{deployment.id} started. "
                    f"Environment: {deployment.environment.upper()}, Strategy: {deployment.strategy.upper()}. "
                    + ("[SIMULATION MODE: Native Chef/Salt binaries absent in container/host]" if use_simulation else "[REAL INFRASTRUCTURE MODE]")
                ),
                created_at=datetime.now(timezone.utc),
            )
            session.add(init_log)
            await session.commit()

            steps_meta = [
                {"id": s.id, "order": s.step_order, "name": s.name, "type": s.step_type, "target": s.target_name, "status": s.status}
                for s in sorted(deployment.steps, key=lambda s: s.step_order)
            ]
            engine = deployment.engine
            strategy = deployment.strategy
            environment = deployment.environment
            target_hosts = deployment.target_hosts
            chef_runlist = deployment.chef_runlist
            salt_states = deployment.salt_states

        await broadcaster.broadcast({
            "type": "deployment.updated",
            "deployment_id": deployment_id,
            "status": "RUNNING",
            "progress": 5,
            "step": "Starting execution",
            "message": "Deployment running",
            "is_simulation": use_simulation,
        })

        total_steps = len(steps_meta) or 1
        has_failed = False
        failed_message = None

        for idx, sm in enumerate(steps_meta):
            if cancel_event.is_set():
                logger.info(f"Deployment #{deployment_id} cancelled before step #{sm['id']}")
                break

            # If step was already SUCCEEDED during pre-flight validation phase, keep it
            if sm["type"] == "preflight" and sm["status"] == "SUCCEEDED":
                continue

            # Step start transition in dedicated session
            async with AsyncSessionLocal() as session:
                s_res = await session.execute(select(DeploymentStep).where(DeploymentStep.id == sm["id"]))
                step_obj = s_res.scalar_one_or_none()
                if not step_obj:
                    break

                step_obj.status = "RUNNING"
                step_obj.started_at = datetime.now(timezone.utc)
                step_obj.progress = 20

                # Update matching targets to DEPLOYING
                if sm["target"]:
                    t_res = await session.execute(
                        select(DeploymentTarget).where(DeploymentTarget.deployment_id == deployment_id)
                    )
                    for t in t_res.scalars().all():
                        if t.target_service == sm["target"] or sm["target"] == "all":
                            t.status = "DEPLOYING"
                            t.progress = 50
                            t.updated_at = datetime.now(timezone.utc)

                await session.commit()

            await broadcaster.broadcast({
                "type": "deployment.step.started",
                "deployment_id": deployment_id,
                "step_id": sm["id"],
                "step_name": sm["name"],
                "status": "RUNNING",
            })

            # Execute step outside of any DB session
            dummy_step = DeploymentStep(id=sm["id"], name=sm["name"], step_type=sm["type"], target_name=sm["target"])
            dummy_dep = Deployment(
                id=deployment_id,
                engine=engine,
                strategy=strategy,
                environment=environment,
                target_hosts=target_hosts,
                chef_runlist=chef_runlist,
                salt_states=salt_states,
            )

            if use_simulation:
                success, message, step_logs = await self.simulation_executor.execute_step(
                    dummy_step, dummy_dep, cancel_event
                )
            else:
                if engine == "chef":
                    success, message, step_logs = await self.real_chef.execute_step(
                        dummy_step, dummy_dep, cancel_event
                    )
                elif engine == "salt":
                    success, message, step_logs = await self.real_salt.execute_step(
                        dummy_step, dummy_dep, cancel_event
                    )
                else:
                    s1, m1, l1 = await self.real_chef.execute_step(dummy_step, dummy_dep, cancel_event)
                    if s1:
                        s2, m2, l2 = await self.real_salt.execute_step(dummy_step, dummy_dep, cancel_event)
                        success = s2
                        message = f"{m1}; {m2}"
                        step_logs = l1 + l2
                    else:
                        success = False
                        message = m1
                        step_logs = l1

            # Step completion transition in dedicated session
            async with AsyncSessionLocal() as session:
                # Check cancellation mid-step
                if cancel_event.is_set():
                    s_res = await session.execute(select(DeploymentStep).where(DeploymentStep.id == sm["id"]))
                    step_obj = s_res.scalar_one_or_none()
                    if step_obj:
                        step_obj.status = "CANCELLED"
                        step_obj.completed_at = datetime.now(timezone.utc)
                        step_obj.message = "Cancelled"
                        await session.commit()
                    break

                # Persist step logs
                for log_item in step_logs:
                    lvl = log_item.get("level", "INFO") if isinstance(log_item, dict) else "INFO"
                    msg = log_item.get("msg", str(log_item)) if isinstance(log_item, dict) else str(log_item)
                    session.add(DeploymentLog(
                        deployment_id=deployment_id,
                        step_id=sm["id"],
                        level=lvl,
                        message=msg,
                        created_at=datetime.now(timezone.utc),
                    ))
                    await broadcaster.broadcast({
                        "type": "deployment.log",
                        "deployment_id": deployment_id,
                        "step_id": sm["id"],
                        "level": lvl,
                        "message": msg,
                    })

                s_res = await session.execute(select(DeploymentStep).where(DeploymentStep.id == sm["id"]))
                step_obj = s_res.scalar_one_or_none()
                d_res = await session.execute(select(Deployment).where(Deployment.id == deployment_id))
                dep_obj = d_res.scalar_one_or_none()

                if not dep_obj or not step_obj:
                    break

                if not success:
                    step_obj.status = "FAILED"
                    step_obj.error = message
                    step_obj.completed_at = datetime.now(timezone.utc)
                    has_failed = True
                    failed_message = message

                    if sm["target"]:
                        t_res = await session.execute(
                            select(DeploymentTarget).where(DeploymentTarget.deployment_id == deployment_id)
                        )
                        for t in t_res.scalars().all():
                            if t.target_service == sm["target"]:
                                t.status = "FAILED"
                                t.updated_at = datetime.now(timezone.utc)

                    await session.commit()
                    await broadcaster.broadcast({
                        "type": "deployment.step.completed",
                        "deployment_id": deployment_id,
                        "step_id": sm["id"],
                        "status": "FAILED",
                        "error": message,
                    })
                    break

                # Step Succeeded
                step_obj.status = "SUCCEEDED"
                step_obj.progress = 100
                step_obj.completed_at = datetime.now(timezone.utc)
                step_obj.message = message

                if sm["target"]:
                    t_res = await session.execute(
                        select(DeploymentTarget).where(DeploymentTarget.deployment_id == deployment_id)
                    )
                    for t in t_res.scalars().all():
                        if t.target_service == sm["target"]:
                            t.status = "HEALTHY"
                            t.progress = 100
                            t.updated_at = datetime.now(timezone.utc)

                calc_progress = int(((idx + 1) / total_steps) * 100)
                dep_obj.progress = min(calc_progress, 98 if idx + 1 < total_steps else 100)
                current_dep_progress = dep_obj.progress
                await session.commit()

            await broadcaster.broadcast({
                "type": "deployment.step.completed",
                "deployment_id": deployment_id,
                "step_id": sm["id"],
                "status": "SUCCEEDED",
                "progress": current_dep_progress,
            })
            await broadcaster.broadcast({
                "type": "deployment.updated",
                "deployment_id": deployment_id,
                "status": "RUNNING",
                "progress": current_dep_progress,
                "step": sm["name"],
                "message": message,
            })

        # Final completion transition in dedicated session
        async with AsyncSessionLocal() as session:
            d_res = await session.execute(
                select(Deployment)
                .options(selectinload(Deployment.targets), selectinload(Deployment.steps))
                .where(Deployment.id == deployment_id)
            )
            final_dep = d_res.scalar_one_or_none()
            if not final_dep:
                return

            if cancel_event.is_set():
                final_dep.status = "CANCELLED"
                final_dep.completed_at = datetime.now(timezone.utc)
                final_dep.error_message = "Deployment cancelled by operator"
                for st in final_dep.steps:
                    if st.status in ("PENDING", "RUNNING"):
                        st.status = "CANCELLED"
                        st.completed_at = datetime.now(timezone.utc)
                await session.commit()
                await broadcaster.broadcast({
                    "type": "deployment.cancelled",
                    "deployment_id": deployment_id,
                    "status": "CANCELLED",
                    "progress": final_dep.progress,
                })
            elif has_failed:
                final_dep.status = "FAILED"
                final_dep.error_message = failed_message or "One or more deployment steps failed"
                final_dep.completed_at = datetime.now(timezone.utc)
                await session.commit()
                await broadcaster.broadcast({
                    "type": "deployment.failed",
                    "deployment_id": deployment_id,
                    "status": "FAILED",
                    "progress": final_dep.progress,
                    "error": final_dep.error_message,
                })
            else:
                final_dep.status = "SUCCEEDED"
                final_dep.progress = 100
                final_dep.completed_at = datetime.now(timezone.utc)
                for t in final_dep.targets:
                    t.status = "HEALTHY"
                    t.progress = 100
                    t.updated_at = datetime.now(timezone.utc)

                session.add(DeploymentLog(
                    deployment_id=deployment_id,
                    level="INFO",
                    message="All workflow steps converged successfully. Deployment complete.",
                    created_at=datetime.now(timezone.utc),
                ))
                session.add(DeploymentAudit(
                    deployment_id=deployment_id,
                    username="admin",
                    action="succeeded",
                    details="All infrastructure workflow steps completed successfully",
                    created_at=datetime.now(timezone.utc),
                ))
                await session.commit()
                await broadcaster.broadcast({
                    "type": "deployment.succeeded",
                    "deployment_id": deployment_id,
                    "status": "SUCCEEDED",
                    "progress": 100,
                    "message": "Deployment completed successfully",
                })


deployment_executor = DeploymentExecutor()
