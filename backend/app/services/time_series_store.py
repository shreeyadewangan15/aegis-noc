"""
Time-Series Sliding Window Store & Buffer
Maintains in-memory ring-buffers for real-time NOC UI graphs and flushes batches to persistent storage.
"""

import collections
import logging
from typing import Dict, Any, List, Optional
from app.core.config import SLIDING_WINDOW_HISTORY_SECONDS
from app.core.database import db

logger = logging.getLogger("TimeSeriesStore")

class TimeSeriesStore:
    def __init__(self, window_size: int = SLIDING_WINDOW_HISTORY_SECONDS):
        self.window_size = window_size
        # link_id -> deque of LinkTelemetry dicts
        self.link_history: Dict[str, collections.deque] = collections.defaultdict(
            lambda: collections.deque(maxlen=self.window_size)
        )
        # node_id -> deque of NodeTelemetry dicts
        self.node_history: Dict[str, collections.deque] = collections.defaultdict(
            lambda: collections.deque(maxlen=self.window_size)
        )
        # Sliding buffer for DB batch flushes
        self.pending_node_records: List[Dict[str, Any]] = []
        self.pending_link_records: List[Dict[str, Any]] = []

    def record_node_metric(self, record: Dict[str, Any]):
        node_id = record.get("node_id")
        if node_id:
            self.node_history[node_id].append(record)
            self.pending_node_records.append(record)

    def record_link_metric(self, record: Dict[str, Any]):
        link_id = record.get("link_id")
        if link_id:
            self.link_history[link_id].append(record)
            self.pending_link_records.append(record)

    def flush_to_database(self):
        if self.pending_node_records:
            batch_nodes = self.pending_node_records[:]
            self.pending_node_records.clear()
            db.insert_node_telemetry_batch(batch_nodes)

        if self.pending_link_records:
            batch_links = self.pending_link_records[:]
            self.pending_link_records.clear()
            db.insert_link_telemetry_batch(batch_links)

    def get_link_history(self, link_id: str, limit: int = 60) -> List[Dict[str, Any]]:
        history = list(self.link_history.get(link_id, []))
        return history[-limit:]

    def get_node_history(self, node_id: str, limit: int = 60) -> List[Dict[str, Any]]:
        history = list(self.node_history.get(node_id, []))
        return history[-limit:]

    def get_aggregated_system_trend(self, limit: int = 60) -> List[Dict[str, Any]]:
        """Returns time-aligned aggregated average latency and discard rate for NOC charts."""
        # Find all timestamps in any link history
        all_links = list(self.link_history.values())
        if not all_links or not all_links[0]:
            return []

        # Use the first link's timestamp count as reference
        sample_deque = all_links[0]
        points = []
        for i in range(min(len(sample_deque), limit)):
            idx = len(sample_deque) - min(len(sample_deque), limit) + i
            ts = sample_deque[idx]["timestamp"]
            
            latencies = []
            discards = []
            jitters = []
            for l_history in self.link_history.values():
                if len(l_history) > idx:
                    latencies.append(l_history[idx]["latency_ms"])
                    discards.append(l_history[idx]["buffer_discards_sec"])
                    jitters.append(l_history[idx]["jitter_ms"])

            points.append({
                "timestamp": ts,
                "avg_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else 0,
                "avg_jitter_ms": round(sum(jitters) / len(jitters), 2) if jitters else 0,
                "total_buffer_discards_sec": round(sum(discards), 1) if discards else 0
            })
        return points

ts_store = TimeSeriesStore()
