"""
Time-Series Local Database Engine (DuckDB + SQLite Fallback)
Provides zero-cloud, high-performance offline telemetry persistence.
"""

import sqlite3
import logging
import datetime
from typing import Dict, Any, List, Optional
from app.core.config import DUCKDB_PATH, SQLITE_PATH

logger = logging.getLogger("NOCDatabase")

try:
    import duckdb
    HAS_DUCKDB = True
except ImportError:
    HAS_DUCKDB = False

class TimeSeriesDB:
    def __init__(self):
        self.use_duckdb = HAS_DUCKDB
        self.duck_conn = None
        self.sqlite_conn = None
        self._init_db()

    def _init_db(self):
        if self.use_duckdb:
            try:
                self.duck_conn = duckdb.connect(str(DUCKDB_PATH), read_only=False)
                self._create_duckdb_tables()
                logger.info(f"Initialized DuckDB time-series store at: {DUCKDB_PATH}")
                return
            except Exception as e:
                logger.warning(f"DuckDB initialization failed ({e}), falling back to SQLite3 WAL.")
                self.use_duckdb = False

        # SQLite Fallback
        self.sqlite_conn = sqlite3.connect(str(SQLITE_PATH), check_same_thread=False)
        self.sqlite_conn.execute("PRAGMA journal_mode=WAL;")
        self.sqlite_conn.execute("PRAGMA synchronous=NORMAL;")
        self._create_sqlite_tables()
        logger.info(f"Initialized SQLite3 WAL time-series store at: {SQLITE_PATH}")

    def _create_duckdb_tables(self):
        self.duck_conn.execute("""
            CREATE TABLE IF NOT EXISTS node_telemetry (
                timestamp TIMESTAMP,
                node_id VARCHAR,
                cpu_util_pct DOUBLE,
                memory_util_pct DOUBLE,
                temperature_c DOUBLE,
                active_flows_count INTEGER,
                buffer_discards_sec DOUBLE,
                bgp_up_count INTEGER,
                bgp_total_count INTEGER
            );
        """)
        self.duck_conn.execute("""
            CREATE TABLE IF NOT EXISTS link_telemetry (
                timestamp TIMESTAMP,
                link_id VARCHAR,
                layer VARCHAR,
                latency_ms DOUBLE,
                jitter_ms DOUBLE,
                packet_loss_pct DOUBLE,
                tx_util_pct DOUBLE,
                rx_util_pct DOUBLE,
                tx_bps DOUBLE,
                rx_bps DOUBLE,
                buffer_discards_sec DOUBLE,
                sla_state VARCHAR
            );
        """)
        self.duck_conn.execute("""
            CREATE TABLE IF NOT EXISTS ipfix_records (
                timestamp TIMESTAMP,
                flow_id VARCHAR,
                src_ip VARCHAR,
                dst_ip VARCHAR,
                src_port INTEGER,
                dst_port INTEGER,
                protocol VARCHAR,
                dscp VARCHAR,
                bytes BIGINT,
                app_tag VARCHAR
            );
        """)

    def _create_sqlite_tables(self):
        cursor = self.sqlite_conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS node_telemetry (
                timestamp TEXT,
                node_id TEXT,
                cpu_util_pct REAL,
                memory_util_pct REAL,
                temperature_c REAL,
                active_flows_count INTEGER,
                buffer_discards_sec REAL,
                bgp_up_count INTEGER,
                bgp_total_count INTEGER
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS link_telemetry (
                timestamp TEXT,
                link_id TEXT,
                layer TEXT,
                latency_ms REAL,
                jitter_ms REAL,
                packet_loss_pct REAL,
                tx_util_pct REAL,
                rx_util_pct REAL,
                tx_bps REAL,
                rx_bps REAL,
                buffer_discards_sec REAL,
                sla_state TEXT
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ipfix_records (
                timestamp TEXT,
                flow_id TEXT,
                src_ip TEXT,
                dst_ip TEXT,
                src_port INTEGER,
                dst_port INTEGER,
                protocol TEXT,
                dscp TEXT,
                bytes INTEGER,
                app_tag TEXT
            );
        """)
        self.sqlite_conn.commit()

    def insert_node_telemetry_batch(self, records: List[Dict[str, Any]]):
        if not records:
            return
        if self.use_duckdb and self.duck_conn:
            try:
                for r in records:
                    self.duck_conn.execute("""
                        INSERT INTO node_telemetry VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        r.get("timestamp"),
                        r.get("node_id"),
                        r.get("cpu_util_pct", 0.0),
                        r.get("memory_util_pct", 0.0),
                        r.get("temperature_c", 0.0),
                        r.get("active_flows_count", 0),
                        r.get("buffer_discards_sec", 0.0),
                        r.get("bgp_up_count", 0),
                        r.get("bgp_total_count", 0)
                    ))
                return
            except Exception as e:
                logger.error(f"DuckDB insert error: {e}")

        # SQLite fallback
        try:
            cursor = self.sqlite_conn.cursor()
            cursor.executemany("""
                INSERT INTO node_telemetry VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                (
                    r.get("timestamp"),
                    r.get("node_id"),
                    r.get("cpu_util_pct", 0.0),
                    r.get("memory_util_pct", 0.0),
                    r.get("temperature_c", 0.0),
                    r.get("active_flows_count", 0),
                    r.get("buffer_discards_sec", 0.0),
                    r.get("bgp_up_count", 0),
                    r.get("bgp_total_count", 0)
                ) for r in records
            ])
            self.sqlite_conn.commit()
        except Exception as e:
            logger.error(f"SQLite insert error: {e}")

    def insert_link_telemetry_batch(self, records: List[Dict[str, Any]]):
        if not records:
            return
        if self.use_duckdb and self.duck_conn:
            try:
                for r in records:
                    self.duck_conn.execute("""
                        INSERT INTO link_telemetry VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        r.get("timestamp"),
                        r.get("link_id"),
                        r.get("layer"),
                        r.get("latency_ms", 0.0),
                        r.get("jitter_ms", 0.0),
                        r.get("packet_loss_pct", 0.0),
                        r.get("tx_util_pct", 0.0),
                        r.get("rx_util_pct", 0.0),
                        r.get("tx_bps", 0.0),
                        r.get("rx_bps", 0.0),
                        r.get("buffer_discards_sec", 0.0),
                        r.get("sla_state", "HEALTHY")
                    ))
                return
            except Exception as e:
                logger.error(f"DuckDB link insert error: {e}")

        # SQLite fallback
        try:
            cursor = self.sqlite_conn.cursor()
            cursor.executemany("""
                INSERT INTO link_telemetry VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                (
                    r.get("timestamp"),
                    r.get("link_id"),
                    r.get("layer"),
                    r.get("latency_ms", 0.0),
                    r.get("jitter_ms", 0.0),
                    r.get("packet_loss_pct", 0.0),
                    r.get("tx_util_pct", 0.0),
                    r.get("rx_util_pct", 0.0),
                    r.get("tx_bps", 0.0),
                    r.get("rx_bps", 0.0),
                    r.get("buffer_discards_sec", 0.0),
                    r.get("sla_state", "HEALTHY")
                ) for r in records
            ])
            self.sqlite_conn.commit()
        except Exception as e:
            logger.error(f"SQLite link insert error: {e}")

    def get_stats(self) -> Dict[str, Any]:
        engine = "DuckDB" if self.use_duckdb else "SQLite3-WAL"
        node_count = 0
        link_count = 0
        try:
            if self.use_duckdb and self.duck_conn:
                node_count = self.duck_conn.execute("SELECT COUNT(*) FROM node_telemetry").fetchone()[0]
                link_count = self.duck_conn.execute("SELECT COUNT(*) FROM link_telemetry").fetchone()[0]
            elif self.sqlite_conn:
                cur = self.sqlite_conn.cursor()
                node_count = cur.execute("SELECT COUNT(*) FROM node_telemetry").fetchone()[0]
                link_count = cur.execute("SELECT COUNT(*) FROM link_telemetry").fetchone()[0]
        except Exception as e:
            logger.warning(f"Failed to fetch DB row count: {e}")

        return {
            "engine": engine,
            "air_gapped_persistence": True,
            "total_persisted_node_metrics": node_count,
            "total_persisted_link_metrics": link_count,
            "duckdb_path": str(DUCKDB_PATH) if self.use_duckdb else None,
            "sqlite_path": str(SQLITE_PATH) if not self.use_duckdb else None
        }

db = TimeSeriesDB()
