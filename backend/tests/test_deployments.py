"""
Integration and Unit Tests for Deployment Lifecycle API.
Tests: Create, List, Get, Cancel, Retry, Delete, Steps, Logs, and Validation.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.core.database import async_session, init_db
from app.core.security import create_access_token
from app.models.user import User
from app.models.deployment import Deployment, DeploymentStep, DeploymentTarget




@pytest_asyncio.fixture
async def auth_headers():
    """Generate admin authentication bearer token headers."""
    token = create_access_token(data={"sub": "admin", "role": "admin"})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_deployment_success(auth_headers):
    """Test creating a valid deployment with full targets, nodes, and strategy."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "name": "Integration Test Deployment",
            "environment": "production",
            "engine": "hybrid",
            "targets": ["nginx", "fastapi", "postgresql", "prometheus"],
            "nodes": ["prod-web-01", "prod-app-01", "prod-db-01", "prod-mon-01"],
            "strategy": "rolling",
            "auto_confirm": False,  # Keep in PENDING for inspection
        }
        res = await client.post("/api/deployments/", json=payload, headers=auth_headers)
        assert res.status_code == 201, f"Failed: {res.text}"
        data = res.json()
        assert data["name"] == "Integration Test Deployment"
        assert data["environment"] == "production"
        assert data["engine"] == "hybrid"
        assert data["strategy"] == "rolling"
        assert data["status"] == "PENDING"
        assert len(data["steps"]) >= 5
        assert len(data["targets"]) == 16  # 4 nodes x 4 targets
        dep_id = data["id"]

        # Verify get deployment
        get_res = await client.get(f"/api/deployments/{dep_id}", headers=auth_headers)
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["id"] == dep_id
        assert len(get_data["steps"]) >= 5

        # Verify steps endpoint
        steps_res = await client.get(f"/api/deployments/{dep_id}/steps", headers=auth_headers)
        assert steps_res.status_code == 200
        steps = steps_res.json()
        assert len(steps) >= 5
        assert steps[0]["name"] == "Pre-flight validation & cluster connectivity"

        # Verify logs endpoint
        logs_res = await client.get(f"/api/deployments/{dep_id}/logs", headers=auth_headers)
        assert logs_res.status_code == 200
        logs = logs_res.json()
        assert len(logs) >= 1

        # Delete the test deployment
        del_res = await client.delete(f"/api/deployments/{dep_id}", headers=auth_headers)
        assert del_res.status_code == 200


@pytest.mark.asyncio
async def test_create_deployment_validation_failures(auth_headers):
    """Test validation errors for invalid environments, missing targets, etc."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Invalid environment
        res1 = await client.post(
            "/api/deployments/",
            json={"name": "Bad Env", "environment": "invalid_env", "targets": ["nginx"], "nodes": ["web-01"]},
            headers=auth_headers,
        )
        assert res1.status_code == 400
        assert "Invalid environment" in res1.json()["detail"]

        # Missing targets
        res2 = await client.post(
            "/api/deployments/",
            json={"name": "No Targets", "environment": "production", "targets": [], "nodes": ["web-01"]},
            headers=auth_headers,
        )
        assert res2.status_code == 400


@pytest.mark.asyncio
async def test_cancel_and_retry_flow(auth_headers):
    """Test cancelling and retrying a deployment."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "name": "Cancel Flow Test",
            "environment": "staging",
            "engine": "chef",
            "targets": ["nginx"],
            "nodes": ["prod-web-01"],
            "strategy": "canary",
            "auto_confirm": False,
        }
        res = await client.post("/api/deployments/", json=payload, headers=auth_headers)
        assert res.status_code == 201
        dep_id = res.json()["id"]

        # Cancel
        cancel_res = await client.post(f"/api/deployments/{dep_id}/cancel", headers=auth_headers)
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "CANCELLED"

        # Retry
        retry_res = await client.post(f"/api/deployments/{dep_id}/retry", headers=auth_headers)
        assert retry_res.status_code == 200
        assert retry_res.json()["status"] in ("QUEUED", "RUNNING", "SUCCEEDED")

        # Cleanup
        # Wait or cancel before delete if running
        await client.post(f"/api/deployments/{dep_id}/cancel", headers=auth_headers)
        await client.delete(f"/api/deployments/{dep_id}", headers=auth_headers)


@pytest.mark.asyncio
async def test_list_deployments_filters(auth_headers):
    """Test filtering deployments by status and environment."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/deployments/?environment=production", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "deployments" in data
        assert "total" in data
