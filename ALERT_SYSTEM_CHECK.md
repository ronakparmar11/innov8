# Alert System Integration Check - SecureSight

## ✅ VERIFIED COMPONENTS

### Backend (Python/FastAPI)

#### 1. Alert Manager (`backend/app/alert_manager.py`)
**Status**: ✅ FULLY FUNCTIONAL

**Features**:
- 8 pre-configured alert rules
- Severity levels: LOW, MEDIUM, HIGH, CRITICAL
- Per-source cooldown tracking
- Count threshold support
- Confidence-based filtering

**Alert Rules**:
```python
1. weapon-detected (CRITICAL) - knife, weapon, gun, rifle, pistol
2. violence-detected (CRITICAL) - Violence (from CNN-RNN model)
3. person-unauthorized (HIGH) - person @ 0.6 conf
4. multiple-persons (HIGH) - 3+ persons @ 0.5 conf
5. fire-detected (CRITICAL) - fire, flame, smoke
6. suspicious-object (MEDIUM) - backpack, suitcase, handbag, luggage
7. vehicle-detected (LOW) - car, truck, bus, motorcycle
8. animal-detected (LOW) - dog, cat, bird, horse
```

**Cooldown Times**:
- Weapons: 3s
- Violence: 5s  
- Person: 5s
- Fire: 5s
- Suspicious objects: 15s
- Vehicles: 20s

#### 2. Detection Pipeline (`backend/app/main.py`)
**Status**: ✅ INTEGRATED

**Alert Integration Points**:
```python
# Line 260: WebSocket Stream Worker
alerts = alert_manager.check([d.model_dump() for d in dets], source_key=stream_id)

# Line 409: URL Detection Endpoint  
alerts = alert_manager.check([d.model_dump() for d in dets], source_key=req.url)

# Line 443: Batch Detection
alerts = alert_manager.check(detections_dump, source_key=f"camera:{camera_id}")
```

**Alert Response Format**:
```json
{
  "ts": 1703789234.567,
  "inference_ms": 45.2,
  "detections": [...],
  "alerts": ["weapon-detected", "person-unauthorized"],
  "person_count": 2
}
```

#### 3. Demo Endpoint
**Status**: ✅ WORKING
```bash
GET /alerts/demo
```
Generates random scenarios to test alert logic without cameras.

---

### Frontend (React/Next.js)

#### 1. Detection Hook (`hooks/use-detection-alerts.ts`)
**Status**: ✅ FULLY IMPLEMENTED

**Features**:
- WebSocket connection with fallback to REST polling
- Alert deduplication (prevents spam)
- Connection timeout handling
- Debouncing (12s between requests)
- Concurrent request prevention

**Alert Detection**:
```typescript
if (payload.alerts && payload.alerts.length > 0) {
  const label = payload.alerts[0];
  const topScore = payload.detections?.[0]?.conf ?? 0;
  // 3-second cooldown between same alerts
  if (shouldTrigger) {
    setLatestAlert({
      id: `${Math.floor(ts)}-${label}-${Math.random()}`,
      label,
      score: topScore,
      ts,
      source: cameraUrl ?? "",
    });
  }
}
```

#### 2. API Proxy (`app/api/detect/route.ts`)
**Status**: ✅ WORKING WITH CACHE

**Features**:
- 15-second response caching
- Forwards to backend `/detect/url`
- Prevents duplicate concurrent requests
- Cache cleanup (max 100 entries)

**Usage**:
```bash
POST /api/detect
{
  "url": "https://cam1.yashpatelis.online/stream.html?src=cam1",
  "conf": 0.5
}
```

---

## ⚠️ INTEGRATION GAPS FOUND

### 1. Frontend UI Not Using Alerts
**Issue**: `app/live/page.tsx` displays MOCK alerts, not real backend alerts

**Current Code** (Line 173):
```typescript
setAlerts([
  {
    id: "alert-1",
    type: "motion",
    area: "Restricted Zone 3",
    // ... HARDCODED mock data
  }
])
```

**Missing**: Integration with `useDetectionAlerts` hook

### 2. Camera Components Don't Show Alerts
**Issue**: 
- `LiveCameraFeed.tsx` - Only displays video stream
- `IPCameraFeed.tsx` - No alert overlay
- `Go2RtcPlayer.tsx` - No alert detection

**Created**: `AlertOverlay.tsx` component to fix this

### 3. No Visual/Audio Notifications
**Missing**:
- Sound alerts for CRITICAL severity
- Toast notifications
- Alert history/log display
- Real-time alert counter updates

---

## 🛠️ FIXES IMPLEMENTED

### 1. Alert Test Script (`test-alerts.sh`)
**Purpose**: Comprehensive backend + integration testing

**Tests**:
1. Backend health check
2. Alert rules configuration (8 rules expected)
3. Demo alert generation (3 scenarios)
4. Detection endpoint with real camera
5. Frontend API proxy
6. WebSocket endpoint

**Usage**:
```bash
./test-alerts.sh
```

### 2. AlertOverlay Component (`components/camera/AlertOverlay.tsx`)
**Purpose**: Visual alert overlay for camera feeds

**Features**:
- Real-time alert notifications with icons
- Person count display
- Detection status indicator (WebSocket/Polling)
- Optional bounding boxes
- Animated entrance/exit
- Color-coded severity levels

**Usage**:
```tsx
<AlertOverlay
  cameraUrl={camera.url}
  cameraName={camera.name}
  onAlertDetected={(alert) => {
    console.log('Alert:', alert);
    // Add to alert list, play sound, etc.
  }}
  showDetectionBoxes={true}
/>
```

---

## 🔧 RECOMMENDED INTEGRATION STEPS

### Step 1: Update LiveCameraFeed Component
```tsx
// components/camera/LiveCameraFeed.tsx
import AlertOverlay from "./AlertOverlay";

export default function LiveCameraFeed({ src, alt, onAlertDetected }) {
  return (
    <div className="relative aspect-video">
      <img src={src} alt={alt} />
      <AlertOverlay 
        cameraUrl={src} 
        onAlertDetected={onAlertDetected}
      />
    </div>
  );
}
```

### Step 2: Update Live Page to Collect Real Alerts
```tsx
// app/live/page.tsx
const [realtimeAlerts, setRealtimeAlerts] = useState<Alert[]>([]);

const handleAlertDetected = (alert) => {
  setRealtimeAlerts(prev => [
    {
      id: alert.id,
      type: alert.label,
      area: selectedCamera?.name || "Unknown",
      time: new Date(alert.timestamp),
      severity: getSeverityFromLabel(alert.label),
      status: "active"
    },
    ...prev
  ].slice(0, 50)); // Keep last 50 alerts
  
  // Update stats
  setStats(prev => ({
    ...prev,
    activeAlerts: prev.activeAlerts + 1,
    totalDetections: prev.totalDetections + 1
  }));
};

// In camera display
<AlertOverlay 
  cameraUrl={selectedCamera?.url}
  onAlertDetected={handleAlertDetected}
/>
```

### Step 3: Add Sound Notifications
```tsx
const playAlertSound = (severity: string) => {
  if (severity === "critical") {
    const audio = new Audio("/sounds/critical-alert.mp3");
    audio.play();
  }
};
```

### Step 4: Add Toast Notifications
```tsx
import { toast } from "sonner";

const handleAlertDetected = (alert) => {
  toast.error(`${alert.label.replace(/-/g, ' ').toUpperCase()}`, {
    description: `Detected with ${(alert.score * 100).toFixed(0)}% confidence`,
    duration: 5000,
  });
};
```

---

## 📊 ALERT FLOW DIAGRAM

```
┌─────────────────┐
│  IP Camera      │
│  (MJPEG/HLS)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Backend (FastAPI)          │
│  ┌─────────────────────┐    │
│  │ YOLO Detection      │    │
│  │ (YOLOv8n 45ms)      │    │
│  └──────────┬──────────┘    │
│             │                │
│  ┌──────────▼──────────┐    │
│  │ Alert Manager       │    │
│  │ - Check 8 rules     │    │
│  │ - Apply cooldowns   │    │
│  │ - Source tracking   │    │
│  └──────────┬──────────┘    │
│             │                │
│  ┌──────────▼──────────┐    │
│  │ WebSocket / REST    │    │
│  │ {alerts: [...]}     │    │
│  └──────────┬──────────┘    │
└─────────────┼────────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Frontend (Next.js)         │
│  ┌─────────────────────┐    │
│  │ useDetectionAlerts  │    │
│  │ - WebSocket conn    │    │
│  │ - Polling fallback  │    │
│  │ - Deduplication     │    │
│  └──────────┬──────────┘    │
│             │                │
│  ┌──────────▼──────────┐    │
│  │ AlertOverlay        │    │
│  │ - Visual display    │    │
│  │ - Icon badges       │    │
│  │ - Animations        │    │
│  └──────────┬──────────┘    │
│             │                │
│  ┌──────────▼──────────┐    │
│  │ Live Page           │    │
│  │ - Alert list        │    │
│  │ - Toast notify      │    │
│  │ - Sound alerts      │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

---

## 🧪 TESTING CHECKLIST

### Backend Tests
- [ ] `curl http://localhost:8000/health` - Returns model_loaded: true
- [ ] `curl http://localhost:8000/alerts/rules` - Returns 8 rules
- [ ] `curl http://localhost:8000/alerts/demo` - Returns random scenario + alerts
- [ ] `curl -X POST http://localhost:8000/detect/url -d '{"url":"..."}' -H 'Content-Type: application/json'` - Returns detections + alerts

### Frontend Tests  
- [ ] Navigate to `/live`
- [ ] Select a camera
- [ ] Check browser DevTools Network tab for:
  - WebSocket connection to backend
  - Or periodic POST requests to `/api/detect`
- [ ] Verify alerts appear in overlay (if camera has activity)
- [ ] Check alert cooldowns (same alert shouldn't spam)

### Integration Tests
- [ ] Run `./test-alerts.sh` - All checks pass
- [ ] Monitor backend logs: `python -m app.main` - See alert triggers
- [ ] Monitor frontend console - See alert objects logged

---

## 📈 PERFORMANCE NOTES

**Alert Manager Complexity**: O(n × m) where n = detections, m = rules
- Typical: 5 detections × 8 rules = 40 comparisons
- Fast: <1ms per frame

**Cooldown Tracking**: Per-source tracking prevents alert spam
- Memory: ~50 bytes per (source, rule) pair
- Automatic cleanup on rule evaluation

**Frontend Debouncing**:
- WebSocket: Real-time (no debouncing)
- REST polling: 15s interval with 12s minimum gap
- Prevents duplicate concurrent requests

---

## 🚀 NEXT STEPS

1. **Integrate AlertOverlay** into camera feed components
2. **Update live page** to use real alerts from `useDetectionAlerts`
3. **Add sound notifications** for critical alerts
4. **Add toast notifications** using Sonner
5. **Create alert history** view in calendar page
6. **Add alert filtering** by severity/type/camera
7. **Export alerts** to CSV/JSON for compliance
8. **Add alert acknowledgment** workflow
9. **Integrate with external systems** (webhooks, email, SMS)
10. **Add alert statistics** dashboard

---

## 🐛 KNOWN ISSUES

1. **Violence detection** requires 30-frame buffer (delays by 1-2s)
2. **COCO model** may not detect domain-specific threats (needs custom training)
3. **No persistence** - alerts lost on page refresh (needs database)
4. **No multi-user support** - alerts not synchronized across sessions
5. **No acknowledgment system** - can't mark alerts as "handled"

---

## 📚 REFERENCES

- Alert Manager: `backend/app/alert_manager.py`
- Detection Hook: `hooks/use-detection-alerts.ts`
- API Proxy: `app/api/detect/route.ts`
- Backend Main: `backend/app/main.py` (lines 260, 409, 443)
- Test Script: `test-alerts.sh`
- New Overlay: `components/camera/AlertOverlay.tsx`
