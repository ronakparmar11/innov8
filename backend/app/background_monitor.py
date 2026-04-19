"""Background monitoring daemon for all cameras.

Runs continuously as an asyncio task inside the FastAPI server.
Polls all configured cameras, runs YOLO + violence detection,
and saves alerts to persistent SQLite storage.

This runs 24/7 regardless of whether anyone is viewing the frontend.
"""
from __future__ import annotations

import asyncio
import json
import time
import threading
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional
from urllib.request import Request, urlopen
from urllib.error import URLError
import logging

logger = logging.getLogger(__name__)

# Camera config file — persists the camera list
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
CAMERAS_CONFIG_PATH = DATA_DIR / "cameras.json"

# Default cameras matching the frontend list
DEFAULT_CAMERAS = [
    {"id": "mobile-cam-1", "name": "Mobile Camera", "url": "http://192.168.1.101:8080/video", "active": True},
]

# Severity mapping for alert types
ALERT_SEVERITY = {
    "weapon-detected": "critical",
    "violence-detected": "critical",
    "fire-detected": "critical",
    "person-unauthorized": "high",
    "multiple-persons": "high",
    "suspicious-object": "medium",
    "vehicle-detected": "low",
    "animal-detected": "low",
}

# Monitoring interval in seconds
import os
MONITOR_INTERVAL = int(os.environ.get("MONITOR_INTERVAL", "20"))


def load_cameras() -> List[Dict[str, str]]:
    """Load camera config from disk, or create default."""
    if CAMERAS_CONFIG_PATH.exists():
        try:
            with open(CAMERAS_CONFIG_PATH, "r") as f:
                cameras = json.load(f)
            if isinstance(cameras, list) and len(cameras) > 0:
                return cameras
        except Exception as e:
            logger.warning(f"Failed to load cameras config: {e}")

    # Save defaults
    save_cameras(DEFAULT_CAMERAS)
    return DEFAULT_CAMERAS


def save_cameras(cameras: List[Dict[str, str]]):
    """Save camera config to disk."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(CAMERAS_CONFIG_PATH, "w") as f:
        json.dump(cameras, f, indent=2)
    logger.info(f"📷 Camera config saved: {len(cameras)} cameras")


def _try_fetch_snapshot_bg(url: str, timeout_s: float = 10.0) -> Optional[np.ndarray]:
    """Fetch a single frame from a camera URL for background analysis."""
    try:
        lowered = url.lower()

        # MJPEG stream
        if any(x in lowered for x in [".mjpeg", ".mjpg", "mjpeg", "/video"]):
            try:
                req = Request(url, headers={"User-Agent": "SecureSight-BG/1.0"})
                with urlopen(req, timeout=timeout_s) as resp:
                    buf = b""
                    max_read = 512_000
                    jpeg_start = -1
                    while len(buf) < max_read:
                        chunk = resp.read(4096)
                        if not chunk:
                            break
                        buf += chunk
                        if jpeg_start < 0:
                            jpeg_start = buf.find(b"\xff\xd8")
                        if jpeg_start >= 0:
                            jpeg_end = buf.find(b"\xff\xd9", jpeg_start + 2)
                            if jpeg_end >= 0:
                                jpeg_data = buf[jpeg_start:jpeg_end + 2]
                                np_arr = np.frombuffer(jpeg_data, np.uint8)
                                img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                                return img
                return None
            except Exception:
                return None

        # Direct image snapshot
        if any(x in lowered for x in [".jpg", ".jpeg", ".png", "frame.jpeg", "snapshot"]):
            try:
                req = Request(url, headers={"User-Agent": "SecureSight-BG/1.0"})
                with urlopen(req, timeout=timeout_s) as resp:
                    data = resp.read()
                np_arr = np.frombuffer(data, np.uint8)
                img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                return img
            except Exception:
                return None

        # VideoCapture fallback (works for RTSP, MP4 streams, etc.)
        cap = cv2.VideoCapture(url)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        if not cap.isOpened():
            cap.release()
            return None
        ret, frame = cap.read()
        cap.release()
        if not ret or frame is None:
            return None
        return frame

    except Exception as e:
        logger.debug(f"Frame fetch failed for {url}: {e}")
        return None


class BackgroundMonitor:
    """Continuous background camera monitoring daemon."""

    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._cameras: List[Dict[str, str]] = []
        self._last_alert_time: Dict[str, Dict[str, float]] = {}  # camera_id -> {alert_type -> timestamp}
        self._alert_cooldowns = {
            "weapon-detected": 120,
            "violence-detected": 120,
            "fire-detected": 120,
            "person-unauthorized": 600,
            "multiple-persons": 600,
            "suspicious-object": 900,
            "vehicle-detected": 900,
            "animal-detected": 900,
        }
        self._cycle_count = 0
        self._successful_detections = 0
        self._errors = 0

    def start(self, loop: Optional[asyncio.AbstractEventLoop] = None):
        """Start the background monitoring loop."""
        self._cameras = load_cameras()
        self._running = True
        self._task = asyncio.ensure_future(self._monitor_loop())
        logger.info(f"🟢 Background monitor started: {len(self._cameras)} cameras, interval={MONITOR_INTERVAL}s")

    def stop(self):
        """Stop the background monitoring loop."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("🔴 Background monitor stopped")

    def update_cameras(self, cameras: List[Dict[str, str]]):
        """Update the camera list (can be called at runtime)."""
        self._cameras = cameras
        save_cameras(cameras)
        logger.info(f"📷 Background monitor updated: {len(cameras)} cameras")

    def get_cameras(self) -> List[Dict[str, str]]:
        """Get the current camera list."""
        return self._cameras

    def get_status(self) -> Dict[str, Any]:
        """Get background monitor status."""
        return {
            "running": self._running,
            "camera_count": len(self._cameras),
            "cycle_count": self._cycle_count,
            "successful_detections": self._successful_detections,
            "errors": self._errors,
            "interval_seconds": MONITOR_INTERVAL,
        }

    def _should_alert(self, camera_id: str, alert_type: str) -> bool:
        """Check if an alert should fire (respecting cooldowns)."""
        now = time.time()
        cooldown = self._alert_cooldowns.get(alert_type, 60)
        cam_alerts = self._last_alert_time.get(camera_id, {})
        last_fired = cam_alerts.get(alert_type, 0)
        return now - last_fired >= cooldown

    def _record_alert_time(self, camera_id: str, alert_type: str):
        """Record when an alert was last fired."""
        now = time.time()
        if camera_id not in self._last_alert_time:
            self._last_alert_time[camera_id] = {}
        self._last_alert_time[camera_id][alert_type] = now

    async def _monitor_loop(self):
        """Main monitoring loop — runs forever."""
        # Import here to avoid circular imports
        from .alert_manager import alert_manager
        from .alert_store import alert_store

        # Wait a few seconds for the model to load on startup
        await asyncio.sleep(5)

        logger.info("🔄 Background monitor entering main loop...")

        while self._running:
            try:
                self._cycle_count += 1
                cycle_start = time.time()

                if not self._cameras:
                    self._cameras = load_cameras()
                    if not self._cameras:
                        logger.warning("No cameras configured, sleeping...")
                        await asyncio.sleep(MONITOR_INTERVAL)
                        continue

                logger.info(
                    f"[BG Monitor] Cycle #{self._cycle_count}: scanning {len(self._cameras)} cameras"
                )

                for cam in self._cameras:
                    if not self._running:
                        break

                    cam_id = cam.get("id", "unknown")
                    cam_name = cam.get("name", f"Camera {cam_id}")
                    cam_url = cam.get("url", "")

                    if not cam_url:
                        continue

                    try:
                        # Fetch frame from camera
                        frame = await asyncio.get_event_loop().run_in_executor(
                            None, _try_fetch_snapshot_bg, cam_url
                        )

                        if frame is None:
                            self._errors += 1
                            logger.debug(f"[BG Monitor] No frame from {cam_name}")
                            continue

                        # Run detection (import at use time to get current model)
                        from .main import _run_detection, violence_detector, fire_detector

                        dets, infer_ms, person_count = await asyncio.get_event_loop().run_in_executor(
                            None, _run_detection, frame, 0.5
                        )

                        self._successful_detections += 1

                        # Check alert rules
                        det_dicts = [d.model_dump() for d in dets]
                        triggered_alerts = alert_manager.check(det_dicts, source_key=f"bg:{cam_id}")

                        # Violence detection on this frame
                        if violence_detector is not None and person_count > 0:
                            try:
                                small = cv2.resize(frame, (128, 128), interpolation=cv2.INTER_AREA)
                                vr = violence_detector.add_frame(small)
                                if vr["status"] == "ready" and vr.get("is_violence"):
                                    if "violence-detected" not in triggered_alerts:
                                        triggered_alerts.append("violence-detected")
                            except Exception as e:
                                logger.debug(f"BG violence detection error: {e}")

                        # Fire detection on this frame
                        if fire_detector is not None and fire_detector.is_ready:
                            try:
                                fr = await asyncio.get_event_loop().run_in_executor(
                                    None, fire_detector.classify_frame, frame
                                )
                                if fr["is_fire"] and "fire-detected" not in triggered_alerts:
                                    triggered_alerts.append("fire-detected")
                            except Exception as e:
                                logger.debug(f"BG fire detection error: {e}")

                        # Save triggered alerts to persistent store
                        for alert_type in triggered_alerts:
                            if self._should_alert(cam_id, alert_type):
                                self._record_alert_time(cam_id, alert_type)
                                severity = ALERT_SEVERITY.get(alert_type, "medium")

                                # Get best confidence for this alert type
                                best_conf = 0.0
                                for d in dets:
                                    if d.conf > best_conf:
                                        best_conf = d.conf

                                alert_store.save_alert(
                                    camera_id=cam_id,
                                    camera_name=cam_name,
                                    alert_type=alert_type,
                                    severity=severity,
                                    confidence=best_conf,
                                    detections=det_dicts,
                                    source_url=cam_url,
                                    metadata={
                                        "inference_ms": infer_ms,
                                        "person_count": person_count,
                                        "cycle": self._cycle_count,
                                    },
                                )

                        if self._cycle_count % 10 == 0 and cam == self._cameras[0]:
                            logger.info(
                                f"[BG Monitor] Cycle #{self._cycle_count} | "
                                f"{self._successful_detections} detections | "
                                f"{self._errors} errors"
                            )

                    except Exception as e:
                        self._errors += 1
                        logger.warning(f"[BG Monitor] Error processing {cam_name}: {e}")

                    # Small delay between cameras to avoid overwhelming the system
                    await asyncio.sleep(1)

                # Wait for next cycle
                cycle_elapsed = time.time() - cycle_start
                wait_time = max(1, MONITOR_INTERVAL - cycle_elapsed)
                await asyncio.sleep(wait_time)

            except asyncio.CancelledError:
                logger.info("[BG Monitor] Loop cancelled, shutting down")
                break
            except Exception as e:
                logger.error(f"[BG Monitor] Unexpected error in main loop: {e}")
                await asyncio.sleep(10)

        logger.info("[BG Monitor] Loop exited")


# Global singleton
background_monitor = BackgroundMonitor()
