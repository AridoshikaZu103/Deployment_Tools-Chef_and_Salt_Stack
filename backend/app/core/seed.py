"""
Database seeder for initializing default admin user, managed servers, and sample deployments.
"""

from datetime import datetime, timezone
from sqlalchemy import select
from loguru import logger

from app.core.database import async_session
from app.core.security import hash_password
from app.models.user import User
from app.models.server import Server
from app.models.deployment import Deployment


async def seed_initial_data():
    """Seeds the database with essential seed records if not already present."""
    async with async_session() as session:
        try:
            # 1. Check/create default admin user
            result = await session.execute(select(User).where(User.username == "admin"))
            admin_user = result.scalar_one_or_none()

            if not admin_user:
                admin_user = User(
                    username="admin",
                    email="admin@deploymenttools.local",
                    hashed_password=hash_password("admin123"),
                    full_name="Platform Admin",
                    role="admin",
                    is_active=True,
                )
                session.add(admin_user)
                await session.flush()
                logger.info("Created default administrator user: admin / admin123")

            # 2. Check/create default servers
            server_res = await session.execute(select(Server))
            existing_servers = server_res.scalars().all()

            if not existing_servers:
                initial_servers = [
                    Server(
                        hostname="prod-web-01",
                        ip_address="192.168.10.11",
                        fqdn="web01.production.internal",
                        environment="production",
                        role="webserver",
                        os_family="Ubuntu 22.04 LTS",
                        managed_by="chef",
                        health_status="healthy",
                        last_health_check=datetime.now(timezone.utc),
                        chef_node_name="prod-web-01.node",
                    ),
                    Server(
                        hostname="prod-app-01",
                        ip_address="192.168.10.21",
                        fqdn="app01.production.internal",
                        environment="production",
                        role="appserver",
                        os_family="Ubuntu 22.04 LTS",
                        managed_by="both",
                        health_status="healthy",
                        last_health_check=datetime.now(timezone.utc),
                        chef_node_name="prod-app-01.node",
                        salt_minion_id="minion-prod-app-01",
                    ),
                    Server(
                        hostname="prod-db-01",
                        ip_address="192.168.10.31",
                        fqdn="db01.production.internal",
                        environment="production",
                        role="database",
                        os_family="Debian 12",
                        managed_by="salt",
                        health_status="healthy",
                        last_health_check=datetime.now(timezone.utc),
                        salt_minion_id="minion-prod-db-01",
                    ),
                    Server(
                        hostname="prod-mon-01",
                        ip_address="192.168.10.41",
                        fqdn="mon01.production.internal",
                        environment="production",
                        role="monitoring",
                        os_family="Ubuntu 22.04 LTS",
                        managed_by="salt",
                        health_status="healthy",
                        last_health_check=datetime.now(timezone.utc),
                        salt_minion_id="minion-prod-mon-01",
                    ),
                    Server(
                        hostname="stg-app-01",
                        ip_address="192.168.20.21",
                        fqdn="app01.staging.internal",
                        environment="staging",
                        role="appserver",
                        os_family="Ubuntu 22.04 LTS",
                        managed_by="both",
                        health_status="degraded",
                        last_health_check=datetime.now(timezone.utc),
                        chef_node_name="stg-app-01.node",
                        salt_minion_id="minion-stg-app-01",
                    ),
                    Server(
                        hostname="dev-all-in-one",
                        ip_address="127.0.0.1",
                        fqdn="dev-box.local",
                        environment="development",
                        role="appserver",
                        os_family="Debian 12 / Docker",
                        managed_by="both",
                        health_status="healthy",
                        last_health_check=datetime.now(timezone.utc),
                        chef_node_name="local-dev.node",
                        salt_minion_id="local-dev-minion",
                    ),
                ]
                session.add_all(initial_servers)
                await session.flush()
                logger.info(f"Seeded {len(initial_servers)} managed servers into inventory")

            # 3. Check/create default deployments
            dep_res = await session.execute(select(Deployment))
            existing_deps = dep_res.scalars().all()

            if not existing_deps and admin_user:
                from datetime import timedelta
                now = datetime.now(timezone.utc)
                initial_deployments = [
                    Deployment(
                        name="Deploy Full Production Stack",
                        description="Orchestrate Nginx reverse proxy + FastAPI cluster + PostgreSQL + Prometheus",
                        environment="production",
                        tool="both",
                        target_hosts="web-01, app-01, app-02, db-01, mon-01",
                        status="success",
                        progress=100,
                        chef_runlist="recipe[nginx::default], recipe[app_server::default]",
                        salt_states="common, postgresql, monitoring",
                        created_by=admin_user.id,
                        created_at=now - timedelta(minutes=18, seconds=36),
                        started_at=now - timedelta(minutes=18, seconds=24),
                        completed_at=now - timedelta(minutes=15),
                        log_output=(
                            "[Chef Client] Starting run...\n"
                            "[Chef] Converging recipe[nginx::default]\n"
                            "[Chef] Converging recipe[app_server::default]\n"
                            "[Salt Stack] Applying state.highstate on targets\n"
                            "✓ Stack converged successfully across 5 nodes."
                        ),
                    ),
                    Deployment(
                        name="Rollout Nginx Security & TLS Patch",
                        description="Update Nginx configuration and reload workers without downtime",
                        environment="staging",
                        tool="chef",
                        target_hosts="staging-web-01",
                        status="running",
                        progress=68,
                        chef_runlist="recipe[nginx::default]",
                        created_by=admin_user.id,
                        created_at=now - timedelta(minutes=1, seconds=45),
                        started_at=now - timedelta(minutes=1, seconds=35),
                        completed_at=None,
                        log_output="[Chef Client] Reloading service[nginx] with new security cipher suites...",
                    ),
                ]
                session.add_all(initial_deployments)
                await session.flush()
                logger.info(f"Seeded {len(initial_deployments)} initial deployment jobs")

            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Error during initial seed: {e}")
