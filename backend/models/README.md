# YOLO Models Directory

Place your YOLO model files (`.pt`) here for threat detection.

## Recommended Models

### 1. **YOLOv8 (Default)**

- Download: `yolov8n.pt`, `yolov8s.pt`, `yolov8m.pt`, or `yolov8l.pt`
- Use: General object detection (person, vehicle, backpack, etc.)
- Download from: https://github.com/ultralytics/ultralytics

### 2. **Best Model (Priority)**

- Name your best-performing model as `best.pt`
- The system will automatically use this file if present

### 3. **Custom Trained Models**

- Add your custom-trained YOLO models for specific threats
- Examples: weapon detection, fire detection, PPE detection

## Auto-Loading Behavior

The backend automatically:

- Loads `best.pt` if present, otherwise uses the most recent `.pt` file
- Watches this directory every 20 seconds
- Hot-reloads when you add/update model files (no restart needed!)

## Quick Start

```bash
# Download YOLOv8 nano (smallest, fastest)
wget https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt

# OR download YOLOv8 small (better accuracy)
wget https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8s.pt

# OR let ultralytics download it automatically on first run
# Just start the backend and it will download yolov8n.pt to cache
```

## Model Priority

1. `best.pt` (if exists)
2. Most recently modified `.pt` file
3. Falls back to `yolov8n.pt` (downloads automatically if not found)

## Example Structure

```
backend/models/
├── best.pt              # Custom trained model (highest priority)
├── yolov8n.pt          # Nano model (fast)
├── yolov8s.pt          # Small model (balanced)
├── weapon-detect.pt    # Custom weapon detection
└── README.md           # This file
```

## Manual Model Reload

```bash
# Reload via API
curl -X POST http://localhost:8000/models/reload

# Reload specific model
curl -X POST http://localhost:8000/models/reload \
  -H "Content-Type: application/json" \
  -d '{"filename": "best.pt"}'

# Check loaded model
curl http://localhost:8000/models
```
