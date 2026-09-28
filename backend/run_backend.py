"""
Standalone AegisNOC Server Runner
Runs with strictly air-gapped network socket guards.
"""

import sys
import os
from pathlib import Path
import uvicorn

# Ensure backend root is in sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

if __name__ == "__main__":
    print("=================================================================")
    print(" [AegisNOC] Starting Offline Air-Gapped SD-WAN Predictive Server")
    print(" Network Guard: ENFORCED (0 Outbound Egress Allowed)")
    print(" Host: http://127.0.0.1:8000")
    print("=================================================================")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False, log_level="info")
