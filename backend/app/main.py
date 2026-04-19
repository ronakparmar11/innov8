"""FastAPI app with automatic YOLO model discovery & hot reloading.

Features:
- Real-time IP camera stream processing via WebSocket
- Automatic YOLO model discovery from backend/models/
- Hot-reload when models are updated (no restart needed)
- Multi-camera support with concurrent stream processing
- Comprehensive threat detection (weapons, fire, intrusion, etc.)
- REST API for single-image detection
- **Optimized**: skip-on-idle, delta-only WS messages, larger frame skipping

Usage:
  1. Place *.pt model files into backend/models/
  2. Start server: uvicorn app.main:app --reload
  3. Connect from frontend via WebSocket to /ws/stream
  4. Send: {"url": "http://ip:port/videofeed", "desired_fps": 1.5, "detection_conf": 0.5}
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel
import cv2
import asyncio
from typing import List, Optional, Dict
import time
import threading
from ultralytics import YOLO
import onnxruntime as ort
import numpy as np
import os
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError
from .alert_manager import alert_manager
from .violence_detector import ViolenceDetector
from .fire_detector import FireDetector
from .action_detector import ActionBehaviorDetector
from .alert_store import alert_store
from .background_monitor import background_monitor, load_cameras, save_cameras
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEFAULT_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
MODELS_DIR = Path(os.getenv("YOLO_MODELS_DIR", Path(__file__).resolve().parent.parent / "models"))
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Violence detection model path - UPDATED TO USE YOLO_BEST.H5
VIOLENCE_MODEL_PATH = MODELS_DIR / "yolo_best.h5"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan handler replacing deprecated on_event('startup')."""
    watcher_task = asyncio.create_task(_watch_models())
    # Start background monitor — runs 24/7 on ALL cameras
    background_monitor.start()
    logger.info("🟢 Background monitor started — detection runs independently of frontend")
    yield
    # Shutdown
    background_monitor.stop()
    watcher_task.cancel()
    try:
        await watcher_task
    except asyncio.CancelledError:
        pass

app = FastAPI(title="SecureSight Backend", version="0.4.0", default_response_class=ORJSONResponse, lifespan=lifespan)

# Add gzip compression middleware
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IPStreamRequest(BaseModel):
    url: str
    desired_fps: Optional[float] = 2.0
    detection_conf: Optional[float] = 0.5
    tracking: Optional[bool] = False

class Detection(BaseModel):
    cls: int
    name: str
    conf: float
    box: List[float]

class FrameDetections(BaseModel):
    ts: float
    inference_ms: float
    detections: List[Detection]
    alerts: List[str] = []
    person_count: int = 0

model_lock = threading.Lock()
model: YOLO | None = None
loaded_model_path: Path | None = None
loaded_model_mtime: float | None = None
model_name_cache: Dict[int, str] = {}  # Cache class name lookups
onnx_session: ort.InferenceSession | None = None
onnx_input_name: str | None = None
onnx_output_names: List[str] = []
model_type: str = "torch"  # "torch" or "onnx"

MAX_CONCURRENT_STREAMS = int(os.getenv("MAX_CONCURRENT_STREAMS", "1"))

# Violence detection model (loaded on startup if available)
violence_detector: ViolenceDetector | None = None

# Fire detection model (auto-downloaded on first run)
fire_detector: FireDetector | None = None

# ── URL detect result cache (avoids re-opening cv2.VideoCapture) ──
_url_detect_cache: Dict[str, tuple] = {}  # key → (result_dict, timestamp)
_URL_CACHE_TTL = 12.0  # seconds

def _get_class_name(model: YOLO, cls_id: int) -> str:
    """Cache class name lookups to avoid repeated dict access."""
    if cls_id not in model_name_cache and hasattr(model, 'names'):
        model_name_cache[cls_id] = model.names.get(cls_id, str(cls_id))
    return model_name_cache.get(cls_id, str(cls_id))

FIRE_MODEL_NAME = "fire_yolov8s.pt"

def _list_model_files() -> list[Path]:
    return sorted([p for p in MODELS_DIR.glob("*.pt") if p.is_file() and p.name != FIRE_MODEL_NAME])

def _select_preferred_model() -> Path | None:
    files = _list_model_files()
    if not files:
        return None
    for f in files:
        if f.name.lower() == "best.pt":
            return f
    return max(files, key=lambda p: p.stat().st_mtime)

def _effective_initial_model() -> Path:
    pref = _select_preferred_model()
    return pref if pref else Path(DEFAULT_MODEL_PATH)

def _load_model_at(path: Path):
    global model, loaded_model_path, loaded_model_mtime, model_name_cache
    with model_lock:
        import torch
        num_threads = os.cpu_count() or 4
        torch.set_num_threads(num_threads)
        torch.set_num_interop_threads(min(num_threads, 4))
        
        # Expert Optimization: Check for ONNX model first for high-performance CPU inference
        onnx_path = path.with_suffix('.onnx')
        if onnx_path.exists():
            global onnx_session, onnx_input_name, onnx_output_names, model_type
            providers = ['CPUExecutionProvider']
            sess_options = ort.SessionOptions()
            sess_options.intra_op_num_threads = num_threads
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            
            logger.info(f"🚀 Loading optimized ONNX model: {onnx_path.name}")
            # Loading YOLO with ONNX model path allows ultralytics to handle post-processing 
            # while using ONNX Runtime for the heavy lifting.
            model = YOLO(str(onnx_path), task='detect')
            model_type = "onnx"
        else:
            model = YOLO(str(path))
            model_type = "torch"
            
        loaded_model_path = path
        model_name_cache.clear()
        try:
            loaded_model_mtime = path.stat().st_mtime
        except Exception:
            loaded_model_mtime = None
        logger.info(f"✅ Model loaded: {path.name} (Type: {model_type}, CPU threads: {num_threads})")

# Global instances
violence_detector: ViolenceDetector | None = None
fire_detector: FireDetector | None = None
action_detector: ActionBehaviorDetector = ActionBehaviorDetector()

# Task 2: Face covering detection (Haar Cascade)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

def load_or_init_model():
    global violence_detector, fire_detector
    if model is None:
        _load_model_at(_effective_initial_model())
    if violence_detector is None and VIOLENCE_MODEL_PATH.exists():
        try:
            violence_detector = ViolenceDetector(str(VIOLENCE_MODEL_PATH))
            logger.info(f"✅ Violence detection enabled: {VIOLENCE_MODEL_PATH}")
        except Exception as e:
            logger.warning(f"⚠️ Violence detection model load failed: {e}")
            violence_detector = None
    if fire_detector is None:
        try:
            fire_detector = FireDetector(MODELS_DIR)
            logger.info("✅ Fire detection enabled (FireNet CNN)")
        except Exception as e:
            logger.warning(f"⚠️ Fire detection model load failed: {e}")
            fire_detector = None

load_or_init_model()

active_streams = {}
active_stream_lock = threading.Lock()


# ── Helper: run YOLO on a single frame (shared by stream_worker + REST) ──
def _run_detection(frame: np.ndarray, detection_conf: float) -> tuple:
    """Enhanced YOLO inference for CPU-only small object detection (Knife/Weapon)."""
    h, w = frame.shape[:2]
    
    # ── Pass 1: Fast Global Detection (320x320) ──
    global_size = 320
    frame_global = cv2.resize(frame, (global_size, global_size), interpolation=cv2.INTER_LINEAR)
    
    with model_lock:
        current_model = model
    if current_model is None:
        return [], 0.0, 0
        
    t0 = time.time()
    results = current_model.predict(
        frame_global, 
        verbose=False, 
        conf=0.35, # Aggressive threshold as requested
        iou=0.30,  # Lower IoU for overlapping objects
        device='cpu', 
        imgsz=global_size
    )
    
    dets: List[Detection] = []
    has_weapon = False
    
    if results and len(results) > 0:
        boxes = results[0].boxes
        if boxes is not None:
            for b in boxes:
                cls_id = int(b.cls.item())
                conf = float(b.conf.item())
                x1, y1, x2, y2 = b.xyxy[0].tolist()
                
                # Scale back to original
                x1 *= (w / global_size); y1 *= (h / global_size)
                x2 *= (w / global_size); y2 *= (h / global_size)
                
                name = _get_class_name(current_model, cls_id)
                if name.lower() in ["knife", "weapon"]:
                    has_weapon = True
                dets.append(Detection(cls=cls_id, name=name, conf=conf, box=[x1, y1, x2, y2]))

    # ── Pass 2: ROI Zoom Fallback (Highly sensitive 416x416 crop) ──
    # If no weapons found in global pass, we zoom into the center ROI 
    # to catch small/thin objects like knives near the subject's face/hands.
    if not has_weapon:
        # Define Center ROI (Center 70% of the frame)
        roi_scale = 0.7
        roi_w, roi_h = int(w * roi_scale), int(h * roi_scale)
        x_start, y_start = (w - roi_w) // 2, (h - roi_h) // 2
        roi_frame = frame[y_start : y_start + roi_h, x_start : x_start + roi_w]
        
        # Preprocessing: Sharpness enhancement for thin edges
        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
        roi_frame = cv2.filter2D(roi_frame, -1, kernel)
        
        # Inference at 320x320 (Matches static ONNX requirement)
        roi_size = 320
        roi_input = cv2.resize(roi_frame, (roi_size, roi_size), interpolation=cv2.INTER_CUBIC)
        
        roi_results = current_model.predict(
            roi_input, 
            verbose=False, 
            conf=0.30, # Even more sensitive in ROI
            imgsz=roi_size,
            device='cpu'
        )
        
        if roi_results and len(roi_results) > 0:
            roi_boxes = roi_results[0].boxes
            if roi_boxes is not None:
                for b in roi_boxes:
                    cls_id = int(b.cls.item())
                    name = _get_class_name(current_model, cls_id)
                    # Only add if we found a small object of interest
                    if name.lower() in ["knife", "weapon", "scissors"]:
                        conf = float(b.conf.item())
                        rx1, ry1, rx2, ry2 = b.xyxy[0].tolist()
                        
                        # Map ROI coordinates back to global frame
                        fx1 = (rx1 * (roi_w / roi_size)) + x_start
                        fy1 = (ry1 * (roi_h / roi_size)) + y_start
                        fx2 = (rx2 * (roi_w / roi_size)) + x_start
                        fy2 = (ry2 * (roi_h / roi_size)) + y_start
                        
                        dets.append(Detection(cls=cls_id, name=name, conf=conf, box=[fx1, fy1, fx2, fy2]))

    person_count = sum(1 for d in dets if d.name.lower() == "person")
    
    # ── Layer 2: Hand-Region Focused Behavior Analysis ──
    # Approximating 'Hand Region' via Person Bounding Box (Upper 50%)
    primary_person = next((d for d in dets if d.name.lower() == "person"), None)
    m_score, s_val, is_aggro = 0, 0.0, False
    
    if primary_person:
        bx1, by1, bx2, by2 = [int(v) for v in primary_person.box]
        # Clipping to image bounds
        bx1, by1 = max(0, bx1), max(0, by1)
        bx2, by2 = min(w, bx2), min(h, by2)
        
        # Focus on upper body (where hands/weapons likely are)
        roi_y2 = int(by1 + (by2 - by1) * 0.5)
        # Ensure ROI has a minimum height to avoid empty arrays
        if roi_y2 <= by1: roi_y2 = by1 + 1
        
        roi = frame[by1:roi_y2, bx1:bx2]
        
        if roi.size > 0:
            active, m_score, s_val = action_detector.analyze(roi)
            
            # Tiered Hand-Region Alerts (Fusion Logic)
            if m_score > 20000 and s_val > 2.5:
                dets.append(Detection(cls=1000, name="Action-Violent", conf=0.9, box=[bx1, by1, bx2, roi_y2]))
                print(f"!!! ALERT: Violent Action (Hand Region) score={m_score} !!!")
            elif m_score > 15000 or s_val > 2.0:
                dets.append(Detection(cls=1001, name="Action-Aggressive", conf=0.8, box=[bx1, by1, bx2, roi_y2]))
                print(f"!!! ALERT: Aggressive Behavior (Hand Region) score={m_score} !!!")
            elif m_score > 8000:
                dets.append(Detection(cls=1002, name="Action-Suspicious", conf=0.6, box=[bx1, by1, bx2, roi_y2]))
                print(f"!!! ALERT: Suspicious Movement (Hand Region) score={m_score} !!!")
            
            # ── Task 2: Mask / Face-Cover Detection ──
            # Heuristic: Person detected but Face NOT detected in Upper ROI
            gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray_roi, 1.1, 5, minSize=(30, 30))
            face_detected = len(faces) > 0
            
            mask_flag = not face_detected
            
            # Avoid false positives: Only flag mask if we also see significant motion (active threat)
            # or if it's a very clear person detection.
            if mask_flag and m_score > 2000:
                dets.append(Detection(cls=1003, name="Action-Masked", conf=0.8, box=[bx1, by1, bx2, roi_y2]))
                print(f"!!! ALERT: Face Covered / Suspicious (Mask) detected !!!")

            print(f"[Behavior] ROI motion: {m_score} | Spike: {s_val:.2f} | Face Detected: {face_detected}")
    else:
        # Fallback to full-frame motion if no person is detected
        active, m_score, s_val = action_detector.analyze(frame)
        if m_score > 20000:
             dets.append(Detection(cls=1001, name="High-Motion", conf=0.9, box=[0,0,0,0]))
    
    infer_ms = (time.time() - t0) * 1000.0
    names = [d.name for d in dets]
    print(f"[HYBRID] YOLO: {names} | Motion: {m_score} | Spike: {s_val:.2f}")

    return dets, infer_ms, person_count


def _try_fetch_mjpeg_frame(url: str, timeout_s: float = 10.0) -> np.ndarray | None:
    """Read a single JPEG frame from an MJPEG (multipart) HTTP stream."""
    try:
        req = Request(url, headers={"User-Agent": "SecureSight/1.0"})
        with urlopen(req, timeout=timeout_s) as resp:
            # Read enough data to get one JPEG frame from the multipart stream
            buf = b""
            max_read = 512_000  # 512 KB max for a single frame
            jpeg_start = -1
            while len(buf) < max_read:
                chunk = resp.read(4096)
                if not chunk:
                    break
                buf += chunk
                # Look for JPEG start marker (FFD8) and end marker (FFD9)
                if jpeg_start < 0:
                    jpeg_start = buf.find(b"\xff\xd8")
                if jpeg_start >= 0:
                    jpeg_end = buf.find(b"\xff\xd9", jpeg_start + 2)
                    if jpeg_end >= 0:
                        jpeg_data = buf[jpeg_start : jpeg_end + 2]
                        np_arr = np.frombuffer(jpeg_data, np.uint8)
                        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                        return img
        return None
    except Exception as e:
        logger.info(f"MJPEG frame fetch failed for {url}: {e}")
        return None


def _try_fetch_snapshot(url: str, timeout_s: float = 8.0) -> np.ndarray | None:
    """Fetch a single JPEG/PNG snapshot or MJPEG frame over HTTP(S).
    
    Supports:
    - Direct JPEG/PNG image URLs (e.g. /api/frame.jpeg, /snapshot.jpg)
    - MJPEG streams (e.g. /api/stream.mjpeg) — extracts first frame
    - Any HTTP URL that returns image content-type
    """
    lowered = url.lower()
    is_http = lowered.startswith("http://") or lowered.startswith("https://")
    if not is_http:
        return None

    # Check if this is an MJPEG stream endpoint
    is_mjpeg = any(x in lowered for x in [".mjpeg", ".mjpg", "stream.mjpeg", "mjpeg", "/video"])
    if is_mjpeg:
        return _try_fetch_mjpeg_frame(url, timeout_s=timeout_s)

    # Check if URL looks like a direct image snapshot
    looks_like_image = any(
        x in lowered
        for x in [".jpg", ".jpeg", ".png", "frame.jpeg", "snapshot"]
    )
    if not looks_like_image:
        return None

    try:
        req = Request(url, headers={"User-Agent": "SecureSight/1.0"})
        with urlopen(req, timeout=timeout_s) as resp:
            data = resp.read()
        np_arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        return img
    except (URLError, TimeoutError, ValueError) as e:
        logger.info(f"Snapshot fetch failed for {url}: {e}")
        return None


async def stream_worker(stream_id: str, url: str, desired_fps: float, detection_conf: float, websocket: WebSocket):
    """
    Process IP camera stream and send real-time detections via WebSocket.
    **Optimized**: only sends a message when detections change (delta mode).
    """
    cap = None
    retry_count = 0
    max_retries = 3

    while retry_count < max_retries and (cap is None or not cap.isOpened()):
        try:
            cap = cv2.VideoCapture(url)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            if cap.isOpened():
                break
        except Exception as e:
            retry_count += 1
            if retry_count >= max_retries:
                await websocket.send_json({"error": f"Unable to open stream {url} after {max_retries} retries: {str(e)}"})
                return
            await asyncio.sleep(1)

    if not cap or not cap.isOpened():
        await websocket.send_json({"error": f"Unable to open stream {url}"})
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    logger.info(f"[{stream_id}] Stream opened: {url} ({width}x{height} @ {fps}fps)")

    interval = 1.0 / desired_fps if desired_fps > 0 else 0.5
    frame_count = 0
    error_count = 0
    max_errors = 10
    prev_det_signature: str = ""  # Track detection changes to skip duplicate sends
    idle_send_counter = 0  # Force a heartbeat every N idle cycles
    
    # Adaptive Inference: Motion Detection State
    prev_gray = None
    motion_skip_counter = 0

    try:
        while True:
            start_time = time.time()
            ret, frame = cap.read()

            if not ret:
                error_count += 1
                if error_count >= max_errors:
                    await websocket.send_json({"error": f"Stream read failed {max_errors} times, stopping"})
                    break
                cap.release()
                await asyncio.sleep(2)
                cap = cv2.VideoCapture(url)
                if not cap.isOpened():
                    await websocket.send_json({"error": "Stream disconnected, reconnection failed"})
                    break
                continue

            error_count = 0
            frame_count += 1

            # ── Adaptive Frame Processing ──
            # If a person was detected in the last cycle, we process EVERY frame
            # Otherwise, we skip frames to save CPU resources.
            is_high_activity = getattr(websocket, "last_person_count", 0) > 0
            skip_rate = 1 if is_high_activity else 3
            
            if frame_count % skip_rate != 0:
                continue

            # ── Adaptive Inference logic (Motion Detection) ──
            # Resize for fast comparison
            small_gray = cv2.cvtColor(cv2.resize(frame, (160, 160)), cv2.COLOR_BGR2GRAY)
            if prev_gray is not None:
                diff = cv2.absdiff(prev_gray, small_gray)
                motion_score = np.sum(diff > 20)
                # If motion is very low, skip AI processing but don't skip the whole loop
                # This keeps the stream active and the background updated
                if motion_score < 500: # Threshold for 160x160 frame
                    motion_skip_counter += 1
                    prev_gray = small_gray
                    # Force process every 30th skip to maintain fresh state
                    if motion_skip_counter < 30:
                        await asyncio.sleep(0.01) # Small yield
                        continue
            
            prev_gray = small_gray
            motion_skip_counter = 0

            # ── Hybrid Multi-Model Fusion Layer ──
            # This now utilizes the unified hybrid _run_detection logic
            dets, infer_ms, person_count = _run_detection(frame, 0.35)
            setattr(websocket, "last_person_count", person_count)

            # Get alerts (Object-based + Behavioral-based from _run_detection)
            alerts = alert_manager.check([d.model_dump() for d in dets], source_key=stream_id)

            # Extra Layer: CNN Scene Classification (Sequence-based)
            cnn_triggered = False
            if violence_detector is not None and frame_count % 6 == 0:
                try:
                    small = cv2.resize(frame, (128, 128), interpolation=cv2.INTER_AREA)
                    vr = violence_detector.add_frame(small)
                    if vr["status"] == "ready":
                        cnn_conf = float(vr.get("violence_confidence", 0.0))
                        print(f">>> DEBUG [CNN]: confidence={cnn_conf:.2f}")
                        
                        # LOWERED THRESHOLD: 0.3 as requested
                        if cnn_conf > 0.3:
                            cnn_triggered = True
                            if "violence-detected" not in alerts:
                                alerts.append("violence-detected")
                            dets.append(Detection(cls=999, name="Violence-Scene", conf=cnn_conf, box=[0, 0, 0, 0]))
                except Exception as e:
                    logger.warning(f"Violence detection error: {e}")

            # Fire detection — every 4th frame
            if fire_detector is not None and fire_detector.is_ready and frame_count % 4 == 0:
                try:
                    fr = fire_detector.classify_frame(frame)
                    if fr["is_fire"]:
                        alerts.append("fire-detected")
                    for fd in fr.get("detections", []):
                        dets.append(Detection(cls=998, name=fd["class"], conf=float(fd["confidence"]), box=fd["box"]))
                except Exception as e:
                    logger.warning(f"Fire detection error: {e}")

            # ── Delta check: only send if something changed ──
            det_sig = "|".join(sorted(f"{d.name}:{d.conf:.2f}" for d in dets)) + f"||{','.join(alerts)}"
            idle_send_counter += 1

            if det_sig != prev_det_signature or alerts or idle_send_counter >= 10:
                prev_det_signature = det_sig
                idle_send_counter = 0
                frame_msg = FrameDetections(
                    ts=time.time(),
                    inference_ms=infer_ms,
                    detections=dets,
                    alerts=alerts,
                    person_count=person_count,
                )
                await websocket.send_json(frame_msg.model_dump())

            if frame_count % 500 == 0:
                logger.info(f"[{stream_id}] {frame_count} frames, {infer_ms:.0f}ms inference")

            elapsed = time.time() - start_time
            sleep_time = interval - elapsed
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)

    except WebSocketDisconnect:
        logger.info(f"[{stream_id}] WebSocket disconnected")
    except Exception as e:
        logger.error(f"[{stream_id}] Exception: {e}")
        try:
            await websocket.send_json({"error": f"Exception: {e}"})
        except:
            pass
    finally:
        if cap:
            cap.release()
        active_streams.pop(stream_id, None)
        logger.info(f"[{stream_id}] Stream worker stopped")


@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    stream_id = f"s-{id(websocket)}"
    task = None
    try:
        init_msg = await websocket.receive_json()
        req = IPStreamRequest(**init_msg)
        with active_stream_lock:
            if len(active_streams) >= MAX_CONCURRENT_STREAMS:
                await websocket.send_json({"error": f"Server busy: max {MAX_CONCURRENT_STREAMS} stream(s)"})
                return
        task = asyncio.create_task(
            stream_worker(stream_id, req.url, req.desired_fps or 2.0, req.detection_conf or 0.5, websocket)
        )
        active_streams[stream_id] = task
        await task
    except WebSocketDisconnect:
        pass
    except asyncio.CancelledError:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass
    finally:
        if stream_id in active_streams:
            task = active_streams.pop(stream_id)
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass


@app.get("/health")
async def health():
    """Lightweight health check."""
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "current_model": str(loaded_model_path.name) if loaded_model_path else None,
        "active_streams": len(active_streams),
        "violence_detection": violence_detector is not None,
        "fire_detection": fire_detector is not None and fire_detector.is_ready,
        "background_monitor": background_monitor.get_status(),
        "total_persistent_alerts": alert_store.count_alerts(),
    }


@app.post("/detect", response_model=FrameDetections)
async def detect_image(file: UploadFile = File(...), conf: float = 0.5):
    """Single image detection endpoint."""
    data = await file.read()
    np_arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")
    dets, infer_ms, person_count = _run_detection(img, conf)
    return FrameDetections(ts=time.time(), inference_ms=infer_ms, detections=dets, alerts=[], person_count=person_count)


class URLDetectRequest(BaseModel):
    url: str
    conf: float = 0.5


class BatchDetectRequest(BaseModel):
    cameras: Dict[str, str]
    conf: float = 0.5


@app.post("/detect/url", response_model=FrameDetections)
async def detect_from_url(req: URLDetectRequest):
    """
    Detect objects from a camera URL.
    Results are cached for 12s to avoid re-opening VideoCapture on rapid polls.
    """
    cache_key = f"{req.url}:{req.conf}"
    now = time.time()

    # Return cached result if fresh
    cached = _url_detect_cache.get(cache_key)
    if cached and (now - cached[1]) < _URL_CACHE_TTL:
        return FrameDetections(**cached[0])

    # Snapshot fast-path (works for go2rtc /api/frame.jpeg)
    snapshot = _try_fetch_snapshot(req.url)
    if snapshot is not None:
        dets, infer_ms, person_count = _run_detection(snapshot, req.conf)
        alerts = alert_manager.check([d.model_dump() for d in dets], source_key=req.url)
        result = {
            "ts": now,
            "inference_ms": infer_ms,
            "detections": [d.model_dump() for d in dets],
            "alerts": alerts,
            "person_count": person_count,
        }
        _url_detect_cache[cache_key] = (result, now)
        return FrameDetections(**result)

    cap = None
    try:
        cap = cv2.VideoCapture(req.url)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail=f"Unable to open stream: {req.url}")
        ret, frame = cap.read()
        if not ret or frame is None:
            raise HTTPException(status_code=400, detail="Failed to capture frame")

        dets, infer_ms, person_count = _run_detection(frame, req.conf)
        alerts = alert_manager.check([d.model_dump() for d in dets], source_key=req.url)

        result = {
            "ts": now,
            "inference_ms": infer_ms,
            "detections": [d.model_dump() for d in dets],
            "alerts": alerts,
            "person_count": person_count,
        }
        _url_detect_cache[cache_key] = (result, now)

        # Evict stale cache entries periodically
        if len(_url_detect_cache) > 50:
            stale = [k for k, v in _url_detect_cache.items() if now - v[1] > _URL_CACHE_TTL * 2]
            for k in stale:
                del _url_detect_cache[k]

        return FrameDetections(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Detection from URL failed: {e}")
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")
    finally:
        if cap:
            cap.release()


@app.post("/detect/batch")
async def detect_batch(req: BatchDetectRequest):
    """Detect across multiple cameras in one request."""
    if not req.cameras:
        raise HTTPException(status_code=400, detail="cameras object required")

    now = time.time()
    response_payload: Dict[str, Dict] = {}

    for camera_id, url in req.cameras.items():
        cache_key = f"{url}:{req.conf}"
        cached = _url_detect_cache.get(cache_key)
        if cached and (now - cached[1]) < _URL_CACHE_TTL:
            cached_result = dict(cached[0])
            cached_result["alerts"] = alert_manager.check(
                cached_result.get("detections", []),
                source_key=f"camera:{camera_id}",
            )
            response_payload[camera_id] = cached_result
            continue

        # Snapshot fast-path
        snapshot = _try_fetch_snapshot(url)
        if snapshot is not None:
            try:
                dets, infer_ms, person_count = _run_detection(snapshot, req.conf)
                detections_dump = [d.model_dump() for d in dets]
                alerts = alert_manager.check(detections_dump, source_key=f"camera:{camera_id}")
                result = {
                    "ts": now,
                    "inference_ms": infer_ms,
                    "detections": detections_dump,
                    "alerts": alerts,
                    "person_count": person_count,
                }
                _url_detect_cache[cache_key] = (result, now)
                response_payload[camera_id] = result
                continue
            except Exception as e:
                response_payload[camera_id] = {"error": str(e)}
                continue

        cap = None
        try:
            cap = cv2.VideoCapture(url)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            if not cap.isOpened():
                response_payload[camera_id] = {"error": f"Unable to open stream: {url}"}
                continue

            ret, frame = cap.read()
            if not ret or frame is None:
                response_payload[camera_id] = {"error": "Failed to capture frame"}
                continue

            dets, infer_ms, person_count = _run_detection(frame, req.conf)
            detections_dump = [d.model_dump() for d in dets]
            alerts = alert_manager.check(detections_dump, source_key=f"camera:{camera_id}")

            result = {
                "ts": now,
                "inference_ms": infer_ms,
                "detections": detections_dump,
                "alerts": alerts,
                "person_count": person_count,
            }
            _url_detect_cache[cache_key] = (result, now)
            response_payload[camera_id] = result
        except Exception as e:
            response_payload[camera_id] = {"error": str(e)}
        finally:
            if cap:
                cap.release()

    return {"alerts": response_payload}


@app.get("/models")
async def list_models():
    return {
        "current": str(loaded_model_path) if loaded_model_path else None,
        "files": [p.name for p in _list_model_files()],
    }


class ReloadRequest(BaseModel):
    filename: Optional[str] = None


@app.post("/models/reload")
async def reload_model(req: ReloadRequest):
    if req.filename:
        candidate = MODELS_DIR / req.filename
        if not candidate.exists():
            raise HTTPException(status_code=404, detail="Model file not found")
        target = candidate
    else:
        target = _select_preferred_model()
        if target is None:
            raise HTTPException(status_code=400, detail="No model files available")
    try:
        _load_model_at(target)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model: {e}")
    return {"reloaded": str(target)}


@app.get("/alerts/rules")
async def list_alert_rules():
    return {"rules": alert_manager.list_rules()}


@app.get("/alerts/demo")
async def demo_alerts():
    """Generate demo detections to test alert system without cameras."""
    import random
    
    demo_scenarios = {
        "person": [
            {"name": "person", "conf": 0.85, "bbox": [100, 100, 200, 300]},
        ],
        "weapon": [
            {"name": "person", "conf": 0.82, "bbox": [50, 80, 150, 280]},
            {"name": "knife", "conf": 0.75, "bbox": [120, 150, 140, 180]},
        ],
        "fire": [
            {"name": "fire", "conf": 0.91, "bbox": [200, 200, 350, 400]},
        ],
        "multiple_people": [
            {"name": "person", "conf": 0.88, "bbox": [50, 100, 150, 300]},
            {"name": "person", "conf": 0.84, "bbox": [200, 100, 300, 300]},
            {"name": "person", "conf": 0.79, "bbox": [350, 100, 450, 300]},
        ],
        "vehicle": [
            {"name": "car", "conf": 0.93, "bbox": [100, 150, 400, 350]},
        ],
    }
    
    scenario = random.choice(list(demo_scenarios.keys()))
    detections = demo_scenarios[scenario]
    
    # Test per-camera cooldown with two different cameras
    camera_id = random.choice(["demo_cam1", "demo_cam2"])
    alerts = alert_manager.check(detections, source_key=f"camera:{camera_id}")
    
    return {
        "scenario": scenario,
        "camera": camera_id,
        "detections": detections,
        "alerts": alerts,
        "note": "This is demo data to test alert system logic without real cameras",
    }


# ── Persistent Alert History Endpoints ─────────────────────────────────────────


@app.get("/alerts/history")
async def get_alert_history(
    limit: int = 100,
    offset: int = 0,
    camera_id: str | None = None,
    alert_type: str | None = None,
    severity: str | None = None,
    since: float | None = None,
    until: float | None = None,
):
    """Get persistent alert history. Alerts are NEVER deleted."""
    alerts = alert_store.get_alerts(
        limit=min(limit, 500),
        offset=offset,
        camera_id=camera_id,
        alert_type=alert_type,
        severity=severity,
        since=since,
        until=until,
    )
    total = alert_store.count_alerts(
        camera_id=camera_id,
        alert_type=alert_type,
        severity=severity,
        since=since,
    )
    return {"alerts": alerts, "total": total, "limit": limit, "offset": offset}


@app.get("/alerts/stats")
async def get_alert_stats():
    """Get alert statistics summary."""
    return alert_store.get_stats()


@app.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """Acknowledge an alert (mark as read, but never delete)."""
    ok = alert_store.acknowledge_alert(alert_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"acknowledged": True, "id": alert_id}


# ── Camera Config Endpoints (for background monitor) ───────────────────────────


@app.get("/cameras")
async def get_cameras():
    """Get the camera list used by the background monitor."""
    cameras = background_monitor.get_cameras()
    return {"cameras": cameras, "count": len(cameras)}


class UpdateCamerasRequest(BaseModel):
    cameras: List[Dict[str, str]]


@app.post("/cameras")
async def update_cameras(req: UpdateCamerasRequest):
    """Update the camera list. Background monitor picks up changes immediately."""
    background_monitor.update_cameras(req.cameras)
    return {"updated": True, "count": len(req.cameras)}


# ── Background Monitor Status ─────────────────────────────────────────────────


@app.get("/monitor/status")
async def monitor_status():
    """Get the 24/7 background monitor status."""
    return background_monitor.get_status()


@app.get("/streams")
async def list_active_streams():
    return {"count": len(active_streams), "streams": list(active_streams.keys())}


async def _watch_models(interval: int = 60):
    """Check for new model files every 60s (was 20s)."""
    global loaded_model_mtime
    while True:
        try:
            preferred = _select_preferred_model()
            if preferred:
                mtime = preferred.stat().st_mtime
                if loaded_model_path is None:
                    _load_model_at(preferred)
                elif loaded_model_path != preferred and (loaded_model_mtime is None or mtime > (loaded_model_mtime + 0.5)):
                    _load_model_at(preferred)
                elif loaded_model_mtime and mtime > (loaded_model_mtime + 0.5) and preferred == loaded_model_path:
                    _load_model_at(preferred)
        except Exception:
            pass
        await asyncio.sleep(interval)


# Startup logic is handled by the lifespan context manager above


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
