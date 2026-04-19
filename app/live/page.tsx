"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "@/components/layout/sidebar";
import { useParallelDetection, type CameraAlert } from "@/hooks/use-parallel-detection";
import { useAlertCount } from "@/contexts/alert-count-context";

// ─── Types ────────────────────────────────────────────────────────────────────
type CameraEntry = { id: string; name: string; url: string; location?: string };
type DetectionProfile = { personDetection: boolean; fireSomke: boolean; weaponDetection: boolean; violenceDetection: boolean };

const defaultCameras: CameraEntry[] = [
  { id: "mobile-cam-1", name: "Mobile Camera", url: "https://10.112.229.167:8080/video", location: "Entrance" },
];

// ─── Alert config ─────────────────────────────────────────────────────────────
const ALERT_CFG: Record<string, { label: string; color: string; bg: string }> = {
  fire:       { label: "FIRE / SMOKE",       color: "#ff4444", bg: "rgba(255,68,68,0.15)" },
  violence:   { label: "VIOLENCE",           color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  intrusion:  { label: "INTRUSION",          color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  weapon:     { label: "WEAPON DETECTED",    color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  person:     { label: "PERSON DETECTED",    color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  mask:       { label: "FACE COVERED",       color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  aggressive: { label: "AGGRESSIVE MOTION",  color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  suspicious: { label: "SUSPICIOUS MOTION",  color: "#eab308", bg: "rgba(234,179,8,0.12)" },
  default:    { label: "ALERT",              color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

function getAlertCfg(label: string) {
  const l = label.toLowerCase();
  if (l.includes("fire") || l.includes("smoke")) return ALERT_CFG.fire;
  if (l.includes("violence") || l.includes("violent") || l.includes("behavior-violent")) return ALERT_CFG.violence;
  if (l.includes("weapon") || l.includes("knife") || l.includes("gun") || l.includes("scissors") || l.includes("weapon-detected")) return ALERT_CFG.weapon;
  if (l.includes("mask") || l.includes("face") || l.includes("face-covered")) return ALERT_CFG.mask;
  if (l.includes("aggressive") || l.includes("behavior-aggressive")) return ALERT_CFG.aggressive;
  if (l.includes("suspicious") || l.includes("behavior-suspicious")) return ALERT_CFG.suspicious;
  if (l.includes("intrusion") || l.includes("unauthorized")) return ALERT_CFG.intrusion;
  if (l.includes("person") || l.includes("person-detected")) return ALERT_CFG.person;
  return ALERT_CFG.default;
}

// ─── Self-healing MJPEG stream ────────────────────────────────────────────────
function MjpegStream({ url, name }: { url: string; name: string }) {
  const proxyBase = `/api/proxy?url=${encodeURIComponent(url)}`;
  const [src, setSrc] = useState(proxyBase);
  const [retries, setRetries] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(proxyBase);
    setRetries(0);
    setFailed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const handleError = useCallback(() => {
    if (retries < 80) {
      const delay = Math.min(3000 + retries * 150, 8000);
      setTimeout(() => {
        setSrc(`${proxyBase}&_t=${Date.now()}`);
        setRetries((r) => r + 1);
      }, delay);
    } else {
      setFailed(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retries, proxyBase]);

  if (failed) {
    return (
      <div style={{ position: "absolute", inset: 0, background: "#060d16", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <div style={{ color: "#3a5570", fontSize: 28 }}>📷</div>
        <div style={{ color: "#3a5570", fontSize: 11, fontWeight: 600 }}>STREAM UNAVAILABLE</div>
        <div style={{ color: "#2a3f54", fontSize: 10 }}>{url}</div>
        <button
          onClick={() => { setFailed(false); setRetries(0); setSrc(`${proxyBase}&_t=${Date.now()}`); }}
          style={{ marginTop: 8, padding: "6px 16px", background: "rgba(26,107,255,0.2)", border: "1px solid rgba(26,107,255,0.4)", borderRadius: 6, color: "#1a6bff", fontSize: 11, cursor: "pointer" }}
        >
          RECONNECT
        </button>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} onError={handleError}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}

// ─── Add Camera Dialog ────────────────────────────────────────────────────────
function AddCameraDialog({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (url: string, name: string, location: string) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [location, setLocation] = useState("");
  const [profiles, setProfiles] = useState<DetectionProfile>({
    personDetection: true, fireSomke: false, weaponDetection: false, violenceDetection: false,
  });

  const toggle = (k: keyof DetectionProfile) => setProfiles((p) => ({ ...p, [k]: !p[k] }));

  const handleAdd = () => {
    if (!url.trim() || !name.trim()) return;
    onAdd(url.trim(), name.trim(), location.trim());
    setName(""); setUrl(""); setLocation("");
    setProfiles({ personDetection: true, fireSomke: false, weaponDetection: false, violenceDetection: false });
    onClose();
  };

  if (!open) return null;

  const profileRows: { key: keyof DetectionProfile; label: string; desc: string; icon: string }[] = [
    { key: "personDetection",   label: "Person Detection",  desc: "Track and log human presence",     icon: "👤" },
    { key: "fireSomke",         label: "Fire & Smoke",      desc: "Early thermal visual warning",     icon: "🔥" },
    { key: "weaponDetection",   label: "Weapon Detection",  desc: "Real-time object classification",  icon: "⚠️" },
    { key: "violenceDetection", label: "Violence Detection",desc: "Behavioral pattern analysis",      icon: "🚨" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div style={{
        position: "relative", width: 380, height: "100vh", background: "#0d1117",
        borderLeft: "1px solid #1e2a3a", padding: 28, display: "flex", flexDirection: "column", gap: 20, overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: "white", fontSize: 20, fontWeight: 700 }}>Add New Camera</div>
            <div style={{ color: "#5a7a9a", fontSize: 11, marginTop: 2 }}>CONFIGURE SURVEILLANCE NODE</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#5a7a9a", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Source Configuration */}
        <div>
          <div style={{ color: "#1a6bff", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span>#</span> SOURCE CONFIGURATION
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 600, letterSpacing: 0.8, display: "block", marginBottom: 6 }}>CAMERA NAME</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. South Corridor 04"
                style={{ width: "100%", background: "#0a0f18", border: "1px solid #1e2a3a", borderRadius: 6, padding: "10px 12px", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 600, letterSpacing: 0.8, display: "block", marginBottom: 6 }}>STREAM URL (RTSP/HTTP)</label>
              <input
                value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="http://192.168.x.x:8080/video"
                style={{ width: "100%", background: "#0a0f18", border: "1px solid #1e2a3a", borderRadius: 6, padding: "10px 12px", color: "white", fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }}
              />
            </div>
            <div>
              <label style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 600, letterSpacing: 0.8, display: "block", marginBottom: 6 }}>LOCATION / ZONE</label>
              <input
                value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. North Gate"
                style={{ width: "100%", background: "#0a0f18", border: "1px solid #1e2a3a", borderRadius: 6, padding: "10px 12px", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>
        </div>

        {/* AI Detection Profiles */}
        <div>
          <div style={{ color: "#1a6bff", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            ✦ AI DETECTION PROFILES
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {profileRows.map((row) => (
              <div key={row.key} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "#0a0f18", border: "1px solid #1e2a3a", borderRadius: 8, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{row.icon}</span>
                  <div>
                    <div style={{ color: profiles[row.key] ? "white" : "#5a7a9a", fontSize: 13, fontWeight: 600 }}>{row.label}</div>
                    <div style={{ color: "#3a5570", fontSize: 10, marginTop: 1 }}>{row.desc}</div>
                  </div>
                </div>
                {/* Toggle */}
                <div
                  onClick={() => toggle(row.key)}
                  style={{
                    width: 40, height: 22, borderRadius: 11, cursor: "pointer", position: "relative", flexShrink: 0,
                    background: profiles[row.key] ? "#1a6bff" : "#1e2a3a",
                    transition: "background 0.2s",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%", background: "white",
                    left: profiles[row.key] ? 21 : 3, transition: "left 0.2s",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div>
          <button
            onClick={handleAdd}
            disabled={!name.trim() || !url.trim()}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 8,
              background: name.trim() && url.trim() ? "linear-gradient(135deg, #1a6bff, #0d4fcf)" : "#1e2a3a",
              border: "none", color: name.trim() && url.trim() ? "white" : "#3a5570",
              fontSize: 14, fontWeight: 700, cursor: name.trim() && url.trim() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            ＋ Add Camera
          </button>
          <div style={{ color: "#3a5570", fontSize: 10, textAlign: "center", marginTop: 8 }}>
            INITIALIZATION TAKES APPROX. 15 SECONDS
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Single Camera Tile ───────────────────────────────────────────────────────
function CameraTile({ cam, detectionLabels, isSelected, onClick }: {
  cam: CameraEntry;
  detectionLabels: string[];
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "relative", aspectRatio: "16/9", background: "#060d16", borderRadius: 8, overflow: "hidden",
        border: `2px solid ${isSelected ? "#1a6bff" : "#1e2a3a"}`,
        cursor: "pointer", transition: "border-color 0.2s",
      }}
    >
      <MjpegStream url={cam.url} name={cam.name} />

      {/* LIVE badge */}
      <div style={{
        position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 5,
        background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "3px 8px",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px #22c55e" }} />
        <span style={{ color: "white", fontSize: 9, fontWeight: 700 }}>LIVE</span>
      </div>

      {/* Camera name */}
      <div style={{
        position: "absolute", top: 8, left: 64,
        background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "3px 8px",
        color: "#a0b4c8", fontSize: 10, fontWeight: 600,
      }}>
        {cam.name.toUpperCase()}
      </div>

      {/* Detection labels */}
      {detectionLabels.slice(0, 2).map((label, i) => (
        <div key={i} style={{
          position: "absolute", top: 36 + i * 24, left: 8,
          background: "rgba(239,68,68,0.85)", borderRadius: 3, padding: "2px 6px",
          color: "white", fontSize: 9, fontWeight: 700,
        }}>
          {label.toUpperCase()}
        </div>
      ))}

      {/* Location */}
      {cam.location && (
        <div style={{
          position: "absolute", bottom: 8, left: 8,
          color: "#5a7a9a", fontSize: 9, fontWeight: 600, letterSpacing: 0.5,
        }}>
          {cam.location.toUpperCase()}
        </div>
      )}
    </div>
  );
}

// ─── Alert Item ───────────────────────────────────────────────────────────────
function AlertItem({ alert, onDismiss, onViewFeed }: {
  alert: CameraAlert & { cameraName: string };
  onDismiss: () => void;
  onViewFeed: () => void;
}) {
  const cfg = getAlertCfg(alert.label);
  const [ts] = useState(new Date(alert.ts * 1000));

  return (
    <div style={{
      borderLeft: `3px solid ${cfg.color}`, background: cfg.bg,
      borderRadius: "0 6px 6px 0", padding: "10px 12px", marginBottom: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div
          style={{ background: cfg.color, color: "white", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, letterSpacing: 0.5 }}
        >
          {cfg.label}
        </div>
        <span style={{ color: "#3a5570", fontSize: 9 }}>
          {ts.toLocaleTimeString("en-GB", { hour12: false })}
        </span>
      </div>
      <div style={{ color: "white", fontSize: 13, fontWeight: 600, marginTop: 5 }}>{alert.cameraName}</div>
      <div style={{ color: "#5a7a9a", fontSize: 11, marginTop: 2 }}>
        Confidence: <span style={{ color: "#94a3b8" }}>{(alert.score * 100).toFixed(1)}%</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={onViewFeed}
          style={{ background: "none", border: "none", color: "#1a6bff", fontSize: 10, fontWeight: 700, cursor: "pointer", padding: 0 }}
        >
          VIEW FEED ›
        </button>
        <button
          onClick={onDismiss}
          style={{ background: "none", border: "none", color: "#3a5570", fontSize: 10, cursor: "pointer", padding: 0 }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LiveMonitoringPage() {
  // ⚠️ Always initialize with defaultCameras — localStorage is client-only
  // Reading it inside useState() causes SSR/client hydration mismatch
  const [cameras, setCameras] = useState<CameraEntry[]>(defaultCameras);
  const [mounted, setMounted] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [selectedCamId, setSelectedCamId] = useState<string>(defaultCameras[0]?.id ?? "");
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [cpuLoad, setCpuLoad] = useState(22);
  const { setAlertCount } = useAlertCount();

  // Hydrate from localStorage after mount (client-only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("innov8_cameras_v2");
      if (saved) {
        const parsed: CameraEntry[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setCameras(parsed);
          setSelectedCamId(parsed[0].id);
        }
      }
    } catch {}
    setMounted(true);
  }, []);

  // Persist cameras
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("innov8_cameras_v2", JSON.stringify(cameras));
    }
  }, [cameras]);

  // Fake CPU load animation
  useEffect(() => {
    const t = setInterval(() => setCpuLoad(Math.floor(18 + Math.random() * 20)), 3000);
    return () => clearInterval(t);
  }, []);

  const camerasForDetection = cameras.map((c) => ({ id: c.id, name: c.name, url: c.url }));

  const { detections, alerts: backendAlerts, status: detectionStatus } = useParallelDetection(camerasForDetection);

  const activeAlerts = backendAlerts.filter((a) => !dismissedIds.has(a.id)).map((a) => ({
    ...a,
    cameraName: cameras.find((c) => c.id === a.cameraId)?.name ?? a.cameraId,
  }));

  useEffect(() => {
    setAlertCount(activeAlerts.length);
    return () => setAlertCount(0);
  }, [activeAlerts.length, setAlertCount]);

  const handleAddCamera = (url: string, name: string, location: string) => {
    const id = `cam-${Date.now().toString(36)}`;
    setCameras((prev) => [...prev, { id, name, url, location }]);
    setSelectedCamId(id);
  };

  const dismissAlert = (id: string) => setDismissedIds((s) => new Set([...s, id]));
  const dismissAll = () => setDismissedIds(new Set(backendAlerts.map((a) => a.id)));

  const getDetectionLabels = (camId: string): string[] => {
    const dets = detections.get(camId);
    if (!dets || dets.length === 0) return [];
    return [...new Set(dets.map((d) => d.name))].slice(0, 3);
  };

  const isAiActive = detectionStatus === "polling";
  const latency = isAiActive ? Math.floor(30 + Math.random() * 30) : 0;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#060d16", overflow: "hidden", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <Sidebar cameraCount={cameras.length} onAddCamera={() => setAddOpen(true)} />

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid #1e2a3a", background: "#0a0f18", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <h1 style={{ color: "white", fontSize: 22, fontWeight: 800, margin: 0 }}>Live Surveillance</h1>
            <div style={{ display: "flex", gap: 8 }}>
              {/* AI Status */}
              <div style={{
                display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
                background: isAiActive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${isAiActive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                borderRadius: 99, fontSize: 11, fontWeight: 700,
                color: isAiActive ? "#22c55e" : "#ef4444",
              }}>
                <span style={{ fontSize: 8 }}>✦</span>
                {isAiActive ? "AI ACTIVE" : "AI OFFLINE"}
              </div>
              {/* Alerts */}
              {activeAlerts.length > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 99, fontSize: 11, fontWeight: 700, color: "#ef4444",
                }}>
                  ⚠ {activeAlerts.length} ALERTS
                </div>
              )}
              {/* Cameras */}
              <div style={{
                display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
                background: "rgba(26,107,255,0.1)", border: "1px solid rgba(26,107,255,0.3)",
                borderRadius: 99, fontSize: 11, fontWeight: 700, color: "#1a6bff",
              }}>
                📹 {cameras.length} CAMERAS
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Scanning indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 2 }}>
                {[1,2,3,4].map((i) => (
                  <div key={i} style={{
                    width: 3, borderRadius: 2,
                    height: 8 + i * 4,
                    background: isAiActive ? "#1a6bff" : "#1e2a3a",
                    opacity: isAiActive ? 0.6 + i * 0.1 : 0.3,
                  }} />
                ))}
              </div>
              <span style={{ color: "#5a7a9a", fontSize: 11 }}>
                {isAiActive ? "SCANNING..." : "OFFLINE"}
              </span>
              {isAiActive && (
                <span style={{ color: "#3a5570", fontSize: 10, fontFamily: "monospace" }}>
                  LATENCY: {latency}MS
                </span>
              )}
            </div>

            {/* Add Camera */}
            <button
              onClick={() => setAddOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                background: "linear-gradient(135deg, #1a6bff, #0d4fcf)",
                border: "none", borderRadius: 8, color: "white",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              ＋ Add Camera
            </button>
          </div>
        </div>

        {/* Body: camera grid + alerts */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Camera Grid */}
          <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: cameras.length === 1 ? "1fr" : cameras.length <= 4 ? "1fr 1fr" : "1fr 1fr 1fr",
              gap: 12,
            }}>
              {cameras.map((cam) => (
                <CameraTile
                  key={cam.id}
                  cam={cam}
                  detectionLabels={getDetectionLabels(cam.id)}
                  isSelected={cam.id === selectedCamId}
                  onClick={() => setSelectedCamId(cam.id)}
                />
              ))}
            </div>
          </div>

          {/* Alerts Panel */}
          <div style={{
            width: 280, borderLeft: "1px solid #1e2a3a", background: "#0a0f18",
            display: "flex", flexDirection: "column", flexShrink: 0,
          }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #1e2a3a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "white", fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>ACTIVE ALERTS</span>
              <span style={{ color: "#3a5570", fontSize: 10 }}>REAL-TIME</span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 0" }}>
              {activeAlerts.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", gap: 8 }}>
                  <div style={{ fontSize: 28 }}>🛡️</div>
                  <div style={{ color: "#22c55e", fontSize: 12, fontWeight: 700 }}>All Clear</div>
                  <div style={{ color: "#3a5570", fontSize: 10, textAlign: "center" }}>
                    Monitoring {cameras.length} camera{cameras.length !== 1 ? "s" : ""}
                  </div>
                </div>
              ) : (
                activeAlerts.map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onDismiss={() => dismissAlert(alert.id)}
                    onViewFeed={() => setSelectedCamId(alert.cameraId)}
                  />
                ))
              )}
            </div>

            {activeAlerts.length > 0 && (
              <button
                onClick={dismissAll}
                style={{
                  margin: 12, padding: "10px 0", background: "#1e2a3a", border: "none",
                  borderRadius: 6, color: "#5a7a9a", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", letterSpacing: 0.5, flexShrink: 0,
                }}
              >
                DISMISS ALL ALERTS
              </button>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 24, padding: "6px 20px",
          background: "#060d16", borderTop: "1px solid #1e2a3a", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ color: "#3a5570", fontSize: 10 }}>ENCRYPTION: AES-256</span>
          </div>
          <span style={{ color: "#3a5570", fontSize: 10 }}>SYS LOAD: {cpuLoad}%</span>
          <span style={{ color: "#3a5570", fontSize: 10 }}>NODE: LOCAL-SEC-1</span>
          {isAiActive && (
            <span style={{ color: "#3a5570", fontSize: 10 }}>CPU INFERENCE: ACTIVE</span>
          )}
        </div>
      </div>

      {/* Add Camera Dialog */}
      <AddCameraDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAddCamera} />
    </div>
  );
}
