"""
Health & Air-Gap Audit Endpoints
"""

import time
from fastapi import APIRouter
from app.core.airgap_guard import guard_manager
from app.core.database import db
from app.services.telemetry_daemon import telemetry_daemon

router = APIRouter(prefix="/health", tags=["System Health"])
START_TIME = time.time()

@router.get("")
async def get_system_health():
    """System health status with Air-Gap enforcement verification and DB metrics."""
    uptime_seconds = int(time.time() - START_TIME)
    airgap_info = guard_manager.get_status()
    db_stats = db.get_stats()
    
    return {
        "status": "OPERATIONAL",
        "airgap_enforced": airgap_info["guard_active"],
        "airgap_mode": airgap_info["mode"],
        "blocked_outbound_egress_attempts": airgap_info["blocked_outbound_violations"],
        "allowed_local_connections": airgap_info["allowed_local_connections"],
        "uptime_seconds": uptime_seconds,
        "telemetry_daemon_running": telemetry_daemon.running,
        "telemetry_ticks": telemetry_daemon.tick_count,
        "active_anomalies_count": len(telemetry_daemon.active_anomalies),
        "database": db_stats
    }

@router.get("/airgap-audit")
async def get_airgap_audit_log():
    """Returns the tamper-evident audit trail of all intercepted network socket events."""
    return guard_manager.get_status()
