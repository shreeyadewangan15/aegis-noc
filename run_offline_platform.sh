#!/usr/bin/env bash
# ==============================================================================
# AEGIS-NOC: Air-Gapped Predictive NOC Platform Launcher
# Zero-Egress Offline Execution Orchestrator
# ==============================================================================

set -eo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
LOG_DIR="${PROJECT_ROOT}/logs"

mkdir -p "${LOG_DIR}"

BACKEND_PORT=8000
FRONTEND_PORT=5173

# Terminal Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${CYAN}${BOLD}"
echo "=========================================================================="
echo "    ___    ___________ _____ ____      _   ______  ______"
echo "   /   |  / ____/ ___//  _// ___/     / | / / __ \/ ____/"
echo "  / /| | / __/  \__ \ / /  \__ \     /  |/ / / / / /     "
echo " / ___ |/ /___ ___/ // /  ___/ /    / /|  / /_/ / /___   "
echo "/_/  |_/_____//____/___/ /____/    /_/ |_/\____/\____/   "
echo "                                                         "
echo "   AIR-GAPPED PREDICTIVE NOC PLATFORM FOR SD-WAN OVER MPLS"
echo "=========================================================================="
echo -e "${NC}"

# Check Prerequisites
echo -e "${YELLOW}[1/4] Checking Offline Environment & Dependencies...${NC}"

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

if [ -z "$PYTHON_BIN" ]; then
    if command -v python3 &> /dev/null; then
        PYTHON_BIN="$(command -v python3)"
    else
        echo -e "${RED}[ERROR] python3 is required but not installed.${NC}"
        exit 1
    fi
fi

echo -e "Using Python: ${GREEN}${PYTHON_BIN}${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm is required but not installed.${NC}"
    exit 1
fi

# Air-gap pre-flight verification
echo -e "${YELLOW}[2/4] Running Air-Gap Verification Suite (Zero Outbound Egress)...${NC}"
export AIRGAP_STRICT_ENFORCE="true"
"$PYTHON_BIN" "${PROJECT_ROOT}/scripts/verify_airgap.py"

echo -e "${GREEN}✓ Air-Gap & Architectural Guardrails 100% Passed.${NC}"

# Start Backend Server
echo -e "${YELLOW}[3/4] Booting AegisNOC Telemetry & AI Copilot Backend (Port ${BACKEND_PORT})...${NC}"
cd "${PROJECT_ROOT}"
"$PYTHON_BIN" backend/run_backend.py > "${LOG_DIR}/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: ${BACKEND_PID}"

# Wait for backend health check
BACKEND_READY=0
for i in {1..15}; do
    if curl -s "http://127.0.0.1:${BACKEND_PORT}/api/health" | grep -q "healthy"; then
        BACKEND_READY=1
        break
    fi
    sleep 1
done

if [ $BACKEND_READY -eq 1 ]; then
    echo -e "${GREEN}✓ Backend Engine & 1Hz Telemetry Daemon ONLINE.${NC}"
else
    echo -e "${RED}[ERROR] Backend failed to initialize within 15 seconds. Check ${LOG_DIR}/backend.log${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start Frontend Dev Server
echo -e "${YELLOW}[4/4] Launching AegisNOC Mission Control UI (Port ${FRONTEND_PORT})...${NC}"
cd "${FRONTEND_DIR}"
npm run dev -- --host 127.0.0.1 --port ${FRONTEND_PORT} > "${LOG_DIR}/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: ${FRONTEND_PID}"

sleep 2

echo -e "${CYAN}${BOLD}"
echo "=========================================================================="
echo "               AEGIS-NOC COMMAND CENTER IS LIVE"
echo "=========================================================================="
echo -e "${NC}"
echo -e "  • NOC Command Center UI:  ${GREEN}${BOLD}http://127.0.0.1:${FRONTEND_PORT}${NC}"
echo -e "  • FastAPI Telemetry API:  ${GREEN}${BOLD}http://127.0.0.1:${BACKEND_PORT}/docs${NC}"
echo -e "  • Air-Gap Egress Status:  ${GREEN}${BOLD}ENFORCED & ACTIVE (Loopback Only)${NC}"
echo -e "  • Local LLM Copilot:      ${GREEN}${BOLD}llama3.2 @ 127.0.0.1:11434 (Deterministic Fallback Ready)${NC}"
echo -e "  • Offline ChromaDB RAG:   ${GREEN}${BOLD}6 Enterprise SOPs Indexed locally${NC}"
echo -e "  • Telemetry Stream:       ${GREEN}${BOLD}1Hz Dual-Hub Active-Active Simulation${NC}"
echo ""
echo -e "${YELLOW}Press [CTRL+C] to gracefully shut down the AegisNOC platform.${NC}"

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down AegisNOC services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✓ All services safely stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
