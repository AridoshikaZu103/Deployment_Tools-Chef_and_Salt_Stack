"""
Chef orchestration service.
Wraps chef-client / knife commands for deployment execution.
"""

import asyncio
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from loguru import logger

from app.core.config import get_settings

settings = get_settings()


class ChefService:
    """Orchestrates Chef cookbook runs and node management."""

    def __init__(self):
        self.chef_binary = settings.chef_binary
        self.repo_path = Path(settings.chef_repo_path)
        self.knife_config = settings.knife_config_path

    # ── Discovery ────────────────────────────────────────

    def list_cookbooks(self) -> list[dict]:
        """List all available cookbooks from the local repo."""
        cookbooks_dir = self.repo_path / "cookbooks"
        if not cookbooks_dir.exists():
            return []

        result = []
        for cookbook in cookbooks_dir.iterdir():
            if cookbook.is_dir() and (cookbook / "metadata.rb").exists():
                metadata = self._parse_metadata(cookbook / "metadata.rb")
                result.append(metadata)
        return result

    def get_cookbook_recipes(self, cookbook_name: str) -> list[str]:
        """Return recipe names for a given cookbook."""
        recipes_dir = self.repo_path / "cookbooks" / cookbook_name / "recipes"
        if not recipes_dir.exists():
            return []
        return [
            f.stem for f in recipes_dir.glob("*.rb") if f.is_file()
        ]

    # ── Execution ────────────────────────────────────────

    async def run_chef_client(
        self,
        runlist: list[str],
        environment: str = "development",
        target_host: Optional[str] = None,
        dry_run: bool = False,
    ) -> dict:
        """
        Execute chef-client with the given run list.

        Args:
            runlist: List of recipes, e.g. ["recipe[nginx::default]"]
            environment: Chef environment name
            target_host: SSH target (user@host), None = local
            dry_run: If True, run in why-run mode

        Returns:
            dict with status, stdout, stderr, duration
        """
        cmd = [self.chef_binary, "--once", "--no-color"]

        # Run list
        cmd.extend(["--runlist", ",".join(runlist)])

        # Environment
        cmd.extend(["--environment", environment])

        # Why-run mode (dry run)
        if dry_run:
            cmd.append("--why-run")

        # Knife config
        if self.knife_config:
            cmd.extend(["--config", self.knife_config])

        # Remote execution via SSH
        if target_host:
            cmd = ["ssh", target_host] + cmd

        logger.info(f"Executing Chef: {' '.join(cmd)}")
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

            return {
                "status": "success" if process.returncode == 0 else "failed",
                "return_code": process.returncode,
                "stdout": stdout.decode("utf-8", errors="replace"),
                "stderr": stderr.decode("utf-8", errors="replace"),
                "duration_seconds": duration,
                "command": " ".join(cmd),
            }
        except FileNotFoundError:
            logger.error(f"Chef binary not found: {self.chef_binary}")
            return {
                "status": "failed",
                "return_code": -1,
                "stdout": "",
                "stderr": f"Chef binary not found at: {self.chef_binary}",
                "duration_seconds": 0,
                "command": " ".join(cmd),
            }
        except Exception as e:
            logger.exception("Chef execution failed")
            return {
                "status": "failed",
                "return_code": -1,
                "stdout": "",
                "stderr": str(e),
                "duration_seconds": (datetime.now(timezone.utc) - start_time).total_seconds(),
                "command": " ".join(cmd),
            }

    # ── Validation ───────────────────────────────────────

    async def validate_cookbook(self, cookbook_name: str) -> dict:
        """Run cookbook syntax and lint checks."""
        cookbook_path = self.repo_path / "cookbooks" / cookbook_name

        if not cookbook_path.exists():
            return {"valid": False, "errors": [f"Cookbook '{cookbook_name}' not found"]}

        errors = []

        # Check metadata.rb exists
        if not (cookbook_path / "metadata.rb").exists():
            errors.append("Missing metadata.rb")

        # Check recipe syntax
        for recipe in cookbook_path.glob("recipes/*.rb"):
            result = await self._check_ruby_syntax(recipe)
            if not result["valid"]:
                errors.append(f"{recipe.name}: {result['error']}")

        return {"valid": len(errors) == 0, "errors": errors}

    # ── Health Check ─────────────────────────────────────

    def is_available(self) -> bool:
        """Check if Chef tools are installed and accessible."""
        return shutil.which(self.chef_binary) is not None

    # ── Private Helpers ──────────────────────────────────

    def _parse_metadata(self, metadata_path: Path) -> dict:
        """Extract name, version, description from metadata.rb."""
        info = {"path": str(metadata_path.parent)}
        try:
            content = metadata_path.read_text(encoding="utf-8")
            for line in content.splitlines():
                line = line.strip()
                for field in ("name", "version", "description"):
                    if line.startswith(field):
                        # Parse: name 'my_cookbook'
                        value = line.split(None, 1)[1].strip("'\"")
                        info[field] = value
        except Exception as e:
            logger.warning(f"Failed to parse {metadata_path}: {e}")
        return info

    async def _check_ruby_syntax(self, filepath: Path) -> dict:
        """Run `ruby -c` syntax check on a Ruby file."""
        ruby = shutil.which("ruby")
        if not ruby:
            return {"valid": True, "error": "ruby not found, skipping syntax check"}

        try:
            process = await asyncio.create_subprocess_exec(
                ruby, "-c", str(filepath),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await process.communicate()
            return {
                "valid": process.returncode == 0,
                "error": stderr.decode("utf-8", errors="replace").strip(),
            }
        except Exception as e:
            return {"valid": False, "error": str(e)}
