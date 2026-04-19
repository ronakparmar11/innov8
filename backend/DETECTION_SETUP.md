# Detection Script Setup Guide

## Overview

This backend processes IP camera streams in real-time using YOLO object detection models and sends threat alerts to the frontend via WebSocket.

## Architecture

```
┌─────────────────┐      WebSocket       ┌──────────────────┐
│   Frontend      │◄────────────────────►│   Backend        │
│   (Next.js)     │   /ws/stream         │   (FastAPI)      │
│                 │                      │                  │
│  /live page     │   IP Cam URL         │  YOLO Detection  │
│  IP Camera Feed │   ─────────────────► │  Alert Manager   │
└─────────────────┘                      └──────────────────┘
                                                   │
                                                   ▼
                                         ┌──────────────────┐
                                         │  Models Folder   │
                                         │  - best.pt       │
                                         │  - yolov8n.pt    │
                                         │  - weapon.pt     │
                                         └──────────────────┘
```

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Add YOLO Models

Place your YOLO models in `backend/models/`:

```bash
# Option 1: Download YOLOv8 nano (will auto-download on first run)
# No action needed - system downloads yolov8n.pt automatically

# Option 2: Download manually
cd models
wget https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt
wget https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8s.pt

# Option 3: Add your custom trained model
# Name it best.pt for automatic priority loading
cp /path/to/your/model.pt ./best.pt
```

### 3. Start the Backend

```bash
# From backend directory
python -m app.main

# OR using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# OR using the start script
chmod +x start.sh
./start.sh
```

### 4. Connect from Frontend

The frontend automatically connects when you:

1. Navigate to `/live` page
2. Add an IP camera with the "+ Add IP Camera" button
3. Enter the camera URL: `http://192.168.x.x:8080/videofeed`

The detection backend receives the stream URL via WebSocket and starts processing.

## How It Works

### WebSocket Flow

1. **Frontend connects** to `ws://localhost:8000/ws/stream`
2. **Sends initialization message**:
   ```json
   {
     "url": "http://192.168.0.192:8080/videofeed",
     "desired_fps": 1.5,
     "detection_conf": 0.5
   }
   ```
3. **Backend processes stream**:
   - Opens IP camera stream with OpenCV
   - Extracts frames at desired FPS
   - Runs YOLO detection on each frame
   - Checks alert rules for threats
4. **Sends detections back**:
   ```json
   {
     "ts": 1703789234.567,
     "inference_ms": 45.2,
     "detections": [
       {
         "cls": 0,
         "name": "person",
         "conf": 0.87,
         "box": [120, 340, 450, 680]
       }
     ],
     "alerts": ["person-unauthorized", "weapon-detected"]
   }
   ```

### Alert Rules

Defined in `alert_manager.py`:

| Alert ID              | Detects            | Severity | Description                 |
| --------------------- | ------------------ | -------- | --------------------------- |
| `weapon-detected`     | knife, weapon, gun | CRITICAL | Immediate security response |
| `person-unauthorized` | person             | HIGH     | Person in monitored area    |
| `fire-detected`       | fire, flame, smoke | CRITICAL | Emergency response needed   |
| `suspicious-object`   | backpack, suitcase | MEDIUM   | Unattended object           |
| `vehicle-detected`    | car, truck, bus    | LOW      | Vehicle monitoring          |

## Supported Stream Types

The backend supports all stream types that OpenCV can open:

- **MJPEG**: `http://ip:port/videofeed` (IP Webcam Android app)
- **MJPEG**: `http://ip:port/video.mjpg`
- **HTTP Video**: `http://ip:port/video.mp4`
- **RTSP**: `rtsp://username:password@ip:port/stream`
- **HLS**: `http://ip:port/stream.m3u8` (indirect support via opencv)

## API Endpoints

### Health Check

```bash
curl http://localhost:8000/health
```

### List Models

```bash
curl http://localhost:8000/models
```

### Reload Model

```bash
curl -X POST http://localhost:8000/models/reload
```

### List Alert Rules

```bash
curl http://localhost:8000/alerts/rules
```

### List Active Streams

```bash
curl http://localhost:8000/streams
```

### Single Image Detection

```bash
curl -X POST http://localhost:8000/detect \
  -F "file=@image.jpg" \
  -F "conf=0.5"
```

## Threat Detection Classes

Standard YOLO (COCO dataset) detects 80 classes including:

**Security-Relevant Classes:**

- `person` (cls: 0)
- `car`, `truck`, `bus` (cls: 2, 7, 5)
- `backpack`, `handbag`, `suitcase` (cls: 24, 26, 28)
- `knife` (cls: 43)
- `fire`, `smoke` (custom models needed)
- `weapon`, `gun` (custom models needed)

### Custom Models for Enhanced Detection

For specialized threats, train custom YOLO models:

```bash
# Train weapon detection model
yolo detect train data=weapon-dataset.yaml model=yolov8s.pt epochs=100

# Train fire detection model
yolo detect train data=fire-dataset.yaml model=yolov8n.pt epochs=50

# Save as best.pt and place in backend/models/
```

## Troubleshooting

### Issue: Stream won't connect

```bash
# Test stream URL directly with ffprobe
ffprobe "http://192.168.0.192:8080/videofeed"

# Test with OpenCV Python
python -c "import cv2; cap = cv2.VideoCapture('http://192.168.0.192:8080/videofeed'); print('Opened:', cap.isOpened())"
```

### Issue: Model not loading

```bash
# Check models directory
ls -la backend/models/

# Check backend logs for model loading messages
# Should see: "Loaded model from: backend/models/best.pt"
```

### Issue: No detections

- Lower `detection_conf` threshold (try 0.3 instead of 0.5)
- Check model quality (yolov8n is fast but less accurate)
- Verify lighting and camera angle
- Ensure objects are visible and not too small

### Issue: High CPU usage

- Reduce `desired_fps` (1.0 or 0.5 instead of 5.0)
- Use smaller model (yolov8n instead of yolov8l)
- Reduce camera resolution
- Process fewer concurrent streams

## Performance Tips

### Optimize FPS

```python
# Frontend: Lower FPS for multiple cameras
desired_fps: 1.0  # Process 1 frame per second
```

### Optimize Model Size

- `yolov8n.pt` - Fastest, ~6ms per frame (CPU)
- `yolov8s.pt` - Balanced, ~15ms per frame (CPU)
- `yolov8m.pt` - Good accuracy, ~30ms per frame (CPU)
- `yolov8l.pt` - Best accuracy, ~60ms per frame (CPU)

### Multi-Camera Setup

The backend supports multiple simultaneous streams:

```javascript
// Frontend can connect multiple cameras
// Each gets its own WebSocket and stream_worker
camera1: ws://localhost:8000/ws/stream  // → stream_id: s-123
camera2: ws://localhost:8000/ws/stream  // → stream_id: s-456
camera3: ws://localhost:8000/ws/stream  // → stream_id: s-789
```

## Environment Variables

```bash
# .env or export
YOLO_MODEL_PATH="yolov8n.pt"           # Fallback model
YOLO_MODELS_DIR="./backend/models"     # Model directory
UVICORN_HOST="0.0.0.0"                 # Server host
UVICORN_PORT="8000"                    # Server port
```

## Next Steps

1. ✅ Backend is ready and integrated with frontend
2. ✅ WebSocket communication established
3. ✅ Alert system configured
4. 📦 Add your custom models to `backend/models/`
5. 🎥 Connect IP cameras from `/live` page
6. 🔔 Alerts automatically appear in frontend UI

## Testing End-to-End

```bash
# Terminal 1: Start backend
cd backend
python -m app.main

# Terminal 2: Start frontend
cd ..
pnpm dev

# Browser: Navigate to http://localhost:3000/live
# 1. Click "+ Add IP Camera"
# 2. Enter: http://192.168.0.192:8080/videofeed
# 3. Watch detections appear in real-time!
```

## Support

- Backend logs show stream status and detection counts
- Frontend shows "AI Filter Online" badge when connected
- Check browser console for WebSocket connection status
- Monitor `http://localhost:8000/streams` to see active connections
