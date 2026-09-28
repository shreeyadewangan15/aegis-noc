"""
AegisNOC Backend - Main FastAPI Application
Air-Gapped Offline Predictive NOC Platform for SD-WAN over MPLS
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("AegisNOC")

# Install strict air-gap runtime network guard
from app.core.airgap_guard import guard_manager
guard_manager.install()

# Import internal services & routers
from app.services.telemetry_daemon import telemetry_daemon
from app.api.routes_topology import router as topology_router
from app.api.routes_telemetry import router as telemetry_router
from app.api.routes_health import router as health_router
from app.api.routes_predictive import router as predictive_router
from app.api.routes_copilot import router as copilot_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch 1Hz telemetry daemon background task
    daemon_task = asyncio.create_task(telemetry_daemon.run_loop())
    logger.info("AegisNOC Core Services Initialized in Strict Air-Gapped Mode.")
    yield
    # Shutdown: Stop daemon
    telemetry_daemon.stop()
    daemon_task.cancel()
    try:
        await daemon_task
    except asyncio.CancelledError:
        pass
    logger.info("AegisNOC Backend Cleanly Terminated.")

app = FastAPI(
    title="AegisNOC - Air-Gapped Predictive NOC Platform",
    description="Offline SD-WAN over MPLS Telemetry & Topology Management Engine",
    version="2.4.0",
    lifespan=lifespan
)

# CORS Policy: Restrict strictly to localhost / local dev ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(topology_router, prefix="/api")
app.include_router(telemetry_router, prefix="/api")
app.include_router(health_router, prefix="/api")
app.include_router(predictive_router, prefix="/api")
app.include_router(copilot_router, prefix="/api")

@app.get("/")
async def root_status():
    return {
        "system": "AegisNOC - Mission Critical Predictive SD-WAN Platform",
        "airgap_mode": "STRICT_OFFLINE_VERIFIED",
        "cloud_telemetry_egress": "DISABLED_BLOCKED",
        "api_documentation": "/docs",
        "active_routes": [
            "/api/topology",
            "/api/telemetry/live",
            "/api/telemetry/stream",
            "/api/health",
            "/api/predictive/inject-anomaly",
            "/api/predictive/rca"
        ]
    }
