# AegisNOC: Air-Gapped Offline Predictive NOC Platform for SD-WAN over MPLS

A mission-critical, enterprise-grade Network Operations Center (NOC) platform built specifically for high-security, 100% air-gapped environments. **Guarantees zero outbound external HTTP/HTTPS calls, cloud telemetry leaks, or external API dependencies.**

---

## Architecture Overview

```
                           +-------------------------------------+
                           |      Ashburn Primary Datacenter     |
                           |   [DC1-CE-01]  <DCI>  [DC1-CE-02]   |
                           +-------------------------------------+
                                     /                 \
                     (Underlay MPLS)/                   \(Underlay MPLS)
                                   v                     v
                           +-------------+         +-------------+
                           |    PE-01    |---------|    PE-02    |
                           +-------------+         +-------------+
                                  |       \       /       |
                                  |        \     /        |
                                  |     +-----------+     |
                                  |     | P-CORE-01 |     |
                                  |     +-----------+     |
                                  |           | (400G)    |
                                  |     +-----------+     |
                                  |     | P-CORE-02 |     |
                                  |     +-----------+     |
                                  |        /     \        |
                                  |       /       \       |
                           +-------------+         +-------------+
                           |    PE-04    |---------|    PE-03    |
                           +-------------+         +-------------+
                                   \                     /
                     (Underlay MPLS)\                   /(Underlay MPLS)
                                     v                 v
                        +---------------+           +---------------+
                        | Regional Hub  |           | Regional Hub  |
                        |   US-East     |           |    US-West    |
                        +---------------+           +---------------+
                            /       \                   /       \
                  (Overlay)/         \(Overlay) (Overlay)/       \(Overlay)
                          v           v                 v         v
                     +---------+ +---------+       +---------+ +---------+
                     | BR-NYC  | | BR-MIA  |       | BR-CHI  | | BR-SFO  |
                     +---------+ +---------+       +---------+ +---------+
```

---

## Key System Modules

### 1. Strict Runtime Air-Gap Network Guard (`backend/app/core/airgap_guard.py`)
- Low-level socket interceptor replacing `socket.socket.connect` and `socket.create_connection`.
- Whitelists only local loopback addresses (`127.0.0.1`, `localhost`, `::1`, unix sockets).
- Blocks and records any outbound connection attempt to external IPs/domains into an audit trail, raising `AirgapSecurityViolation`.

### 2. Multi-Tier Enterprise Topology (`backend/data/network_topology.json`)
- **1 Datacenter**: Redundant active-active CEs (`DC1-CE-01`, `DC1-CE-02`) with 10G DCI heartbeat.
- **2 Regional Hubs**: `HUB-EAST-CE-01` (Atlanta) and `HUB-WEST-CE-01` (Denver).
- **4 Branch CEs**: `BR-NYC-CE-01`, `BR-CHI-CE-01`, `BR-SFO-CE-01`, `BR-MIA-CE-01`.
- **MPLS Core Provider Network**: 4 Provider Edge routers (`PE-01` to `PE-04`) and 2 Provider Core routers (`P-CORE-01`, `P-CORE-02`).
- **Layers**: MPLS L3VPN physical underlay + Dynamic Multipoint IPSec SD-WAN overlay tunnels.

### 3. Real-Time Telemetry Generator Daemon (`backend/app/services/telemetry_daemon.py`)
- Emits high-fidelity streaming metrics every 1.0 second (1Hz).
- Telemetry dimensions: Latency (ms), Jitter drift (ms), Packet loss (%), Buffer discards/sec, Interface Tx/Rx utilization %, BGP peer state machines, IPFIX top-talker flows with DSCP classes (Voice EF, Video AF41, Data CS0).
- Interactive chaos injector: Latency spikes, Fiber cuts, Buffer exhaustion, BGP route flaps.

### 4. Graph Topology Engine (`backend/app/services/topology_engine.py`)
- Built on NetworkX for shortest-path routing and multi-graph overlay-to-underlay path mapping.
- **Blast Radius Calculator**: Quantifies severed overlay tunnels, degraded branch sites, and isolated nodes upon device/link failure.

### 5. Local Vector RAG Index (`backend/app/services/offline_rag_faiss.py`)
- 100% offline semantic TF-IDF and vector cosine similarity index over NOC Runbooks for rapid Root-Cause Analysis (RCA). Zero cloud model calls.

### 6. Mission-Critical React NOC Dashboard (`frontend/`)
- Dark mode NOC HUD styling with live glowing pulse indicators, glassmorphic panels, and high-contrast tactical cyber palette.
- Interactive multi-layer SVG Topology Visualizer with real-time latency badges and click-to-inspect drawers.
- Live telemetry stream grid, IPFIX flow analyzer, chaos injector controls, and offline runbook triage modal.

---

## Directory Structure

```
hackathon/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                       # FastAPI entrypoint, CORS, lifespan
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── airgap_guard.py           # Runtime socket interceptor & audit trail
│   │   │   ├── config.py                 # Configuration paths & threshold settings
│   │   │   └── database.py               # Time-series persistence (DuckDB + SQLite WAL)
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── topology.py               # Pydantic models for nodes, links, sites
│   │   │   └── telemetry.py              # Pydantic models for metrics, flows, alerts
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── topology_engine.py        # NetworkX multi-graph & Blast-Radius engine
│   │   │   ├── telemetry_daemon.py       # 1Hz telemetry generator & chaos injector
│   │   │   ├── time_series_store.py      # Sliding-window memory buffer & DB flusher
│   │   │   └── offline_rag_faiss.py      # Local offline vector search for NOC runbooks
│   │   └── api/
│   │       ├── __init__.py
│   │       ├── routes_topology.py        # /api/topology, /path, /blast-radius
│   │       ├── routes_telemetry.py       # /api/telemetry/live, /history, /stream
│   │       ├── routes_health.py          # /api/health, /airgap-audit
│   │       └── routes_predictive.py      # /api/predictive/inject-anomaly, /rca
│   ├── data/
│   │   ├── network_topology.json         # Enterprise network topology specification
│   │   ├── runbooks.json                 # Offline operational triage runbooks
│   │   └── noc_telemetry.duckdb          # Local time-series database
│   ├── requirements.txt
│   └── run_backend.py
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── index.css                     # Mission-critical NOC dark styling & tokens
│       ├── App.tsx                       # Master Command Dashboard
│       ├── main.tsx
│       ├── types/index.ts                # TypeScript domain contracts
│       ├── components/
│       │   ├── AirgapStatusBadge.tsx     # 0-leak verification badge
│       │   ├── TopologyGraph.tsx         # Interactive multi-layer topology canvas
│       │   ├── TelemetryStreamGrid.tsx   # Live SLA gauges & IPFIX flow stream
│       │   ├── NodeDetailDrawer.tsx      # Deep router inspection panel
│       │   ├── AnomalyAlertBanner.tsx    # Live incident alert stream
│       │   ├── SimulationControls.tsx    # Chaos injection console
│       │   ├── RunbookSearchModal.tsx    # Offline vector RCA modal
│       │   └── BlastRadiusModal.tsx      # Blast radius impact analysis modal
│       └── services/api.ts               # Local REST & SSE service
├── scripts/
│   ├── verify_airgap.py                  # Automated verification test suite
│   └── start_all.sh                      # One-click startup script
└── README.md
```

---

## Quick Start Guide

### 1. Run Automated Verification Suite
```bash
python3 scripts/verify_airgap.py
```

### 2. Launch Backend Server
```bash
python3 backend/run_backend.py
```
*API is accessible at `http://127.0.0.1:8000` (Swagger docs at `/docs`).*

### 3. Launch Frontend NOC Dashboard
```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
*Dashboard opens at `http://127.0.0.1:5173`.*

### 4. Unified One-Click Launch
```bash
./scripts/start_all.sh
```

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Air-Gap enforcement status, DB stats, uptime |
| `GET` | `/api/health/airgap-audit` | Tamper-evident socket audit trail |
| `GET` | `/api/topology` | Full enterprise SD-WAN topology payload |
| `GET` | `/api/topology/path` | Dijkstra shortest path on selected layer |
| `GET` | `/api/topology/blast-radius` | Graph-theoretic blast radius impact analysis |
| `GET` | `/api/telemetry/live` | Current 1Hz snapshot of all nodes, links, and flows |
| `GET` | `/api/telemetry/stream` | Server-Sent Events (SSE) 1Hz streaming socket |
| `POST` | `/api/predictive/inject-anomaly` | Inject chaos (latency spike, fiber cut, BGP flap) |
| `POST` | `/api/predictive/clear-anomalies` | Reset network metrics to baseline |
| `POST` | `/api/predictive/rca` | 100% offline semantic vector match over runbooks |
