"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ParticleBackground from "@/components/layout/particle-background";

// Dashboard pages that have their own sidebar layout
const DASHBOARD_PATHS = ["/live", "/alerts", "/dashboard", "/analytics", "/system", "/logs"];

function isDashboard(pathname: string) {
  return DASHBOARD_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isDashboard(pathname)) {
    // Dashboard pages: full height, no header/footer (sidebar is inside the page)
    return (
      <div style={{ height: "100vh", overflow: "hidden", background: "#060d16" }}>
        {children}
      </div>
    );
  }

  // Marketing/public pages: keep original header + footer + particle background
  return (
    <>
      <ParticleBackground />
      <div className="flex flex-col min-h-screen relative">
        <Header />
        <main className="flex-grow relative z-10 surface-gradient">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}
