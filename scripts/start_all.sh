#!/usr/bin/env bash
# AegisNOC Unified Air-Gapped Startup Script
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

echo "================================================================="
echo " AegisNOC: Air-Gapped Predictive NOC Platform"
echo " Initializing Local Services (Zero Outbound Egress Enforced)..."
echo "================================================================="

# Find Python interpreter with required dependencies
PYTHON_BIN=""
for candidate in python3 /opt/anaconda3/bin/python3 "${HOME}/anaconda3/bin/python3" "${HOME}/miniconda3/bin/python3" /opt/homebrew/bin/python3 /usr/local/bin/python3; do
    if command -v "$candidate" &> /dev/null; then
        if "$candidate" -c "import networkx, fastapi, uvicorn" &> /dev/null; then
            PYTHON_BIN="$(command -v "$candidate")"
            break
        fi
    fi
done
[ -z "$PYTHON_BIN" ] && PYTHON_BIN="python3"

# Start Backend
echo ">>> [1/2] Starting Python FastAPI Backend on http://127.0.0.1:8000 using $PYTHON_BIN..."
"$PYTHON_BIN" backend/run_backend.py &
BACKEND_PID=$!

# Trap signals to cleanly stop child processes
trap "echo 'Stopping AegisNOC...'; kill $BACKEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM EXIT

# Give backend a moment to initialize
sleep 2

# Start Frontend
echo ">>> [2/2] Starting React NOC Dashboard on http://127.0.0.1:5173..."
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173

wait
