# SecureSight Technologies

**Real-time surveillance and threat detection platform with AI-powered monitoring**

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/yashpatel2005s-projects/v0-secure-sight-technologies-design)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/HJ9oamfQvpe)

## 🎯 Overview

SecureSight is a comprehensive security surveillance platform that combines:

- 🎥 **Live IP Camera Monitoring** - MJPEG, HLS, RTSP stream support
- 🤖 **AI Threat Detection** - Real-time YOLO-based object detection
- 🚨 **Smart Alerts** - Weapons, fire, intrusion, suspicious object detection
- 📊 **Dashboard** - Real-time analytics and alert history
- 🔐 **Multi-Camera Support** - Monitor multiple streams simultaneously

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  • Live camera feed display (MJPEG/HLS)                      │
│  • Real-time detection overlays                              │
│  • Alert management UI                                       │
│  • Calendar view for event history                           │
└───────────────────┬──────────────────────────────────────────┘
                    │ WebSocket
                    │ /ws/stream
┌───────────────────▼──────────────────────────────────────────┐
│                  Backend (FastAPI + YOLO)                    │
│  • Stream processing (OpenCV)                                │
│  • Object detection (YOLOv8)                                 │
│  • Alert rule engine                                         │
│  • Multi-camera orchestration                                │
└───────────────────┬──────────────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────────────┐
│                 IP Cameras / Streams                         │
│  • Mobile apps (IP Webcam, etc.)                             │
│  • RTSP cameras                                              │
│  • HTTP video streams                                        │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Complete Setup (Recommended)

```bash
# Run the setup script
cd backend
./setup.sh
```

This will:

- ✅ Check Python installation
- ✅ Create virtual environment
- ✅ Install all dependencies
- ✅ Set up models directory
- ✅ Create .env.local configuration

### 2. Manual Setup

#### Frontend

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

#### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server
python -m app.main
```

### 3. Connect Your IP Camera

1. Open [http://localhost:3000/live](http://localhost:3000/live)
2. Click **"+ Add IP Camera"**
3. Enter your camera URL:
   - Mobile IP Webcam: `http://192.168.x.x:8080/videofeed`
   - MJPEG: `http://camera-ip/video.mjpg`
   - HLS: `http://camera-ip/stream.m3u8`
   - RTSP: `rtsp://user:pass@camera-ip/stream`
4. Watch real-time detections appear! 🎉

## 📁 Project Structure

```
SecureSight-Technologies/
├── app/                      # Next.js pages & API routes
│   ├── live/                # Live surveillance page
│   ├── calendar/            # Alert history calendar
│   ├── api/
│   │   ├── proxy/          # Stream proxy for CORS
│   │   └── camera/         # Camera endpoints
├── components/              # React components
│   ├── ip-camera-feed.tsx  # MJPEG/HLS player
│   ├── LiveCameraFeed.tsx  # Stream display
│   └── AddIpCameraDialog.tsx
├── hooks/
│   └── use-detection-alerts.ts  # WebSocket integration
├── backend/                 # Python detection backend
│   ├── app/
│   │   ├── main.py         # FastAPI server
│   │   └── alert_manager.py # Alert rules engine
│   ├── models/             # YOLO model files (.pt)
│   ├── setup.sh            # Complete setup script
│   ├── test_backend.py     # Test suite
│   ├── DETECTION_SETUP.md  # Detailed guide
│   └── README.md
├── .env.local              # Configuration
└── README.md               # This file
```

## 🎯 Features

### ✅ Implemented

- **Live Streaming**
  - MJPEG stream support (IP Webcam, etc.)
  - HLS stream support (adaptive bitrate)
  - Automatic format detection
  - Multi-camera dashboard

- **AI Detection**
  - YOLOv8 object detection
  - Real-time frame processing
  - Configurable FPS and confidence
  - Multi-stream concurrent processing

- **Alert System**
  - Weapon detection (knife, gun) - CRITICAL
  - Person detection (unauthorized access) - HIGH
  - Fire/smoke detection - CRITICAL
  - Suspicious objects (backpack, suitcase) - MEDIUM
  - Vehicle monitoring - LOW
  - Cooldown periods to prevent spam

- **User Interface**
  - Live camera grid
  - Detection overlays
  - Active alerts sidebar
  - Alert history calendar
  - Camera management (add/edit/delete)

### 🔜 Roadmap

- [ ] User authentication & RBAC
- [ ] Recording & clip export
- [ ] Mobile app
- [ ] Cloud storage integration
- [ ] Advanced analytics dashboard
- [ ] Email/SMS notifications
- [ ] Zone-based detection
- [ ] Person re-identification
- [ ] Custom model training UI

## 🧪 Testing

### Test Backend

```bash
cd backend
source .venv/bin/activate
python test_backend.py
```

This validates:

- ✅ Model loading
- ✅ Detection inference
- ✅ Alert rule evaluation
- ✅ OpenCV stream handling

### API Testing

```bash
# Health check
curl http://localhost:8000/health

# List models
curl http://localhost:8000/models

# List alert rules
curl http://localhost:8000/alerts/rules

# Active streams
curl http://localhost:8000/streams

# Single image detection
curl -X POST http://localhost:8000/detect \
  -F "file=@test.jpg" \
  -F "conf=0.5"
```

## 🔧 Configuration

### Environment Variables (`.env.local`)

```bash
# Allow all cameras (dev only)
ALLOW_ALL_CAMERAS="true"

# Backend URL
NEXT_PUBLIC_CAMERA_BACKEND_URL="http://localhost:8000"
CAMERA_BACKEND_URL="http://localhost:8000"
```

### YOLO Models

Place model files in `backend/models/`:

```bash
cd backend/models

# Download YOLOv8 nano (fastest)
wget https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt

# OR use your custom trained model
cp /path/to/your/model.pt best.pt  # Auto-loads with priority
```

Model priority:

1. `best.pt` (custom model)
2. Most recently modified `.pt` file
3. Auto-download `yolov8n.pt`

## 📚 Documentation

- **[Backend Setup Guide](backend/DETECTION_SETUP.md)** - Complete backend integration
- **[Backend API Docs](backend/README.md)** - API reference
- **[Model Guide](backend/models/README.md)** - YOLO model setup
- **[Camera URLs](camera-test-urls.md)** - IP camera endpoint examples

## 🐛 Troubleshooting

### IP Camera Won't Connect

```bash
# Test URL in browser first
open http://192.168.x.x:8080

# Test with ffprobe
ffprobe "http://192.168.x.x:8080/videofeed"

# Test with Python
python -c "import cv2; cap = cv2.VideoCapture('http://192.168.x.x:8080/videofeed'); print(cap.isOpened())"
```

**Common issues:**

- ❌ Wrong path - Try `/videofeed`, `/video`, `/video.mjpg`
- ❌ Network issue - Ensure phone and laptop on same WiFi
- ❌ Firewall blocking - Disable temporarily for testing
- ❌ Mixed content - Use `http://localhost:3000` not HTTPS
- ❌ CORS - Use the `/api/proxy` endpoint

### Backend Not Detecting

```bash
# Check if backend is running
curl http://localhost:8000/health

# Check WebSocket connection (browser console)
# Should see: "AI Filter Online"

# Lower confidence threshold
# In frontend: detection_conf: 0.3 instead of 0.5
```

### High CPU Usage

- Reduce FPS: `desired_fps: 1.0` or `0.5`
- Use smaller model: `yolov8n.pt` instead of `yolov8l.pt`
- Limit concurrent streams
- Reduce camera resolution

## 🤝 Contributing

Contributions welcome! Areas of interest:

- Enhanced alert rules
- Custom YOLO model training
- Mobile app development
- Cloud integrations
- Performance optimizations

## 📝 License

MIT License - See LICENSE file

## 🔗 Links

- **Live Demo**: [vercel.com/...](https://vercel.com/yashpatel2005s-projects/v0-secure-sight-technologies-design)
- **v0 Project**: [v0.dev/chat/...](https://v0.dev/chat/projects/HJ9oamfQvpe)
- **Backend Docs**: http://localhost:8000/docs (when running)

---

**Built with**: Next.js, React, FastAPI, YOLOv8, OpenCV, TypeScript, Python
