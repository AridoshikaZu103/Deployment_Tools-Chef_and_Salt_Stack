"""
Configuration management endpoints — browse/validate Chef cookbooks & Salt states.
"""

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.security import get_current_user
from app.models.user import User
from app.services.chef_service import ChefService
from app.services.salt_service import SaltService

settings = get_settings()
router = APIRouter(prefix="/configs", tags=["Configuration"])

chef_service = ChefService()
salt_service = SaltService()


# ── Schemas ──────────────────────────────────────────────


class ToolStatus(BaseModel):
    chef_available: bool
    salt_available: bool
    chef_cookbooks_count: int
    salt_states_count: int


class CookbookInfo(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    description: Optional[str] = None
    path: str
    recipes: list[str] = []


class ValidationResult(BaseModel):
    valid: bool
    errors: list[str]


# ── Endpoints ────────────────────────────────────────────


@router.get("/status", response_model=ToolStatus)
async def get_tool_status(current_user: User = Depends(get_current_user)):
    """Check availability of Chef and Salt Stack tools."""
    cookbooks = chef_service.list_cookbooks()
    states = salt_service.list_states()
    return ToolStatus(
        chef_available=chef_service.is_available(),
        salt_available=salt_service.is_available(),
        chef_cookbooks_count=len(cookbooks),
        salt_states_count=len(states),
    )


@router.get("/chef/cookbooks", response_model=list[CookbookInfo])
async def list_cookbooks(current_user: User = Depends(get_current_user)):
    """List all available Chef cookbooks with their recipes."""
    cookbooks = chef_service.list_cookbooks()
    result = []
    for cb in cookbooks:
        name = cb.get("name", "unknown")
        recipes = chef_service.get_cookbook_recipes(name)
        result.append(CookbookInfo(
            name=name,
            version=cb.get("version"),
            description=cb.get("description"),
            path=cb.get("path", ""),
            recipes=recipes,
        ))
    return result


@router.post("/chef/cookbooks/{cookbook_name}/validate", response_model=ValidationResult)
async def validate_cookbook(
    cookbook_name: str,
    current_user: User = Depends(get_current_user),
):
    """Validate a Chef cookbook's syntax."""
    result = await chef_service.validate_cookbook(cookbook_name)
    return ValidationResult(**result)


@router.get("/salt/states")
async def list_salt_states(current_user: User = Depends(get_current_user)):
    """List all available Salt state files."""
    return salt_service.list_states()


@router.get("/salt/pillars")
async def list_salt_pillars(current_user: User = Depends(get_current_user)):
    """List all Salt Pillar data files."""
    return salt_service.list_pillars()


@router.post("/salt/states/{state_id}/validate", response_model=ValidationResult)
async def validate_salt_state(
    state_id: str,
    current_user: User = Depends(get_current_user),
):
    """Validate a Salt state file's YAML syntax."""
    # Convert dotted state ID back to file path
    states = salt_service.list_states()
    state = next((s for s in states if s["id"] == state_id), None)
    if not state:
        raise HTTPException(status_code=404, detail=f"State '{state_id}' not found")

    result = salt_service.validate_state_file(state["path"])
    return ValidationResult(**result)


DEFAULT_RECIPES = {
    "app_server": """# Cookbook:: app_server\n# Recipe:: default\npackage ['python3', 'python3-venv', 'python3-pip', 'git'] do\n  action :install\nend\n\nservice 'deployment-tools' do\n  action [:enable, :start]\nend""",
    "monitoring": """# Cookbook:: monitoring\n# Recipe:: default\npackage 'prometheus-node-exporter' do\n  action :install\nend\n\nservice 'prometheus-node-exporter' do\n  action [:enable, :start]\nend""",
    "nginx": """# Cookbook:: nginx\n# Recipe:: default\npackage 'nginx' do\n  action :install\nend\n\nservice 'nginx' do\n  action [:enable, :start]\nend""",
    "postgresql": """# Cookbook:: postgresql\n# Recipe:: default\npackage ['postgresql-15', 'postgresql-contrib'] do\n  action :install\nend\n\nservice 'postgresql' do\n  action [:enable, :start]\nend""",
}

DEFAULT_STATES = {
    "top": "# SaltStack Top File\nbase:\n  '*':\n    - common",
    "common": "# Salt Common State\ncommon_pkgs:\n  pkg.installed:\n    - pkgs: [curl, wget, git, htop]",
    "nginx": "# Salt Nginx State\nnginx_pkg:\n  pkg.installed:\n    - name: nginx\nservice:\n  service.running:\n    - name: nginx",
    "app_server": "# Salt App Server State\napp_pkg:\n  pkg.installed:\n    - pkgs: [python3, python3-venv]\napp_svc:\n  service.running:\n    - name: deployment-tools",
    "postgresql": "# Salt PostgreSQL State\npg_pkg:\n  pkg.installed:\n    - name: postgresql-15\npg_svc:\n  service.running:\n    - name: postgresql",
    "monitoring": "# Salt Monitoring State\nmon_pkg:\n  pkg.installed:\n    - name: prometheus-node-exporter\nmon_svc:\n  service.running:\n    - name: prometheus-node-exporter",
}


@router.get("/chef/cookbooks/{cookbook_name}/content")
async def get_cookbook_content(
    cookbook_name: str,
    recipe: str = "default",
    current_user: User = Depends(get_current_user),
):
    """Retrieve raw Ruby code for a recipe."""
    candidate_paths = [
        Path(settings.chef_repo_path) / "cookbooks" / cookbook_name / "recipes" / f"{recipe}.rb",
        Path.cwd() / "chef" / "cookbooks" / cookbook_name / "recipes" / f"{recipe}.rb",
        Path(__file__).resolve().parents[3] / "chef" / "cookbooks" / cookbook_name / "recipes" / f"{recipe}.rb",
    ]
    file_path = next((p for p in candidate_paths if p.exists()), None)
    if not file_path:
        content = DEFAULT_RECIPES.get(cookbook_name, f"# Cookbook: {cookbook_name}\n# Recipe: {recipe}\npackage '{cookbook_name}'")
        return {
            "filename": f"{cookbook_name}/recipes/{recipe}.rb",
            "path": f"chef/cookbooks/{cookbook_name}/recipes/{recipe}.rb",
            "language": "ruby",
            "content": content,
            "size_bytes": len(content.encode("utf-8")),
        }

    content = file_path.read_text(encoding="utf-8")
    return {
        "filename": file_path.name,
        "path": str(file_path).replace("\\", "/"),
        "language": "ruby",
        "content": content,
        "size_bytes": len(content.encode("utf-8")),
    }


@router.get("/salt/states/{state_id}/content")
async def get_salt_state_content(
    state_id: str,
    current_user: User = Depends(get_current_user),
):
    """Retrieve raw YAML code for a Salt state."""
    states = salt_service.list_states()
    state = next((s for s in states if s["id"] == state_id), None)
    state_path = state["path"] if state else f"salt/states/{state_id}.sls"
    candidate_paths = [
        Path(state_path),
        Path(settings.salt_repo_path) / "states" / f"{state_id}.sls",
        Path.cwd() / "salt" / "states" / f"{state_id}.sls",
        Path(__file__).resolve().parents[3] / "salt" / "states" / f"{state_id}.sls",
    ]
    file_path = next((p for p in candidate_paths if p.exists()), None)
    if not file_path:
        content = DEFAULT_STATES.get(state_id, f"# Salt State: {state_id}\nstate_pkg:\n  pkg.installed:\n    - name: {state_id}")
        return {
            "filename": f"{state_id}.sls",
            "path": f"salt/states/{state_id}.sls",
            "language": "yaml",
            "content": content,
            "size_bytes": len(content.encode("utf-8")),
        }

    content = file_path.read_text(encoding="utf-8")
    return {
        "filename": file_path.name,
        "path": str(file_path).replace("\\", "/"),
        "language": "yaml",
        "content": content,
        "size_bytes": len(content.encode("utf-8")),
    }

