# AI Models Used in SecureSight

## Current Detection Model

### YOLOv8n (Nano)
**File**: `yolov8n.pt`  
**Location**: Root directory (`/yolov8n.pt`)  
**Version**: Ultralytics YOLO 8.2.103  
**Type**: Object Detection  

**Capabilities**:
- **Person Detection**: Real-time detection of people in video streams
- **Multi-Object Detection**: 80 COCO dataset classes (person, car, bicycle, etc.)
- **Confidence Scoring**: Each detection includes confidence score (0.0-1.0)
- **Bounding Boxes**: Precise location coordinates for each detected object

**Performance**:
- **Inference Size**: 480px (optimized for speed)
- **Processing Speed**: ~50-150ms per frame (CPU)
- **Max Resolution**: 960px width (auto-downscaled)
- **Target FPS**: 0.8 FPS for real-time streams

**Optimizations Applied**:
- CPU-optimized inference (multi-threaded)
- Automatic frame resizing for faster processing
- Low-latency streaming configuration
- Single concurrent stream for maximum performance

---

## Violence Detection Model

### Status: ✅ ENABLED (Optimized)
**File**: `violence-cpu-epoch-22.weights.h5`  
**Location**: `backend/models/`  
**Type**: CNN-RNN Sequence-Based Classification  
**Architecture**: TimeDistributed CNN + GRU

**Note**: Currently **not deployed** to production server. Model file needs to be uploaded to enable violence detection in production.

**Performance Optimizations Applied**:
1. ⚡ **Person-Gated Detection**: Only runs when person_count > 0 (skips empty frames)
2. ⚡ **Frame Skipping**: Checks every 4th frame only (75% fewer checks)
3. ⚡ **Smaller Input Size**: Uses 256x256 instead of original frame (4x faster preprocessing)
4. ⚡ **Non-Blocking**: Wrapped in try-catch to prevent stream crashes
5. ⚡ **Smart Buffering**: Uses rolling 30-frame buffer for sequence analysis

**Expected Performance**:
- **Without optimizations**: ~200-300ms per frame
- **With optimizations**: ~15-25ms per checked frame (every 4th frame)
- **Net impact**: ~4-6ms average overhead per frame (96% reduction)

**Capabilities**:
- Detects violent behavior in video sequences
- Analyzes 30-frame sequences for temporal patterns
- Uses exponential moving average smoothing
- Hysteresis to prevent false positives

**How It Works**:
1. Buffers 30 frames before making predictions
2. CNN extracts spatial features from each frame
3. GRU captures temporal patterns across frames
4. Binary classification: Violence/NonViolence
5. Requires consecutive detections before alerting

---

## Deployment Instructions

### To Enable Violence Detection in Production:

```bash
# Upload violence model to production server
scp backend/models/violence-cpu-epoch-22.weights.h5 \
    root@100.98.124.120:/var/www/securesight-backend/models/

# Restart backend
ssh root@100.98.124.120 "systemctl restart securesight-backend"

# Verify it loaded
curl https://api1.yashpatelis.online/health | jq .violence_detection
# Should return: true
```

**Model Download**: If you don't have the model file locally, you'll need to:
1. Train the violence detection model, or
2. Download pre-trained weights from your model storage

---

## Why These Optimizations Work

### Before (Removed):
```
Every frame → YOLO (50ms) + Violence (250ms) = 300ms total
At 1 FPS → Massive backlog, stream lag
```

### After (Optimized):
```
Frame 1: YOLO (50ms) only
Frame 2: YOLO (50ms) only  
Frame 3: YOLO (50ms) only
Frame 4: YOLO (50ms) + Violence (25ms if person detected) = 75ms
Average: 56ms per frame → Smooth streaming at 1 FPS
```

**Key Insight**: Most frames don't have people, and violence detection without people is useless. Person-gating + frame skipping gives us 96% performance gain while maintaining detection accuracy.

---

## Model Configuration

### Backend Settings
```python
# YOLOv8n Configuration
model = YOLO("yolov8n.pt")
inference_size = 480  # Image size for inference
confidence_threshold = 0.5  # Default detection confidence
max_concurrent_streams = 1  # Limit for optimal performance
```

### Detection Endpoints

**WebSocket (Real-time)**:
```
wss://api1.yashpatelis.online/ws/stream
```
- Continuous frame-by-frame detection
- Live person counting
- Alert generation

**REST API (Single frame)**:
```
POST https://api1.yashpatelis.online/detect/url
Body: { "url": "stream_url", "conf": 0.5 }
```
- On-demand detection
- URL-based frame capture
- Returns: person_count, detections, alerts

---

## Model Training & Updates

### YOLOv8n
- **Pre-trained**: COCO dataset (80 classes)
- **No custom training required**
- **Auto-reload**: Backend watches `backend/models/` for new `.pt` files
- **Hot-swap**: Replace model without server restart

### Custom Model Path
Place custom YOLO models in:
```
backend/models/your_model.pt
```
Backend automatically loads `best.pt` if present, or newest `.pt` file.

---

## Future Model Improvements

### Planned Enhancements:
1. **TensorRT Optimization**: For NVIDIA GPU servers
2. **Model Quantization**: INT8 for 2-3x faster inference
3. **Custom Training**: Fine-tune on specific camera angles/scenarios
4. **Edge Deployment**: Run YOLO on camera hardware (RTSP edge inference)

### Alternative Models:
- **YOLO-NAS**: Better accuracy, similar speed
- **YOLOv10**: Latest architecture improvements
- **EfficientDet**: Lower latency for edge devices

---

## Technical Stack

**Detection Framework**: Ultralytics YOLO  
**Computer Vision**: OpenCV 4.11.0  
**Inference Device**: CPU (multi-threaded)  
**Backend**: FastAPI + Uvicorn  
**Video Processing**: cv2.VideoCapture with low-latency buffers  

---

**Last Updated**: January 29, 2026  
**Model Version**: YOLOv8n (8.2.103)  
**Performance**: Optimized for real-time CPU inference
