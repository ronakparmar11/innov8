"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/sidebar";

type AlertRow = {
  id: string;
  ts: Date;
  camera: string;
  type: string;
  typeColor: string;
  typeBg: string;
  confidence: number;
  severity: "CRITICAL" | "HIGH" | "INFO";
};

const TYPE_CFG: Record<string, { color: string; bg: string }> = {
  "WEAPON DETECTED":     { color: "#ef4444", bg: "rgba(239,68,68,0.2)" },
  "UNAUTHORIZED ACCESS": { color: "#f97316", bg: "rgba(249,115,22,0.2)" },
  "VEHICLE ENTRANCE":    { color: "#3b82f6", bg: "rgba(59,130,246,0.2)" },
  "FIRE / SMOKE":        { color: "#ef4444", bg: "rgba(239,68,68,0.2)" },
  "PERSON DETECTED":     { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  "FACE COVERED":        { color: "#a855f7", bg: "rgba(168,85,247,0.2)" },
};

function makeRows(): AlertRow[] {
  const types = Object.keys(TYPE_CFG);
  const cameras = ["CAM-042 (North Gate)", "CAM-009 (Main Lobby)", "CAM-015 (Storage A)", "CAM-081 (Perimeter E)", "CAM-023 (Server Room)", "CAM-011 (Parking Lot A)"];
  const severities: AlertRow["severity"][] = ["CRITICAL", "HIGH", "INFO", "CRITICAL", "HIGH", "INFO"];
  const rows: AlertRow[] = [];
  for (let i = 0; i < 25; i++) {
    const t = types[i % types.length];
    rows.push({
      id: `alert-${i}`,
      ts: new Date(Date.now() - i * 90_000 - Math.random() * 60_000),
      camera: cameras[i % cameras.length],
      type: t,
      typeColor: TYPE_CFG[t].color,
      typeBg: TYPE_CFG[t].bg,
      confidence: 70 + Math.random() * 29,
      severity: severities[i % severities.length],
    });
  }
  return rows;
}

export default function AlertsPage() {
  // ⚠️ Initialize with empty array on server — populate on client to avoid Date.now() mismatch
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [mounted, setMounted] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<Set<string>>(new Set(["CRITICAL", "HIGH", "INFO"]));
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  useEffect(() => {
    // Populate rows on client only — avoids Date.now()/Math.random() SSR mismatch
    setRows(makeRows());
    setMounted(true);
  }, []);

  const toggleSeverity = (s: string) => {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const filtered = rows.filter((r) => severityFilter.has(r.severity) && (typeFilter === "All Types" || r.type === typeFilter));
  const total = filtered.length;
  const pages = Math.ceil(total / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Stats
  const lastHourAlerts = rows.filter((r) => r.ts > new Date(Date.now() - 3_600_000)).length;
  const fireCount = rows.filter((r) => r.type === "FIRE / SMOKE").length;
  const intrusionCount = rows.filter((r) => r.type === "UNAUTHORIZED ACCESS").length;
  const loiteringCount = rows.filter((r) => r.type === "VEHICLE ENTRANCE").length;
  const totalForPct = fireCount + intrusionCount + loiteringCount;

  const formatTs = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.toLocaleDateString("en-GB")} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const formatAgo = (d: Date) => {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return `${s} seconds ago`;
    if (s < 3600) return `${Math.floor(s / 60)} minutes ago`;
    return `${Math.floor(s / 3600)} hours ago`;
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#060d16", overflow: "hidden", fontFamily: "Inter, system-ui, sans-serif" }}>
      <Sidebar cameraCount={0} />

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ color: "white", fontSize: 26, fontWeight: 800, margin: 0 }}>Alert History</h1>
            <p style={{ color: "#5a7a9a", fontSize: 13, margin: "4px 0 0" }}>
              Review and manage AI-detected security incidents across all nodes.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#0a0f18", border: "1px solid #1e2a3a", borderRadius: 8, color: "#a0b4c8", fontSize: 12, cursor: "pointer" }}>
              ↓ Export CSV
            </button>
            <button
              onClick={() => setRows(makeRows())}
              style={{ padding: "8px 12px", background: "#0a0f18", border: "1px solid #1e2a3a", borderRadius: 8, color: "#a0b4c8", fontSize: 14, cursor: "pointer" }}
            >
              ↻
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {/* Date range */}
          <div style={{ background: "#0a0f18", border: "1px solid #1e2a3a", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 600 }}>DATE RANGE</span>
            <select style={{ background: "none", border: "none", color: "#a0b4c8", fontSize: 12, outline: "none", cursor: "pointer" }}>
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>

          {/* Alert type */}
          <div style={{ background: "#0a0f18", border: "1px solid #1e2a3a", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 600 }}>ALERT TYPE</span>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              style={{ background: "none", border: "none", color: "#a0b4c8", fontSize: 12, outline: "none", cursor: "pointer" }}
            >
              <option>All Types</option>
              {Object.keys(TYPE_CFG).map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Severity */}
          <div style={{ background: "#0a0f18", border: "1px solid #1e2a3a", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 600 }}>SEVERITY</span>
            {["CRITICAL", "HIGH", "INFO"].map((s) => (
              <button
                key={s}
                onClick={() => { toggleSeverity(s); setPage(1); }}
                style={{
                  padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: "pointer", border: "none",
                  background: severityFilter.has(s)
                    ? s === "CRITICAL" ? "#ef4444" : s === "HIGH" ? "#f97316" : "#3b82f6"
                    : "#1e2a3a",
                  color: severityFilter.has(s) ? "white" : "#3a5570",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Node group */}
          <div style={{ background: "#0a0f18", border: "1px solid #1e2a3a", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <span style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 600 }}>NODE GROUP</span>
            <select style={{ background: "none", border: "none", color: "#a0b4c8", fontSize: 12, outline: "none", cursor: "pointer" }}>
              <option>All Locations</option>
              <option>Zone A</option>
              <option>Zone B</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "#0a0f18", border: "1px solid #1e2a3a", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "180px 1fr 1fr 120px 90px 100px",
            padding: "10px 16px", borderBottom: "1px solid #1e2a3a",
            color: "#3a5570", fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
          }}>
            <span>TIMESTAMP</span>
            <span>CAMERA NODE</span>
            <span>DETECTION TYPE</span>
            <span>CONFIDENCE</span>
            <span>STATUS</span>
            <span>ACTIONS</span>
          </div>

          {paged.map((row, i) => (
            <div
              key={row.id}
              style={{
                display: "grid", gridTemplateColumns: "180px 1fr 1fr 120px 90px 100px",
                padding: "14px 16px", borderBottom: i < paged.length - 1 ? "1px solid #1e2a3a" : "none",
                alignItems: "center",
              }}
            >
              <div>
                <div suppressHydrationWarning style={{ color: "#a0b4c8", fontSize: 12, fontFamily: "monospace" }}>
                  {mounted ? `${formatTs(row.ts).split(" ")[0]}, ${formatTs(row.ts).split(" ")[1]}` : "--"}
                </div>
                <div suppressHydrationWarning style={{ color: "#3a5570", fontSize: 10, marginTop: 2 }}>
                  {mounted ? formatAgo(row.ts) : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, background: "#1e2a3a", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  📷
                </div>
                <span style={{ color: "#a0b4c8", fontSize: 12 }}>{row.camera}</span>
              </div>
              <div>
                <span style={{
                  background: row.typeBg, color: row.typeColor,
                  padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                }}>
                  {row.type}
                </span>
              </div>
              <div>
                <div style={{ height: 4, background: "#1e2a3a", borderRadius: 2, marginBottom: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${row.confidence}%`, background: row.typeColor, borderRadius: 2 }} />
                </div>
                <span style={{ color: "#a0b4c8", fontSize: 11 }}>{row.confidence.toFixed(1)}%</span>
              </div>
              <div>
                <span style={{
                  padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, border: "1px solid",
                  color: row.severity === "CRITICAL" ? "#ef4444" : row.severity === "HIGH" ? "#f97316" : "#3b82f6",
                  borderColor: row.severity === "CRITICAL" ? "rgba(239,68,68,0.3)" : row.severity === "HIGH" ? "rgba(249,115,22,0.3)" : "rgba(59,130,246,0.3)",
                  background: row.severity === "CRITICAL" ? "rgba(239,68,68,0.1)" : row.severity === "HIGH" ? "rgba(249,115,22,0.1)" : "rgba(59,130,246,0.1)",
                }}>
                  {row.severity}
                </span>
              </div>
              <button style={{ background: "none", border: "none", color: "#1a6bff", fontSize: 11, fontWeight: 700, cursor: "pointer", textAlign: "left", padding: 0 }}>
                VIEW FEED
              </button>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ color: "#5a7a9a", fontSize: 12 }}>
            Showing {Math.min((page - 1) * PER_PAGE + 1, total)} to {Math.min(page * PER_PAGE, total)} of {total} incidents
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              style={{ width: 32, height: 32, borderRadius: 6, background: "#0a0f18", border: "1px solid #1e2a3a", color: page === 1 ? "#3a5570" : "#a0b4c8", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 14 }}>
              ‹
            </button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: p === page ? "#1a6bff" : "#0a0f18",
                  borderColor: p === page ? "#1a6bff" : "#1e2a3a",
                  color: p === page ? "white" : "#5a7a9a" }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
              style={{ width: 32, height: 32, borderRadius: 6, background: "#0a0f18", border: "1px solid #1e2a3a", color: page === pages ? "#3a5570" : "#a0b4c8", cursor: page === pages ? "not-allowed" : "pointer", fontSize: 14 }}>
              ›
            </button>
          </div>
        </div>

        {/* Bottom analytics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Geographic */}
          <div style={{ background: "#0a0f18", border: "1px solid #1e2a3a", borderRadius: 10, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>GEOGRAPHIC DISTRIBUTION</span>
              <span style={{ padding: "2px 8px", background: "rgba(26,107,255,0.1)", border: "1px solid rgba(26,107,255,0.2)", borderRadius: 99, color: "#1a6bff", fontSize: 9, fontWeight: 700 }}>LIVE TRACKING</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[{ zone: "ZONE A", count: 12, pct: 74 }, { zone: "ZONE B", count: 4, pct: 25 }].map((z) => (
                <div key={z.zone}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: z.zone === "ZONE A" ? "#ef4444" : "#f97316" }} />
                      <span style={{ color: "#a0b4c8", fontSize: 11 }}>{z.zone}: {z.count} ALERTS</span>
                    </div>
                    <span style={{ color: "#5a7a9a", fontSize: 10 }}>{z.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: "#1e2a3a", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${z.pct}%`, background: z.zone === "ZONE A" ? "#ef4444" : "#f97316", borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Placeholder map */}
            <div style={{ marginTop: 16, height: 100, background: "#060d16", borderRadius: 6, border: "1px solid #1e2a3a", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
              {[...Array(20)].map((_, i) => (
                <div key={i} style={{ position: "absolute", width: 3, height: 3, borderRadius: "50%", background: "#1e2a3a",
                  left: `${5 + (i % 5) * 20}%`, top: `${10 + Math.floor(i / 5) * 25}%` }} />
              ))}
              <div style={{ position: "absolute", left: "30%", top: "40%", width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444" }} />
              <div style={{ position: "absolute", left: "65%", top: "25%", width: 6, height: 6, borderRadius: "50%", background: "#f97316", boxShadow: "0 0 6px #f97316" }} />
            </div>
          </div>

          {/* Incident Velocity */}
          <div style={{ background: "#0a0f18", border: "1px solid #1e2a3a", borderRadius: 10, padding: 20 }}>
            <span style={{ color: "#5a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1, display: "block", marginBottom: 12 }}>INCIDENT VELOCITY</span>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 6 }}>
              <span style={{ color: "white", fontSize: 36, fontWeight: 800 }}>{lastHourAlerts}</span>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: "#22c55e", fontSize: 11 }}>↗ +12%</span>
              </div>
            </div>
            <span style={{ color: "#5a7a9a", fontSize: 10 }}>ALERTS IN LAST HOUR</span>

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "FIRE & SMOKE", count: fireCount, color: "#ef4444" },
                { label: "INTRUSION", count: intrusionCount, color: "#3b82f6" },
                { label: "LOITERING", count: loiteringCount, color: "#f97316" },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "#5a7a9a", fontSize: 10 }}>{item.label}</span>
                    <span style={{ color: "#a0b4c8", fontSize: 10 }}>
                      {totalForPct > 0 ? ((item.count / totalForPct) * 100).toFixed(1) : "0"}%
                    </span>
                  </div>
                  <div style={{ height: 3, background: "#1e2a3a", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: totalForPct > 0 ? `${(item.count / totalForPct) * 100}%` : "0%", background: item.color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 16, padding: 12, background: "#060d16", borderRadius: 6,
              borderLeft: "3px solid #1a6bff", color: "#5a7a9a", fontSize: 11, fontStyle: "italic",
            }}>
              "AI systems are reporting higher than average activity. Recommend secondary verification."
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
