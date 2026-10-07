"""
Health check models for diagnostic probes, fleet health runs, and runner heartbeats.
"""

from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class HealthCheck(Base):
    """An individual health check execution for a server node."""

    __tablename__ = "health_checks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    workspace_id: Mapped[str] = mapped_column(String(100), default="default")
    server_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("servers.id", ondelete="CASCADE"), index=True)
    run_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("fleet_health_runs.id", ondelete="SET NULL"), nullable=True)

    status: Mapped[str] = mapped_column(String(20), default="unknown")  # healthy | degraded | unhealthy | unknown
    mode: Mapped[str] = mapped_column(String(20), default="simulation")  # real | simulation
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    results: Mapped[List["HealthCheckResult"]] = relationship("HealthCheckResult", back_populates="health_check", cascade="all, delete-orphan")


class HealthCheckResult(Base):
    """Granular probe result for a specific check item (reachability, ports, metrics)."""

    __tablename__ = "health_check_results"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    health_check_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("health_checks.id", ondelete="CASCADE"), index=True)

    check_name: Mapped[str] = mapped_column(String(100))
    ok: Mapped[bool] = mapped_column(Boolean, default=False)
    value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    health_check: Mapped["HealthCheck"] = relationship("HealthCheck", back_populates="results")


class FleetHealthRun(Base):
    """Tracks a cluster-wide fleet health run across multiple servers."""

    __tablename__ = "fleet_health_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    workspace_id: Mapped[str] = mapped_column(String(100), default="default")
    scope: Mapped[str] = mapped_column(String(50), default="all")  # all | production | staging | development
    status: Mapped[str] = mapped_column(String(20), default="queued")  # queued | running | done | failed

    total: Mapped[int] = mapped_column(Integer, default=0)
    completed: Mapped[int] = mapped_column(Integer, default=0)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class RunnerHeartbeat(Base):
    """Tracks runner daemon heartbeats to distinguish real probe execution from simulation."""

    __tablename__ = "runner_heartbeats"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    runner_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hostname: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class AuditLog(Base):
    """Audit log tracking all diagnostic probes and operational actions."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    workspace_id: Mapped[str] = mapped_column(String(100), default="default")
    actor: Mapped[str] = mapped_column(String(100), default="system")
    action: Mapped[str] = mapped_column(String(100))
    target: Mapped[str] = mapped_column(String(255))
    result: Mapped[str] = mapped_column(String(50))
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
