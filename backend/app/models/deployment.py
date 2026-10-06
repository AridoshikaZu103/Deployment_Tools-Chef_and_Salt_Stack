"""
Deployment model — tracks every deployment job, its workflow steps, target nodes, logs, and audits.
"""

from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Deployment(Base):
    """A single deployment job targeting one or more servers."""

    __tablename__ = "deployments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # ── What is being deployed ───────────────────────────
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    environment: Mapped[str] = mapped_column(String(20), default="development")  # development | staging | production
    engine: Mapped[str] = mapped_column(String(20), default="hybrid")  # chef | salt | hybrid
    tool: Mapped[str] = mapped_column(String(20), default="both")  # backward compatibility alias: chef | salt | both
    strategy: Mapped[str] = mapped_column(String(20), default="rolling")  # rolling | all-at-once | canary

    # ── Target info ──────────────────────────────────────
    target_hosts: Mapped[str] = mapped_column(Text, default="*")  # comma-separated or glob

    # ── Chef-specific ────────────────────────────────────
    chef_runlist: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    chef_environment: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # ── Salt-specific ────────────────────────────────────
    salt_states: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    salt_pillar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Status tracking ──────────────────────────────────
    # Allowed: DRAFT | PENDING | VALIDATING | QUEUED | RUNNING | PAUSED | SUCCEEDED | FAILED | CANCELLED
    status: Mapped[str] = mapped_column(String(30), default="PENDING")
    progress: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    is_simulation: Mapped[bool] = mapped_column(Boolean, default=False)  # Explicit simulation tracking
    log_output: Mapped[str] = mapped_column(Text, default="")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Audit & Timestamps ───────────────────────────────
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
    steps: Mapped[List["DeploymentStep"]] = relationship(
        "DeploymentStep",
        back_populates="deployment",
        cascade="all, delete-orphan",
        order_by="DeploymentStep.step_order",
        lazy="selectin",
    )
    targets: Mapped[List["DeploymentTarget"]] = relationship(
        "DeploymentTarget",
        back_populates="deployment",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    logs: Mapped[List["DeploymentLog"]] = relationship(
        "DeploymentLog",
        back_populates="deployment",
        cascade="all, delete-orphan",
        order_by="DeploymentLog.id",
        lazy="selectin",
    )
    audits: Mapped[List["DeploymentAudit"]] = relationship(
        "DeploymentAudit",
        back_populates="deployment",
        cascade="all, delete-orphan",
        order_by="DeploymentAudit.id",
        lazy="selectin",
    )


class DeploymentStep(Base):
    """A granular, trackable workflow step in a deployment pipeline."""

    __tablename__ = "deployment_steps"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    deployment_id: Mapped[int] = mapped_column(
        ForeignKey("deployments.id", ondelete="CASCADE"), index=True
    )
    step_order: Mapped[int] = mapped_column(Integer, default=0)
    name: Mapped[str] = mapped_column(String(255))
    step_type: Mapped[str] = mapped_column(String(50))  # preflight | chef_prep | deploy_target | health_check | verification
    target_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Statuses: PENDING | RUNNING | SUCCEEDED | FAILED | SKIPPED | CANCELLED
    status: Mapped[str] = mapped_column(String(30), default="PENDING")
    progress: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    deployment: Mapped["Deployment"] = relationship("Deployment", back_populates="steps")


class DeploymentTarget(Base):
    """Tracks rollout state and health for each target node in a deployment."""

    __tablename__ = "deployment_targets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    deployment_id: Mapped[int] = mapped_column(
        ForeignKey("deployments.id", ondelete="CASCADE"), index=True
    )
    node_hostname: Mapped[str] = mapped_column(String(255), index=True)
    target_service: Mapped[str] = mapped_column(String(50))  # nginx | fastapi | postgresql | prometheus
    
    # Statuses: PENDING | DEPLOYING | HEALTHY | WARNING | FAILED | OFFLINE
    status: Mapped[str] = mapped_column(String(30), default="PENDING")
    progress: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    deployment: Mapped["Deployment"] = relationship("Deployment", back_populates="targets")


class DeploymentLog(Base):
    """Structured, persistent deployment log entry."""

    __tablename__ = "deployment_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    deployment_id: Mapped[int] = mapped_column(
        ForeignKey("deployments.id", ondelete="CASCADE"), index=True
    )
    step_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("deployment_steps.id", ondelete="CASCADE"), nullable=True
    )
    level: Mapped[str] = mapped_column(String(20), default="INFO")  # LIVE | INFO | WARNING | ERROR
    message: Mapped[str] = mapped_column(Text)
    node_hostname: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    deployment: Mapped["Deployment"] = relationship("Deployment", back_populates="logs")


class DeploymentAudit(Base):
    """Audit log entry capturing critical lifecycle events of a deployment."""

    __tablename__ = "deployment_audits"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    deployment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("deployments.id", ondelete="CASCADE"), nullable=True, index=True
    )
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    username: Mapped[str] = mapped_column(String(100), default="system")
    action: Mapped[str] = mapped_column(String(100))  # created | confirmed | started | step_completed | succeeded | failed | cancelled | deleted | retried
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    deployment: Mapped[Optional["Deployment"]] = relationship("Deployment", back_populates="audits")
