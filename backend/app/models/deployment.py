"""
Deployment model — tracks every deployment job and its lifecycle.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Deployment(Base):
    """A single deployment job targeting one or more servers."""

    __tablename__ = "deployments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # ── What is being deployed ───────────────────────────
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    environment: Mapped[str] = mapped_column(String(20))  # dev | staging | production
    tool: Mapped[str] = mapped_column(String(20))  # chef | salt | both

    # ── Target info ──────────────────────────────────────
    target_hosts: Mapped[str] = mapped_column(Text, default="*")  # comma-separated or glob

    # ── Chef-specific ────────────────────────────────────
    chef_runlist: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    chef_environment: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # ── Salt-specific ────────────────────────────────────
    salt_states: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    salt_pillar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Status tracking ──────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending | running | success | failed | cancelled
    progress: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    log_output: Mapped[str] = mapped_column(Text, default="")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Audit ────────────────────────────────────────────
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # ── Relationships ────────────────────────────────────
    creator = relationship("User", backref="deployments", lazy="selectin")
