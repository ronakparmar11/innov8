"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Video,
  Star,
  BarChart2,
  Activity,
  HelpCircle,
  FileText,
  Plus,
  Shield,
  Dot,
} from "lucide-react";

const navItems = [
  { label: "DASHBOARD", icon: LayoutDashboard, href: "/dashboard" },
  { label: "CAMERA FEEDS", icon: Video, href: "/live" },
  { label: "INCIDENT LOGS", icon: Star, href: "/alerts" },
  { label: "AI ANALYTICS", icon: BarChart2, href: "/analytics" },
  { label: "SYSTEM HEALTH", icon: Activity, href: "/system" },
];

const bottomItems = [
  { label: "SUPPORT", icon: HelpCircle, href: "/contact" },
  { label: "LOGS", icon: FileText, href: "/logs" },
];

interface SidebarProps {
  cameraCount?: number;
  onAddCamera?: () => void;
}

export default function Sidebar({ cameraCount = 0, onAddCamera }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 200,
        minWidth: 200,
        background: "#0d1117",
        borderRight: "1px solid #1e2a3a",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #1e2a3a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #1a6bff, #0d4fcf)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={18} color="white" />
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 14, lineHeight: 1 }}>
              SecureSight
            </div>
            <div style={{ color: "#5a7a9a", fontSize: 9, marginTop: 2 }}>AI SURVEILLANCE</div>
          </div>
        </div>
      </div>

      {/* Active Nodes */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #1e2a3a" }}>
        <div style={{ color: "#5a7a9a", fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>
          ACTIVE NODES
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 6px #22c55e",
            }}
          />
          <span style={{ color: "#a0b4c8", fontSize: 12 }}>
            {cameraCount} Camera{cameraCount !== 1 ? "s" : ""} Online
          </span>
        </div>
      </div>

      {/* Main Nav */}
      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href === "/live" && pathname.startsWith("/live"));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                color: active ? "white" : "#5a7a9a",
                background: active ? "rgba(26,107,255,0.15)" : "transparent",
                borderLeft: active ? "3px solid #1a6bff" : "3px solid transparent",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.8,
                textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Add Camera */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #1e2a3a" }}>
        <button
          onClick={onAddCamera}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 0",
            background: "linear-gradient(135deg, #1a6bff, #0d4fcf)",
            border: "none",
            borderRadius: 8,
            color: "white",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Plus size={14} />
          ADD CAMERA
        </button>
      </div>

      {/* Bottom Nav */}
      <div style={{ paddingBottom: 8 }}>
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px",
              color: "#3a5570",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.8,
              textDecoration: "none",
            }}
          >
            <item.icon size={13} />
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
