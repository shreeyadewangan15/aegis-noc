"""
Application Configuration & Settings for Offline NOC Platform
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"

TOPOLOGY_FILE_PATH = DATA_DIR / "network_topology.json"
RUNBOOKS_FILE_PATH = DATA_DIR / "runbooks.json"
DUCKDB_PATH = DATA_DIR / "noc_telemetry.duckdb"
SQLITE_PATH = DATA_DIR / "noc_telemetry.sqlite3"

# Telemetry streaming settings
TELEMETRY_INTERVAL_SECONDS = 1.0
SLIDING_WINDOW_HISTORY_SECONDS = 300 # 5 minutes sliding window in memory
PERSISTENCE_FLUSH_INTERVAL_SECONDS = 5.0

# SLA Thresholds
SLA_MAX_LATENCY_MS = 35.0
SLA_MAX_JITTER_MS = 10.0
SLA_MAX_LOSS_PCT = 0.5
SLA_MAX_DISCARDS_PER_SEC = 250

API_PREFIX = "/api"
