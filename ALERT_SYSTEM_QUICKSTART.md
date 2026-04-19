# Alert System Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Start Backend
```bash
cd backend
python -m app.main
```

**Expected Output:**
```
✅ Model loaded: yolov8n.pt (CPU threads: 8)
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 2. Test Alert System
```bash
# From project root
./test-alerts.sh
```

**Expected:**
- ✓ Backend health check passes
- ✓ 8 alert rules found
- ✓ Demo alerts generate correctly
- ✓ Detection endpoint works

### 3. Test Individual Endpoints

#### Get Alert Rules
```bash
curl http://localhost:8000/alerts/rules | jq
```

#### Test Demo Alerts
```bash
curl http://localhost:8000/alerts/demo | jq
```

#### Test Detection with Camera
```bash
curl -X POST http://localhost:8000/detect/url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://cam1.yashpatelis.online/stream.html?src=cam1","conf":0.5}' \
  | jq
```

### 4. Start Frontend
```bash
pnpm dev
```

### 5. Test Frontend Integration
```bash
# In another terminal
curl -X POST http://localhost:3000/api/detect \
  -H "Content-Type: application/json" \
  -d '{"url":"https://cam1.yashpatelis.online/stream.html?src=cam1"}' \
  | jq
```

---

## 📋 Alert System Checklist

### Backend Verification
- [ ] `python -m app.main` starts without errors
- [ ] `/health` endpoint returns `"model_loaded": true`
- [ ] `/alerts/rules` returns 8 rules
- [ ] `/alerts/demo` generates random alerts
- [ ] `/detect/url` processes camera streams
- [ ] WebSocket `/ws/stream` accepts connections

### Frontend Verification  
- [ ] `pnpm dev` starts without errors
- [ ] `/api/detect` proxy forwards to backend
- [ ] Navigate to `/live` page loads
- [ ] Browser console shows no errors
- [ ] Network tab shows WebSocket or polling activity

### Integration Verification
- [ ] Run `./test-alerts.sh` - all tests pass
- [ ] Open `/live` page
- [ ] Select a camera with activity
- [ ] Check if detections appear in browser DevTools console

---

## 🔍 Current Alert System Status

### ✅ WORKING COMPONENTS

#### Backend (Python)
1. **Alert Manager** - 8 rules configured
   - `weapon-detected` (CRITICAL)
   - `violence-detected` (CRITICAL)
   - `person-unauthorized` (HIGH)
   - `multiple-persons` (HIGH)  
   - `fire-detected` (CRITICAL)
   - `suspicious-object` (MEDIUM)
   - `vehicle-detected` (LOW)
   - `animal-detected` (LOW)

2. **Detection Pipeline** - YOLO + Alert evaluation
   - WebSocket streaming: Line 260 in `main.py`
   - REST endpoint: Line 409 in `main.py`
   - Batch detection: Line 443 in `main.py`

3. **Cooldown System** - Per-source tracking prevents spam

#### Frontend (TypeScript/React)
1. **useDetectionAlerts Hook** - WebSocket + Polling
   - Auto-fallback from WebSocket to REST
   - 15s polling interval
   - 12s debouncing
   - Alert deduplication (3s cooldown)

2. **API Proxy** - `/api/detect` route
   - 15s response caching
   - Forwards to backend
   - Prevents duplicate requests

3. **AlertOverlay Component** - NEW
   - Visual alert display
   - Person count tracking
   - Detection status indicator
   - Animated notifications

### ⚠️ INTEGRATION GAPS

1. **Live Page Uses Mock Alerts**
   - Location: `app/live/page.tsx` line 173
   - Fix: Connect to `useDetectionAlerts` hook

2. **Camera Components Missing Alert Display**
   - `LiveCameraFeed.tsx` - No alerts
   - `IPCameraFeed.tsx` - No alerts
   - `Go2RtcPlayer.tsx` - No alerts
   - Fix: Add `<AlertOverlay>` component

3. **No Visual/Audio Notifications**
   - No toast messages
   - No sound alerts
   - No real-time counter updates
   - Fix: Use Sonner + Audio API

---

## 🛠️ How to Integrate Alerts into UI

### Option 1: Quick Test (AlertOverlay Component)

**Step 1**: Install framer-motion (optional for animations)
```bash
pnpm add framer-motion
```

**Step 2**: Wrap any camera feed
```tsx
import AlertOverlay from "@/components/camera/AlertOverlay";

<div className="relative">
  <LiveCameraFeed src={cameraUrl} />
  <AlertOverlay 
    cameraUrl={cameraUrl}
    onAlertDetected={(alert) => {
      console.log('🚨 Alert:', alert);
    }}
  />
</div>
```

### Option 2: Full Integration (Live Page)

**Step 1**: Add state for real-time alerts
```tsx
const [realtimeAlerts, setRealtimeAlerts] = useState<Alert[]>([]);

const handleNewAlert = (alert: any) => {
  setRealtimeAlerts(prev => [{
    id: alert.id,
    type: alert.label,
    area: selectedCamera?.name || "Unknown",
    time: new Date(alert.timestamp),
    severity: mapSeverity(alert.label),
    status: "active"
  }, ...prev].slice(0, 100));
};
```

**Step 2**: Add AlertOverlay to camera display
```tsx
<div className="relative aspect-video">
  {/* Existing camera component */}
  <Go2RtcPlayer ... />
  
  {/* New alert overlay */}
  <AlertOverlay 
    cameraUrl={selectedCamera?.url}
    cameraName={selectedCamera?.name}
    onAlertDetected={handleNewAlert}
    showDetectionBoxes={true}
  />
</div>
```

**Step 3**: Display alerts in UI
```tsx
<TabsContent value="alerts">
  {realtimeAlerts.map(alert => (
    <AlertCard key={alert.id} alert={alert} />
  ))}
</TabsContent>
```

---

## 🧪 Manual Testing Guide

### Test 1: Backend Alert Generation
```bash
# Run demo endpoint 5 times
for i in {1..5}; do 
  curl -s http://localhost:8000/alerts/demo | jq '.scenario, .alerts'
  sleep 1
done
```

**Expected**: Different scenarios with corresponding alerts

### Test 2: Real Camera Detection
```bash
# Detect from live camera
curl -X POST http://localhost:8000/detect/url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://cam1.yashpatelis.online/stream.html?src=cam1",
    "conf": 0.5
  }' | jq '{
    person_count,
    alerts,
    detection_count: (.detections | length)
  }'
```

**Expected**: JSON with detections and any triggered alerts

### Test 3: WebSocket Connection
```bash
# Install websocat: brew install websocat
echo '{"url":"https://cam1.yashpatelis.online/stream.html?src=cam1","desired_fps":1.0,"detection_conf":0.5}' | \
  websocat ws://localhost:8000/ws/stream
```

**Expected**: Stream of JSON messages with ts, detections, alerts

### Test 4: Frontend Hook
1. Open browser to `http://localhost:3000/live`
2. Open DevTools Console
3. Add temporary logging:
```tsx
const detection = useDetectionAlerts(cameraUrl);
useEffect(() => {
  console.log('🔍 Detection status:', detection.status);
  console.log('👥 Person count:', detection.personCount);
  console.log('🚨 Latest alert:', detection.latestAlert);
}, [detection]);
```

---

## 📊 Expected Alert Response Format

### WebSocket/REST Response
```json
{
  "ts": 1708318734.567,
  "inference_ms": 45.2,
  "detections": [
    {
      "cls": 0,
      "name": "person",
      "conf": 0.87,
      "box": [120, 340, 450, 680]
    }
  ],
  "alerts": ["person-unauthorized"],
  "person_count": 1
}
```

### Frontend Alert Object
```typescript
{
  id: "1708318734567-person-unauthorized-0.123",
  label: "person-unauthorized",
  score: 0.87,
  ts: 1708318734567,
  source: "https://cam1.yashpatelis.online/..."
}
```

---

## 🎯 Severity Mapping

```typescript
const mapSeverity = (alertLabel: string): "low" | "medium" | "high" | "critical" => {
  if (alertLabel.includes("weapon") || alertLabel.includes("violence") || alertLabel.includes("fire")) {
    return "critical";
  }
  if (alertLabel.includes("person") || alertLabel.includes("multiple")) {
    return "high";
  }
  if (alertLabel.includes("suspicious")) {
    return "medium";
  }
  return "low";
};
```

---

## 🔊 Add Sound Alerts (Optional)

### Step 1: Add sound files
```bash
mkdir -p public/sounds
# Add critical-alert.mp3, high-alert.mp3, etc.
```

### Step 2: Create audio helper
```tsx
const playAlertSound = (severity: string) => {
  const soundFiles = {
    critical: "/sounds/critical-alert.mp3",
    high: "/sounds/high-alert.mp3",
    medium: "/sounds/medium-alert.mp3",
  };
  
  const file = soundFiles[severity as keyof typeof soundFiles];
  if (file) {
    const audio = new Audio(file);
    audio.volume = 0.5;
    audio.play().catch(console.error);
  }
};
```

### Step 3: Trigger on alerts
```tsx
const handleNewAlert = (alert: any) => {
  const severity = mapSeverity(alert.label);
  playAlertSound(severity);
  // ... rest of alert handling
};
```

---

## 📝 Summary

**What's Working:**
- ✅ Backend alert detection (8 rules)
- ✅ YOLO inference with alert checks
- ✅ WebSocket + REST endpoints
- ✅ Frontend detection hook
- ✅ API proxy with caching
- ✅ Demo alert generation
- ✅ AlertOverlay component created

**What Needs Integration:**
- ⚠️ Connect AlertOverlay to camera feeds
- ⚠️ Replace mock alerts in live page
- ⚠️ Add toast notifications
- ⚠️ Add sound alerts
- ⚠️ Add alert history/persistence

**Quick Win:**
Add `<AlertOverlay>` to any camera feed to see real-time alert badges!

---

## 🆘 Troubleshooting

**Backend not starting?**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

**No alerts being triggered?**
- Check camera has activity (people, objects visible)
- Lower confidence threshold: `"conf": 0.3`
- Test with demo endpoint: `curl http://localhost:8000/alerts/demo`

**WebSocket not connecting?**
- Check CORS settings in backend
- Verify `NEXT_PUBLIC_CAMERA_BACKEND_URL` env var
- Fallback to REST polling should work automatically

**No detections in frontend?**
- Open DevTools Network tab
- Should see WebSocket connection or periodic POST to `/api/detect`
- Check console for errors from `useDetectionAlerts` hook
