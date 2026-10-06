"""
Salt Stack orchestration service.
Wraps salt / salt-call commands for state application and minion management.
"""

import asyncio
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import yaml
from loguru import logger

from app.core.config import get_settings

settings = get_settings()


class SaltService:
    """Orchestrates Salt Stack state runs and minion queries."""

    def __init__(self):
        self.salt_binary = settings.salt_binary
        self.repo_path = Path(settings.salt_repo_path)
        self.master_config = settings.salt_master_config

    # ── Discovery ────────────────────────────────────────

    def list_states(self) -> list[dict]:
        """List all Salt state files from the local repo with cloud fallbacks."""
        candidates = [
            self.repo_path / "states",
            Path.cwd() / "salt" / "states",
            Path(__file__).resolve().parents[2] / "salt" / "states",
            Path(__file__).resolve().parents[3] / "salt" / "states",
        ]
        states_dir = next((d for d in candidates if d.exists()), None)
        default_states = [
            {"id": "top", "path": "salt/states/top.sls", "size_bytes": 592},
            {"id": "common", "path": "salt/states/common.sls", "size_bytes": 2183},
            {"id": "nginx", "path": "salt/states/nginx.sls", "size_bytes": 2702},
            {"id": "app_server", "path": "salt/states/app_server.sls", "size_bytes": 3439},
            {"id": "postgresql", "path": "salt/states/postgresql.sls", "size_bytes": 3526},
            {"id": "monitoring", "path": "salt/states/monitoring.sls", "size_bytes": 4683},
        ]
        if not states_dir:
            return default_states

        result = []
        for sls_file in states_dir.rglob("*.sls"):
            relative = sls_file.relative_to(states_dir)
            # Convert path to dotted Salt state ID
            state_id = str(relative.with_suffix("")).replace("\\", ".").replace("/", ".")
            if state_id.endswith(".init"):
                state_id = state_id[:-5]  # Remove .init suffix
            result.append({
                "id": state_id,
                "path": str(sls_file),
                "size_bytes": sls_file.stat().st_size,
            })
        return result or default_states

    def list_pillars(self) -> list[dict]:
        """List all Pillar data files."""
        pillar_dir = self.repo_path / "pillar"
        if not pillar_dir.exists():
            return []

        result = []
        for sls_file in pillar_dir.rglob("*.sls"):
            relative = sls_file.relative_to(pillar_dir)
            result.append({
                "id": str(relative.with_suffix("")).replace("\\", ".").replace("/", "."),
                "path": str(sls_file),
            })
        return result

    # ── Execution ────────────────────────────────────────

    async def apply_states(
        self,
        target: str = "*",
        states: Optional[list[str]] = None,
        pillar: Optional[dict] = None,
        environment: str = "base",
        dry_run: bool = False,
    ) -> dict:
        """
        Apply Salt states to target minions.

        Args:
            target: Minion targeting expression (glob, grain, compound)
            states: Specific state names, or None for highstate
            pillar: Optional pillar data override
            environment: Salt environment (base, dev, staging, prod)
            dry_run: If True, run in test=True mode

        Returns:
            dict with status, stdout, stderr, duration
        """
        cmd = [self.salt_binary, target, "--out=json", "--no-color"]

        if states:
            cmd.extend(["state.apply", ",".join(states)])
        else:
            cmd.append("state.highstate")

        # Salt environment
        cmd.extend(["saltenv=" + environment])

        # Pillar override
        if pillar:
            cmd.extend(["pillar=" + json.dumps(pillar)])

        # Test mode (dry run)
        if dry_run:
            cmd.append("test=True")

        logger.info(f"Executing Salt: {' '.join(cmd)}")
        start_time = datetime.now(timezone.utc)

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.repo_path),
            )
            stdout, stderr = await process.communicate()
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()

            # Parse JSON output
            output_text = stdout.decode("utf-8", errors="replace")
            try:
                parsed_output = json.loads(output_text)
            except json.JSONDecodeError:
                parsed_output = None

            return {
                "status": "success" if process.returncode == 0 else "failed",
                "return_code": process.returncode,
                "stdout": output_text,
                "stderr": stderr.decode("utf-8", errors="replace"),
                "parsed_output": parsed_output,
                "duration_seconds": duration,
                "command": " ".join(cmd),
            }
        except FileNotFoundError:
            logger.error(f"Salt binary not found: {self.salt_binary}")
            return {
                "status": "failed",
                "return_code": -1,
                "stdout": "",
                "stderr": f"Salt binary not found at: {self.salt_binary}",
                "parsed_output": None,
                "duration_seconds": 0,
                "command": " ".join(cmd),
            }
        except Exception as e:
            logger.exception("Salt execution failed")
            return {
                "status": "failed",
                "return_code": -1,
                "stdout": "",
                "stderr": str(e),
                "parsed_output": None,
                "duration_seconds": (datetime.now(timezone.utc) - start_time).total_seconds(),
                "command": " ".join(cmd),
            }

    # ── Minion Management ────────────────────────────────

    async def list_minions(self) -> dict:
        """Query Salt master for connected minions."""
        cmd = [self.salt_binary, "*", "test.ping", "--out=json", "--no-color"]
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await process.communicate()
            output = json.loads(stdout.decode("utf-8", errors="replace"))
            return {"minions": output, "count": len(output)}
        except Exception as e:
            logger.warning(f"Failed to list minions: {e}")
            return {"minions": {}, "count": 0, "error": str(e)}

    async def get_minion_grains(self, minion_id: str) -> dict:
        """Retrieve grains (system facts) for a specific minion."""
        cmd = [
            self.salt_binary, minion_id, "grains.items",
            "--out=json", "--no-color",
        ]
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await process.communicate()
            return json.loads(stdout.decode("utf-8", errors="replace"))
        except Exception as e:
            logger.warning(f"Failed to get grains for {minion_id}: {e}")
            return {"error": str(e)}

    # ── Validation ───────────────────────────────────────

    def validate_state_file(self, state_path: str) -> dict:
        """Validate YAML syntax of a state file."""
        path = Path(state_path)
        if not path.exists():
            return {"valid": False, "errors": [f"File not found: {state_path}"]}

        try:
            content = path.read_text(encoding="utf-8")
            parsed = yaml.safe_load(content)
            if not isinstance(parsed, dict):
                return {"valid": False, "errors": ["State file must be a YAML mapping"]}
            return {"valid": True, "errors": [], "state_ids": list(parsed.keys())}
        except yaml.YAMLError as e:
            return {"valid": False, "errors": [str(e)]}

    # ── Health Check ─────────────────────────────────────

    def is_available(self) -> bool:
        """Check if Salt tools are installed and accessible."""
        return shutil.which(self.salt_binary) is not None
