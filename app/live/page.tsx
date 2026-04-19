"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Phone,
  Shield,
  FilterX,
  AlarmCheck,
  Plus,
  Pencil,
  Sparkles,
  AlertCircle,
  Flame,
  Users,
  Package,
  Car,
  Brain,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Radar,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import LiveCameraFeed from "@/components/camera/LiveCameraFeed";
import dynamic from "next/dynamic";
import AddIpCameraDialog from "@/components/dialogs/AddIpCameraDialog";
import EditIpCameraDialog, {
  type EditableCamera,
} from "@/components/dialogs/EditIpCameraDialog";
import {
  useParallelDetection,
  type CameraAlert,
} from "@/hooks/use-parallel-detection";
import { useAlertCount } from "@/contexts/alert-count-context";

const IPCameraFeed = dynamic(
  () => import("@/components/camera/ip-camera-feed"),
  { ssr: false },
);
const Go2RtcPlayer = dynamic(
  () => import("@/components/camera/go2rtc-player"),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────────────────────────

type CameraEntry = {
  id: string;
  name: string;
  url: string;
};

// ─── Default cameras ──────────────────────────────────────────────────────────

const defaultCameras: CameraEntry[] = [
  {
    id: "mobile-cam-1",
    name: "Mobile Camera",
    url: "http://192.168.1.101:8080/video",
  },
];

// ─── Alert metadata helpers ───────────────────────────────────────────────────

const alertConfig: Record<
  string,
  {
    icon: typeof Shield;
    color: string;
    bgColor: string;
    borderColor: string;
    severity: string;
    severityColor: string;
  }
> = {
  "behavior-violent": {
    icon: Activity,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "VIOLENT ACTION",
  },
  "behavior-aggressive": {
    icon: Activity,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    label: "AGGRESSIVE MOVEMENT",
  },
  "behavior-suspicious": {
    icon: Activity,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    label: "SUSPICIOUS MOVEMENT",
  },
  "weapon-detected": {
    icon: Shield,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    severity: "CRITICAL",
    severityColor: "bg-red-500 text-white",
  },
  "violence-detected": {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-600/10",
    borderColor: "border-red-600/30",
    severity: "CRITICAL",
    severityColor: "bg-red-600 text-white",
  },
  "fire-detected": {
    icon: Flame,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    severity: "CRITICAL",
    severityColor: "bg-orange-500 text-white",
  },
  "person-unauthorized": {
    icon: Users,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    severity: "HIGH",
    severityColor: "bg-yellow-500 text-black",
  },
  "multiple-persons": {
    icon: Users,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    borderColor: "border-yellow-400/30",
    severity: "HIGH",
    severityColor: "bg-yellow-500 text-black",
  },
  "suspicious-object": {
    icon: Package,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    severity: "MEDIUM",
    severityColor: "bg-blue-500 text-white",
  },
  "vehicle-detected": {
    icon: Car,
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30",
    severity: "LOW",
    severityColor: "bg-slate-500 text-white",
  },
  "animal-detected": {
    icon: Eye,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    severity: "LOW",
    severityColor: "bg-green-500 text-white",
  },
};

const defaultAlertMeta = {
  icon: AlertCircle,
  color: "text-gray-500",
  bgColor: "bg-gray-500/10",
  borderColor: "border-gray-500/30",
  severity: "INFO",
  severityColor: "bg-gray-500 text-white",
};

function formatTimeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

function formatAlertLabel(label: string): string {
  return label.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LiveFootagePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [cameras, setCameras] = useState<CameraEntry[]>(defaultCameras);
  const [currentCamera, setCurrentCamera] = useState("mobile-cam-1");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<EditableCamera | null>(
    null,
  );
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set(),
  );

  // ── Alert count context (shared with header nav badge) ──
  const { setAlertCount } = useAlertCount();

  // ── Hydrate cameras from localStorage ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("ss:cameras");
    if (!stored) return;
    try {
      const parsed: CameraEntry[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setCameras(parsed);
        if (!parsed.some((c) => c.id === currentCamera)) {
          setCurrentCamera(parsed[0].id);
        }
      }
    } catch {
      // ignore malformed
    }
  }, [currentCamera]);

  // ── Persist cameras ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("ss:cameras", JSON.stringify(cameras));
  }, [cameras]);

  // ── Stable camera list for the detection hook (avoids re-renders) ──
  const camerasForDetection = useMemo(
    () => cameras.map((c) => ({ id: c.id, name: c.name, url: c.url })),
    [cameras],
  );

  // ── RUN BACKEND AI DETECTION ON ALL CAMERAS (batch endpoint) ──
  // This sends ALL camera feeds to the backend together via /api/detect-all
  // which calls FastAPI /detect/batch for parallel YOLO + violence detection
  const {
    alerts: backendAlerts,
    detections,
    status: detectionStatus,
    errorMessage: detectionError,
  } = useParallelDetection(camerasForDetection, {
    enabled: true,
    minScore: 0.5,
  });

  // ── Active alerts (exclude dismissed ones) ──
  const activeAlerts = useMemo(
    () => backendAlerts.filter((a) => !dismissedAlerts.has(a.id)),
    [backendAlerts, dismissedAlerts],
  );

  // ── Update header nav badge with active alert count ──
  useEffect(() => {
    setAlertCount(activeAlerts.length);
    return () => setAlertCount(0); // Clear badge on unmount
  }, [activeAlerts.length, setAlertCount]);

  const selectedCamera = useMemo(
    () => cameras.find((c) => c.id === currentCamera) ?? cameras[0],
    [cameras, currentCamera],
  );

  // ── Clock update ──
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Camera management handlers ──
  const handleAddCamera = (url: string, name: string) => {
    const id = `cam-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
    const next: CameraEntry = { id, name, url };
    setCameras((prev) => [...prev, next]);
    setCurrentCamera(id);
  };

  const handleSaveCamera = (id: string, name: string, url: string) => {
    setCameras((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name, url } : c)),
    );
  };

  const handleDeleteCamera = (id: string) => {
    setCameras((prev) => {
      const nextList = prev.filter((c) => c.id !== id);
      if (currentCamera === id && nextList.length > 0) {
        setCurrentCamera(nextList[0].id);
      }
      return nextList;
    });
  };

  // ── Alert handlers ──
  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
  };

  const handleClearAllAlerts = () => {
    setDismissedAlerts(new Set(backendAlerts.map((a) => a.id)));
  };

  // ── Per-camera detection summary ──
  const cameraDetectionSummary = useMemo(() => {
    const summary: Record<string, string> = {};
    for (const cam of cameras) {
      const dets = detections.get(cam.id);
      if (!dets || dets.length === 0) {
        summary[cam.id] = "No detections";
        continue;
      }
      // Group by name and count
      const counts: Record<string, number> = {};
      for (const d of dets) {
        counts[d.name] = (counts[d.name] || 0) + 1;
      }
      summary[cam.id] = Object.entries(counts)
        .map(([name, count]) => `${count}× ${name}`)
        .join(", ");
    }
    return summary;
  }, [cameras, detections]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* ━━━━━ Premium Command Center Header ━━━━━ */}
      <div className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur-2xl shadow-lg">
        <div className="container px-4 py-4 md:py-5 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex h-11 w-11 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 border-2 border-primary/30 animate-glow-pulse">
                <Shield className="h-6 w-6 md:h-7 md:w-7 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-3xl font-black tracking-tight flex items-center gap-2 md:gap-3">
                  <span className="truncate">Live Surveillance</span>
                  <span className="status-dot-pulse shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                  </span>
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1 truncate">
                  Real-time AI threat detection across all cameras
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              {/* AI Detection Status */}
              <div
                className={`status-badge text-[10px] md:text-xs ${
                  detectionStatus === "polling"
                    ? "status-badge-success"
                    : detectionStatus === "error"
                      ? "bg-red-500/10 border-red-500/30 text-red-500"
                      : "status-badge-info"
                }`}
              >
                <Radar className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span className="font-bold">
                  {detectionStatus === "polling"
                    ? "AI Active"
                    : detectionStatus === "error"
                      ? "Error"
                      : "Starting..."}
                </span>
              </div>

              {/* Alert count badge */}
              {activeAlerts.length > 0 && (
                <div className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-bold text-red-500 animate-pulse">
                  <AlertCircle className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  <span>
                    {activeAlerts.length} Alert
                    {activeAlerts.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {mounted && (
                <div className="hidden sm:flex status-badge bg-secondary/60 border-secondary font-mono text-sm px-4">
                  {currentTime.toLocaleTimeString("en-GB", { hour12: false })}
                </div>
              )}

              <div className="status-badge-info text-[10px] md:text-xs">
                <Shield className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span className="font-bold">{cameras.length}</span>
                <span className="hidden sm:inline">Active</span>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="glass-button gap-2"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Camera</span>
              </Button>

              {selectedCamera && (
                <Button
                  size="sm"
                  variant="outline"
                  className="glass-button gap-2"
                  onClick={() => {
                    setEditingCamera(selectedCamera);
                    setEditDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━━ Main Content ━━━━━ */}
      <div className="container px-4 py-6 md:px-6 md:py-8">
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="glass-panel h-12 p-1 grid w-full grid-cols-2">
            <TabsTrigger
              value="live"
              className="data-[state=active]:glass-card data-[state=active]:shadow-lg font-semibold"
            >
              Live Footage
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="data-[state=active]:glass-card data-[state=active]:shadow-lg font-semibold relative"
            >
              Active Alerts
              {activeAlerts.length > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {activeAlerts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              TAB 1: LIVE FOOTAGE — Direct video display, NO backend AI here
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <TabsContent value="live" className="space-y-6 mt-6">
            <Card className="glass-card border-2 overflow-hidden">
              <CardHeader className="pb-4 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      {selectedCamera?.name || "Select Camera"}
                      {selectedCamera && (
                        <Badge className="ml-2 text-xs bg-primary/10 border-primary/40 text-primary">
                          {selectedCamera.id.toUpperCase()}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1.5">
                      {selectedCamera?.url ||
                        "Choose a camera from the grid below"}
                    </CardDescription>
                  </div>
                  <div className="status-badge-success">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-bold">Live Feed</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* ── Direct video display — no AI processing mixed in ── */}
                {/* ── Direct MJPEG streaming using proxy — optimized for CPU ── */}
                <div className="relative aspect-video bg-black flex items-center justify-center">
                  {(() => {
                    const cam = selectedCamera || cameras[0];
                    if (!cam) return <div className="text-white">No camera selected</div>;
                    const proxyUrl = `/api/proxy?url=${encodeURIComponent(cam.url)}`;
                    
                    return (
                      <div className="relative w-full h-full group">
                        <img 
                          src={proxyUrl} 
                          alt={cam.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            // Only set once to avoid infinite loop
                            if (!target.getAttribute('data-error')) {
                              target.setAttribute('data-error', 'true');
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const overlay = document.createElement('div');
                                overlay.className = "absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-zinc-500 p-4 text-center";
                                overlay.innerHTML = `
                                  <svg class="h-12 w-12 mb-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                  </svg>
                                  <p class="font-bold text-zinc-300">Camera Connection Refused</p>
                                  <p class="text-sm mt-1">Check if IP Webcam is running on your phone at ${cam.url}</p>
                                `;
                                parent.appendChild(overlay);
                              }
                            }
                            console.error("Camera stream error: Connection refused or timeout at", cam.url);
                          }}
                        />
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-2 border-primary/20" />
                      </div>
                    );
                  })()}
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-black/60 hover:bg-black/60 border border-white/20 text-white"
                    >
                      {selectedCamera?.name || "Mobile Camera"}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-green-500/20 text-green-400 border border-green-500/40"
                    >
                      Live
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              TAB 2: ACTIVE ALERTS — Backend AI runs full-time here
              All cameras processed via batch endpoint (/detect/batch)
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <TabsContent value="alerts" className="min-h-[300px] space-y-6 mt-6">
            {/* ── AI Detection Status Card ── */}
            <Card className="glass-card border-2">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/30">
                      <Brain className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base md:text-lg">
                        Real-Time AI Threat Detection
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        All {cameras.length} cameras via batch detection (YOLOv8 + violence + fire)
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    className={`${
                      detectionStatus === "polling"
                        ? "bg-green-500/90 text-white border-0"
                        : detectionStatus === "error"
                          ? "bg-red-500/90 text-white border-0"
                          : "bg-blue-500/90 text-white border-0"
                    } shadow-lg`}
                  >
                    <span className="w-2 h-2 rounded-full mr-2 animate-pulse bg-white" />
                    {detectionStatus === "polling"
                      ? "Actively Scanning"
                      : detectionStatus === "error"
                        ? "Connection Error"
                        : "Initializing..."}
                  </Badge>
                </div>
              </CardHeader>

              {/* Per-camera detection summary */}
              <CardContent className="pt-0">
                {detectionError && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {detectionError}
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {cameras.map((cam) => {
                    const dets = detections.get(cam.id);
                    const hasDetections = dets && dets.length > 0;
                    return (
                      <div
                        key={cam.id}
                        className={`rounded-lg border p-2.5 text-xs transition-all ${
                          hasDetections
                            ? "bg-primary/5 border-primary/30"
                            : "bg-muted/30 border-border/50"
                        }`}
                      >
                        <div className="font-semibold truncate mb-1">
                          {cam.name}
                        </div>
                        <div
                          className={`${hasDetections ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {cameraDetectionSummary[cam.id] || "Waiting..."}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* ── Alerts List ── */}
            <Card className="glass-card border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Security Alerts
                      {activeAlerts.length > 0 && (
                        <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                          {activeAlerts.length}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {activeAlerts.length > 0
                        ? `${activeAlerts.length} active threat${activeAlerts.length > 1 ? "s" : ""} detected`
                        : "Monitoring all cameras for threats"}
                    </CardDescription>
                  </div>
                  {activeAlerts.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={handleClearAllAlerts}
                    >
                      <FilterX className="h-4 w-4" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {activeAlerts.length === 0 ? (
                  /* ── All clear state ── */
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500/10 border-2 border-green-500/30 mb-6">
                      <CheckCircle2 className="h-10 w-10 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
                      All Clear
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      No security threats detected across {cameras.length}{" "}
                      cameras. The AI detection system is continuously
                      monitoring all feeds via batch processing.
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Scanning every 15 seconds</span>
                    </div>
                  </div>
                ) : (
                  /* ── Alert cards ── */
                  <div className="space-y-3">
                    {activeAlerts.map((alert) => {
                      const meta = alertConfig[alert.label] || defaultAlertMeta;
                      const Icon = meta.icon;
                      return (
                        <div
                          key={alert.id}
                          className={`group flex items-start gap-4 rounded-xl border-2 p-4 transition-all duration-300 hover:shadow-lg ${meta.bgColor} ${meta.borderColor}`}
                        >
                          {/* Alert icon */}
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${meta.bgColor} ${meta.color}`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>

                          {/* Alert info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`font-bold text-sm uppercase tracking-wide ${meta.color}`}
                              >
                                {formatAlertLabel(alert.label)}
                              </span>
                              <Badge
                                className={`text-[10px] ${meta.severityColor} border-0`}
                              >
                                {meta.severity}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">
                                {alert.cameraName}
                              </span>
                              <span className="mx-1.5">•</span>
                              <span>
                                Confidence: {(alert.score * 100).toFixed(0)}%
                              </span>
                              <span className="mx-1.5">•</span>
                              <span>
                                {mounted ? formatTimeAgo(alert.ts) : ""}
                              </span>
                            </div>
                          </div>

                          {/* Dismiss button */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDismissAlert(alert.id)}
                          >
                            <AlarmCheck className="mr-1 h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Dismiss</span>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Dialogs ── */}
        <AddIpCameraDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onAdd={handleAddCamera}
        />
        <EditIpCameraDialog
          open={editDialogOpen}
          camera={editingCamera}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveCamera}
          onDelete={handleDeleteCamera}
        />
      </div>
    </div>
  );
}
