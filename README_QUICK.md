# 🚀 Quick Reference Guide

## 📂 New Organized Structure

```
SecureSight-Technologies/
│
├── 📱 app/                    → Next.js pages & API routes
│   ├── api/                   → Backend API proxies
│   ├── live/                  → Main surveillance dashboard
│   ├── calendar/              → Events calendar
│   ├── login/                 → Authentication
│   └── pricing/               → Pricing page
│
├── 🎥 components/
│   ├── camera/                → All video/camera components ⭐
│   │   ├── LiveCameraFeed.tsx
│   │   ├── go2rtc-player.tsx
│   │   ├── ip-camera-feed.tsx
│   │   ├── webcam-feed.tsx
│   │   └── cctv-manager.tsx
│   │
│   ├── dialogs/               → Modal/popup components ⭐
│   │   ├── AddIpCameraDialog.tsx
│   │   └── EditIpCameraDialog.tsx
│   │
│   ├── layout/                → Site structure components ⭐
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── theme-provider.tsx
│   │   ├── mode-toggle.tsx
│   │   └── particle-background.tsx
│   │
│   └── ui/                    → shadcn/ui primitives
│       └── (40+ components)
│
├── 🪝 hooks/                  → React hooks
│   └── use-detection-alerts.ts    → AI detection hook
│
├── 🤖 backend/                → Python AI backend
│   ├── app/
│   │   └── main.py            → YOLO inference server
│   └── models/                → YOLO model storage
│
├── 📚 docs/                   → Documentation ⭐
│   ├── deployment/
│   │   └── DEPLOYMENT.md
│   ├── setup/
│   │   ├── START_HERE.md
│   │   ├── INTEGRATION_COMPLETE.md
│   │   ├── PERFORMANCE_OPTIMIZATIONS.md
│   │   └── camera-test-urls.md
│   ├── MODELS.md              → AI model info (YOLOv8n)
│   └── STRUCTURE.md           → This guide
│
└── yolov8n.pt                 → YOLO model file
```

---

## 🎯 Quick Access

### Want to work on...

**Video streaming?**  
→ `components/camera/`

**AI detection?**  
→ `hooks/use-detection-alerts.ts`  
→ `backend/app/main.py`

**Add a dialog/modal?**  
→ `components/dialogs/`

**Site layout/theme?**  
→ `components/layout/`

**Main dashboard?**  
→ `app/live/page.tsx`

**Documentation?**  
→ `docs/`

---

## 🔍 Finding Things

### By Feature:

- **Live Streaming**: `components/camera/` + `app/live/`
- **AI Detection**: `hooks/use-detection-alerts.ts` + `backend/app/main.py`
- **User Interface**: `components/ui/`
- **Authentication**: `app/api/auth/` + `lib/auth.ts`
- **Camera Management**: `components/dialogs/` + `app/api/camera/`

### By Type:

- **React Components**: `components/` (organized by category)
- **Pages**: `app/`
- **Backend Logic**: `backend/`
- **Docs**: `docs/`
- **Utilities**: `lib/` + `hooks/`

---

## 🤖 AI Model Info

**Current Model**: YOLOv8n (Nano)  
**Location**: `/yolov8n.pt`  
**Purpose**: Real-time person detection  
**Performance**: ~50-150ms per frame (CPU)

**Capabilities**:
✅ Person detection  
✅ 80 COCO classes  
✅ Confidence scoring  
✅ Bounding boxes

**Violence Detection**: ❌ Removed (performance optimization)

**Full Details**: See `docs/MODELS.md`

---

## 📝 Import Paths (Updated)

```typescript
// Camera components
import LiveCameraFeed from "@/components/camera/LiveCameraFeed";
import Go2RtcPlayer from "@/components/camera/go2rtc-player";

// Dialogs
import AddIpCameraDialog from "@/components/dialogs/AddIpCameraDialog";

// Layout
import Header from "@/components/layout/header";
import { ThemeProvider } from "@/components/layout/theme-provider";

// Hooks
import { useDetectionAlerts } from "@/hooks/use-detection-alerts";

// UI
import { Button } from "@/components/ui/button";
```

---

## ⚡ Key Files

| File              | Purpose                    | Location                              |
| ----------------- | -------------------------- | ------------------------------------- |
| Live Dashboard    | Main surveillance page     | `app/live/page.tsx`                   |
| AI Detection Hook | WebSocket + REST detection | `hooks/use-detection-alerts.ts`       |
| YOLO Backend      | FastAPI inference server   | `backend/app/main.py`                 |
| Video Player      | HLS/WebRTC player          | `components/camera/go2rtc-player.tsx` |
| Model Info        | AI documentation           | `docs/MODELS.md`                      |

---

**Organization**: Functional grouping  
**Version**: 2.0  
**Updated**: January 29, 2026
