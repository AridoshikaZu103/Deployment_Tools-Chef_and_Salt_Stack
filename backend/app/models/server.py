"""
Server / Node model — represents managed infrastructure hosts.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Server(Base):
    """A managed server node tracked by Chef and/or Salt."""

    __tablename__ = "servers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # ── Identity ─────────────────────────────────────────
    hostname: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    ip_address: Mapped[str] = mapped_column(String(45))  # IPv4 or IPv6
    fqdn: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # ── Classification ───────────────────────────────────
    environment: Mapped[str] = mapped_column(String(20), default="development")
    role: Mapped[str] = mapped_column(String(50), default="webserver")  # webserver | appserver | database | monitoring
    os_family: Mapped[str] = mapped_column(String(50), default="linux")
    os_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # ── Management ───────────────────────────────────────
    managed_by: Mapped[str] = mapped_column(String(20), default="both")  # chef | salt | both
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # ── Health ───────────────────────────────────────────
    health_status: Mapped[str] = mapped_column(
        String(20), default="unknown"
    )  # healthy | degraded | unhealthy | unknown
    last_health_check: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    health_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Chef metadata ────────────────────────────────────
    chef_node_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    chef_run_list: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Salt metadata ────────────────────────────────────
    salt_minion_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    salt_grains: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON

    # ── Timestamps ───────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
