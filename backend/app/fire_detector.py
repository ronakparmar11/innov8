"""Fire & smoke detection using a fine-tuned YOLOv8s model.

Model source: touati-kamel/yolov8s-forest-fire-detection (Hugging Face)
Auto-downloads the ~22MB model on first run.
"""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path
from typing import Dict, List

import cv2
import numpy as np

logger = logging.getLogger(__name__)

MODEL_URL = "https://huggingface.co/touati-kamel/yolov8s-forest-fire-detection/resolve/main/model.pt"
MODEL_FILENAME = "fire_yolov8s.pt"


class FireDetector:
    """YOLOv8-based fire & smoke detection."""

    def __init__(self, models_dir: str | Path):
        from ultralytics import YOLO

        models_dir = Path(models_dir)
        model_path = models_dir / MODEL_FILENAME

        if not model_path.exists():
            logger.info("⬇️  Downloading YOLOv8 fire detection model (~22MB)...")
            result = subprocess.run(
                ["curl", "-L", "-k", "--retry", "3", "--max-time", "120",
                 "-o", str(model_path), MODEL_URL],
                capture_output=True, text=True, timeout=150,
            )
            if result.returncode != 0 or not model_path.exists():
                raise RuntimeError(f"Failed to download fire model: {result.stderr[:200]}")
            logger.info("✅ Fire model downloaded")

        self._model = YOLO(str(model_path))
        self.fire_threshold = 0.35  # Lowered: catches small flames like matches/lighters
        self._ready = True

        # Log class names
        names = self._model.names if hasattr(self._model, "names") else {}
        logger.info(f"🔥 Fire detection enabled (YOLOv8s, classes={names}, threshold={self.fire_threshold})")

    @property
    def is_ready(self) -> bool:
        return self._ready

    def classify_frame(self, frame: np.ndarray) -> Dict:
        """Run fire/smoke detection on a BGR frame.

        Returns dict with is_fire, fire_confidence, detections list.
        """
        results = self._model(frame, conf=self.fire_threshold, verbose=False)

        fire_conf = 0.0
        detections: List[Dict] = []

        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                name = self._model.names.get(cls_id, f"class_{cls_id}").lower()
                xyxy = box.xyxy[0].tolist()

                detections.append({
                    "class": name,
                    "confidence": conf,
                    "box": xyxy,
                })

                if "fire" in name and conf > fire_conf:
                    fire_conf = conf

        return {
            "is_fire": fire_conf >= self.fire_threshold,
            "fire_confidence": fire_conf,
            "no_fire_confidence": 1.0 - fire_conf,
            "detections": detections,
        }
