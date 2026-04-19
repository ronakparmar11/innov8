"""Persistent alert storage using SQLite.

All alerts are stored permanently on disk. History is never deleted.
The database file lives at backend/data/alerts.db.
"""
from __future__ import annotations

import sqlite3
import time
import json
import threading
import os
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Database lives in backend/data/ — persists across restarts
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "alerts.db"

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    camera_id TEXT NOT NULL,
    camera_name TEXT NOT NULL DEFAULT '',
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    confidence REAL NOT NULL DEFAULT 0.0,
    detections TEXT NOT NULL DEFAULT '[]',
    source_url TEXT NOT NULL DEFAULT '',
    created_at REAL NOT NULL,
    created_at_iso TEXT NOT NULL DEFAULT '',
    acknowledged INTEGER NOT NULL DEFAULT 0,
    metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_camera_id ON alerts(camera_id);
CREATE INDEX IF NOT EXISTS idx_alerts_alert_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
"""


class AlertStore:
    """Thread-safe persistent alert storage backed by SQLite."""

    def __init__(self, db_path: Path = DB_PATH):
        self._db_path = str(db_path)
        self._lock = threading.Lock()
        self._init_db()
        count = self.count_alerts()
        logger.info(f"📦 Alert store initialized: {db_path} ({count} historical alerts)")

    def _init_db(self):
        with self._lock:
            conn = sqlite3.connect(self._db_path)
            try:
                conn.executescript(_CREATE_TABLE)
                conn.commit()
            finally:
                conn.close()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def save_alert(
        self,
        camera_id: str,
        camera_name: str,
        alert_type: str,
        severity: str = "medium",
        confidence: float = 0.0,
        detections: List[Dict[str, Any]] | None = None,
        source_url: str = "",
        metadata: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        """Save an alert to the persistent store. Returns the saved alert dict."""
        now = time.time()
        alert_id = f"{int(now * 1000)}-{camera_id}-{alert_type}-{uuid.uuid4().hex[:8]}"
        iso_time = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(now))
        dets_json = json.dumps(detections or [])
        meta_json = json.dumps(metadata or {})

        with self._lock:
            conn = self._get_conn()
            try:
                conn.execute(
                    """INSERT INTO alerts 
                       (id, camera_id, camera_name, alert_type, severity, confidence, 
                        detections, source_url, created_at, created_at_iso, acknowledged, metadata)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)""",
                    (alert_id, camera_id, camera_name, alert_type, severity,
                     confidence, dets_json, source_url, now, iso_time, meta_json),
                )
                conn.commit()
            finally:
                conn.close()

        alert = {
            "id": alert_id,
            "camera_id": camera_id,
            "camera_name": camera_name,
            "alert_type": alert_type,
            "severity": severity,
            "confidence": confidence,
            "detections": detections or [],
            "source_url": source_url,
            "created_at": now,
            "created_at_iso": iso_time,
            "acknowledged": False,
            "metadata": metadata or {},
        }
        logger.info(f"🚨 Alert saved: [{severity.upper()}] {alert_type} on {camera_name} ({confidence:.0%})")
        return alert

    def get_alerts(
        self,
        limit: int = 100,
        offset: int = 0,
        camera_id: Optional[str] = None,
        alert_type: Optional[str] = None,
        severity: Optional[str] = None,
        since: Optional[float] = None,
        until: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve alerts with optional filters. Ordered by newest first."""
        query = "SELECT * FROM alerts WHERE 1=1"
        params: list = []

        if camera_id:
            query += " AND camera_id = ?"
            params.append(camera_id)
        if alert_type:
            query += " AND alert_type = ?"
            params.append(alert_type)
        if severity:
            query += " AND severity = ?"
            params.append(severity)
        if since is not None:
            query += " AND created_at >= ?"
            params.append(since)
        if until is not None:
            query += " AND created_at <= ?"
            params.append(until)

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        with self._lock:
            conn = self._get_conn()
            try:
                rows = conn.execute(query, params).fetchall()
                return [self._row_to_dict(row) for row in rows]
            finally:
                conn.close()

    def count_alerts(
        self,
        camera_id: Optional[str] = None,
        alert_type: Optional[str] = None,
        severity: Optional[str] = None,
        since: Optional[float] = None,
    ) -> int:
        """Count alerts matching filters."""
        query = "SELECT COUNT(*) FROM alerts WHERE 1=1"
        params: list = []

        if camera_id:
            query += " AND camera_id = ?"
            params.append(camera_id)
        if alert_type:
            query += " AND alert_type = ?"
            params.append(alert_type)
        if severity:
            query += " AND severity = ?"
            params.append(severity)
        if since is not None:
            query += " AND created_at >= ?"
            params.append(since)

        with self._lock:
            conn = self._get_conn()
            try:
                return conn.execute(query, params).fetchone()[0]
            finally:
                conn.close()

    def acknowledge_alert(self, alert_id: str) -> bool:
        """Mark an alert as acknowledged (but don't delete it)."""
        with self._lock:
            conn = self._get_conn()
            try:
                cursor = conn.execute(
                    "UPDATE alerts SET acknowledged = 1 WHERE id = ?",
                    (alert_id,),
                )
                conn.commit()
                return cursor.rowcount > 0
            finally:
                conn.close()

    def get_stats(self) -> Dict[str, Any]:
        """Get summary statistics."""
        with self._lock:
            conn = self._get_conn()
            try:
                total = conn.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]
                unacked = conn.execute(
                    "SELECT COUNT(*) FROM alerts WHERE acknowledged = 0"
                ).fetchone()[0]

                # Last 24 hours
                day_ago = time.time() - 86400
                last_24h = conn.execute(
                    "SELECT COUNT(*) FROM alerts WHERE created_at >= ?",
                    (day_ago,),
                ).fetchone()[0]

                # By severity (last 24h)
                severity_rows = conn.execute(
                    "SELECT severity, COUNT(*) as cnt FROM alerts WHERE created_at >= ? GROUP BY severity",
                    (day_ago,),
                ).fetchall()
                by_severity = {row["severity"]: row["cnt"] for row in severity_rows}

                # By camera (last 24h)
                camera_rows = conn.execute(
                    "SELECT camera_id, camera_name, COUNT(*) as cnt FROM alerts WHERE created_at >= ? GROUP BY camera_id ORDER BY cnt DESC LIMIT 10",
                    (day_ago,),
                ).fetchall()
                by_camera = [
                    {"camera_id": row["camera_id"], "camera_name": row["camera_name"], "count": row["cnt"]}
                    for row in camera_rows
                ]

                return {
                    "total_alerts": total,
                    "unacknowledged": unacked,
                    "last_24h": last_24h,
                    "by_severity": by_severity,
                    "by_camera": by_camera,
                }
            finally:
                conn.close()

    @staticmethod
    def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        d["detections"] = json.loads(d.get("detections", "[]"))
        d["metadata"] = json.loads(d.get("metadata", "{}"))
        d["acknowledged"] = bool(d.get("acknowledged", 0))
        return d


# Global singleton
alert_store = AlertStore()
