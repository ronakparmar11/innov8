# SecureSight Backend

Real-time threat detection backend for IP camera streams using YOLO object detection.

## 🚀 Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Start the server
python -m app.main

# OR use uvicorn with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The server will:

- Start on `http://localhost:8000`
- Auto-download YOLOv8n model if no models found
- Watch `backend/models/` for custom model files
- Accept WebSocket connections from frontend

Visit: http://localhost:8000/health  
Docs: http://localhost:8000/docs

## 📁 Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI server & WebSocket handler
│   ├── alert_manager.py     # Threat detection rules
│   └── __init__.py
├── models/                  # Place YOLO .pt files here
│   ├── README.md           # Model documentation
│   └── best.pt             # Your custom model (auto-loaded)
├── requirements.txt
├── start.sh
├── README.md               # This file
└── DETECTION_SETUP.md      # Detailed setup guide
```

## 🎯 Features

✅ **Real-time Detection**: Process IP camera streams via WebSocket  
✅ **Multi-Camera Support**: Handle multiple streams simultaneously  
✅ **Auto Model Loading**: Hot-reload models without restart  
✅ **Threat Alerts**: Weapons, fire, intrusion, suspicious objects  
✅ **REST API**: Single-image detection endpoint  
✅ **Flexible Streams**: MJPEG, RTSP, HLS, HTTP video

## 🔧 Configuration

### Add Custom Models

```bash
cd models
# Option 1: Use your trained model
cp /path/to/your/model.pt best.pt

# Option 2: Download YOLOv8 variants
wget https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8s.pt
```

### Environment Variables

````bash
export YOLO_MODEL_PATH="yolov8n.pt"          # Fallback model
## 🎥 WebSocket Usage

Connect to: `ws://localhost:8000/ws/stream`

Send initial configuration:
```json
{
  "url": "http://192.168.0.192:8080/videofeed",
  "desired_fps": 1.ts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health & model status |
| WS | `/ws/stream` | Real-time camera stream processing |
| POST | `/detect` | Single image detection |
| GET | `/models` | List available models |
| POST | `/models/reload` | Reload model manually |
| GET | `/alerts/rules` | List alert rules |
| GET | `/streams` | List active camera streams |
```json
{
  "url": "rtsp://user:pass@camera-ip/stream1",
Receive detections in real-time:
```json
{
  "ts": 1703789234.567,
  "inference_ms": 45.2,
  "detections": [
    {"cls": 0, "name": "person", "conf": 0.87, "box": [120, 340, 450, 680]}
  ],
  "alerts": ["person-unauthorized", "weapon-detected"]
}
````

📸 HTTP Image Detection

Test single-image detection:

```bash
curl -X POST http://localhost:8000/detect \
  -F "file=@test.jpg" \
  -F "conf=0.5"
```

## 🧪 Testing

```bash
# Check health
curl http://localhost:8000/health

# List active streams
curl http://localhost:8000/streams

# List alert rules
curl http://localhost:8000/alerts/rules

# List available models
curl http://localhost:8000/models
```

## 📚 Documentation

For detailed setup, troubleshooting, and custom model training:

👉 **[DETECTION_SETUP.md](./DETECTION_SETUP.md)** - Complete integration guide

## 🔗 Integration with Frontend

This backend integrates with the SecureSight frontend:

```javascript
// Frontend connects via WebSocket (see hooks/use-detection-alerts.ts)
const ws = new WebSocket("ws://localhost:8000/ws/stream");
ws.send(
  JSON.stringify({
    url: "http://192.168.0.192:8080/videofeed",
    desired_fps: 1.5,
    detection_conf: 0.5,
  }),
);
```

From the `/live` page:

1. Click "+ Add IP Camera"
2. Enter: `http://192.168.0.192:8080/videofeed`
3. Detection starts automatically

## 🐛 Troubleshooting

**Model not loading:**

```bash
ls -la models/  # Check for .pt files
```

**Stream won't connect:**

```bash
ffprobe "http://192.168.0.192:8080/videofeed"
```

**High CPU usage:**

- Reduce `desired_fps` to 1.0 or 0.5
- Use smaller model (yolov8n)
- Process fewer streams

## Environment Variables

| Variable          | Description                 | Default      |
| ----------------- | --------------------------- | ------------ |
| `YOLO_MODEL_PATH` | Path to YOLOv8 weights file | `yolov8n.pt` |

Place custom weights (e.g. `runs/detect/train/weights/best.pt`) and export `YOLO_MODEL_PATH` before launching.

## Notes

- For Apple Silicon (M1/M2), PyTorch wheels install automatically but if performance is low, consider `pip install torch==<metal build>` or enabling MPS: `export PYTORCH_ENABLE_MPS_FALLBACK=1`.
- Use smaller model (`yolov8n.pt`) for higher FPS; switch to `yolov8s.pt` / `yolov8m.pt` for accuracy.

## Roadmap Ideas

- JWT auth & API keys
- Redis / NATS event broadcasting
- Frame buffering & video clip export on alert
- Async batch processing / queue
- Optional on-frame annotation & MJPEG streaming

---

MIT License
