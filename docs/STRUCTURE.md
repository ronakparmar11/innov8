# SecureSight Project Structure

```
SecureSight-Technologies/
│
├── 📱 app/                          # Next.js 15 App Router
│   ├── api/                         # API Routes
│   │   ├── auth/                    # Authentication endpoints
│   │   ├── camera/[id]/             # Camera management
│   │   ├── detect/                  # AI detection proxy
│   │   └── proxy/                   # Stream proxy
│   ├── calendar/                    # Calendar/Events page
│   ├── live/                        # Live camera feed page
│   ├── login/                       # Login page
│   ├── pricing/                     # Pricing page
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Home page
│   └── globals.css                  # Global styles
│
├── 🎥 components/                   # React Components
│   ├── camera/                      # Camera-related components
│   │   ├── LiveCameraFeed.tsx       # MJPEG stream player
│   │   ├── ip-camera-feed.tsx       # IP camera component
│   │   ├── go2rtc-player.tsx        # HLS/WebRTC player
│   │   ├── webcam-feed.tsx          # Webcam component
│   │   └── cctv-manager.tsx         # Camera grid manager
│   ├── dialogs/                     # Modal dialogs
│   │   ├── AddIpCameraDialog.tsx    # Add camera dialog
│   │   └── EditIpCameraDialog.tsx   # Edit camera dialog
│   ├── layout/                      # Layout components
│   │   ├── header.tsx               # Site header
│   │   ├── footer.tsx               # Site footer
│   │   ├── theme-provider.tsx       # Dark/light theme
│   │   ├── mode-toggle.tsx          # Theme switcher
│   │   └── particle-background.tsx  # Animated background
│   ├── ui/                          # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ... (40+ UI primitives)
│   ├── feature-card.tsx             # Feature display card
│   └── secure-feed.tsx              # Secure video wrapper
│
├── 🪝 hooks/                        # React Hooks
│   ├── use-detection-alerts.ts      # AI detection hook (WebSocket + REST)
│   ├── use-hydrated.ts              # SSR hydration hook
│   ├── use-mobile.ts                # Mobile detection
│   └── use-toast.ts                 # Toast notifications
│
├── 🔧 lib/                          # Utilities
│   ├── auth.ts                      # Auth helpers
│   └── utils.ts                     # Common utilities (cn, etc.)
│
├── 🎨 styles/                       # Stylesheets
│   └── globals.css                  # Additional global styles
│
├── 📘 types/                        # TypeScript Definitions
│   └── hls.d.ts                     # HLS.js type definitions
│
├── 🌐 public/                       # Static Assets
│   └── (images, icons, etc.)
│
├── 🤖 backend/                      # Python FastAPI Backend
│   ├── app/                         # Backend application
│   │   ├── main.py                  # FastAPI app & YOLO inference
│   │   ├── alert_manager.py         # Alert detection logic
│   │   └── __init__.py
│   ├── models/                      # YOLO model storage
│   │   └── README.md
│   ├── requirements.txt             # Python dependencies
│   ├── Dockerfile                   # Container configuration
│   ├── start.sh                     # Startup script
│   ├── deploy.sh                    # Deployment script
│   └── test_backend.py              # Backend tests
│
├── 📚 docs/                         # Documentation
│   ├── deployment/                  # Deployment guides
│   │   └── DEPLOYMENT.md
│   ├── setup/                       # Setup documentation
│   │   ├── INTEGRATION_COMPLETE.md
│   │   ├── PERFORMANCE_OPTIMIZATIONS.md
│   │   ├── START_HERE.md
│   │   └── camera-test-urls.md
│   └── MODELS.md                    # AI model documentation
│
├── ⚙️ Configuration Files
│   ├── next.config.mjs              # Next.js configuration
│   ├── tailwind.config.ts           # Tailwind CSS config
│   ├── tsconfig.json                # TypeScript config
│   ├── eslint.config.mjs            # ESLint rules
│   ├── postcss.config.mjs           # PostCSS config
│   ├── components.json              # shadcn/ui config
│   ├── package.json                 # Node dependencies
│   ├── pnpm-lock.yaml               # Lock file
│   └── .env.local                   # Environment variables
│
├── 🤖 AI Model
│   └── yolov8n.pt                   # YOLOv8 Nano weights
│
└── 📄 README.md                     # Project documentation
```

---

## Key Directories Explained

### 📱 **app/** - Next.js Application
- Uses App Router (Next.js 15)
- Server and client components
- API routes for backend communication

### 🎥 **components/** - React Components
- **camera/**: All video streaming components
- **dialogs/**: Modal/popup components
- **layout/**: Site structure (header, footer, theme)
- **ui/**: Reusable UI primitives (shadcn/ui)

### 🤖 **backend/** - AI Inference Server
- FastAPI server for YOLO detection
- WebSocket for real-time streams
- REST API for single-frame detection

### 📚 **docs/** - Documentation
- **deployment/**: Server deployment guides
- **setup/**: Initial setup and integration docs
- **MODELS.md**: AI model information

---

## Important Files

| File | Purpose |
|------|---------|
| `app/live/page.tsx` | Main live camera dashboard |
| `hooks/use-detection-alerts.ts` | Real-time AI detection hook |
| `backend/app/main.py` | YOLO inference backend |
| `components/camera/go2rtc-player.tsx` | HLS video player |
| `docs/MODELS.md` | AI model documentation |

---

## Access Patterns

### Adding a New Camera Component
1. Create in `components/camera/`
2. Import in `app/live/page.tsx`
3. Use `use-detection-alerts` hook for AI

### Adding a New Page
1. Create folder in `app/`
2. Add `page.tsx`
3. Import layout components from `components/layout/`

### Adding Backend Endpoint
1. Add route in `backend/app/main.py`
2. Create proxy in `app/api/` (if needed)
3. Update types in `types/`

---

**Structure Version**: 2.0  
**Last Updated**: January 29, 2026  
**Organized By**: Functional grouping for better discoverability
