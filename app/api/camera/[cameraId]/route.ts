import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Base backend (FastAPI) URL can be overridden via env var
const BACKEND_BASE = process.env.CAMERA_BACKEND_URL || "http://localhost:8000";

// Optional predefined friendly IDs mapping to real backend IDs/paths
const CAMERA_ALIAS: Record<string, string> = {
  "main-entrance": "main-entrance",
  "parking-lot": "parking-lot",
  warehouse: "warehouse",
  "office-space": "office-space",
  "restricted-zone": "restricted-zone",
};

// Helper to build backend stream URL (MJPEG or similar)
function buildBackendUrl(cameraId: string) {
  const realId = CAMERA_ALIAS[cameraId] || cameraId;
  // Adjust path if your FastAPI uses a different route (e.g. /camera/{id}/stream)
  return `${BACKEND_BASE}/stream/${realId}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cameraId: string }> },
) {
  const { cameraId } = await params;
  if (!cameraId) {
    return NextResponse.json({ error: "cameraId required" }, { status: 400 });
  }

  const upstream = buildBackendUrl(cameraId);

  let upstreamResp: Response;
  try {
    upstreamResp = await fetch(upstream, {
      // Ensure no caching; we want the live stream
      cache: "no-store",
      // If backend is local & self-signed you may need:  // @ts-ignore
      // next: { revalidate: 0 }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to reach backend", detail: message },
      { status: 502 },
    );
  }

  if (!upstreamResp.ok || !upstreamResp.body) {
    return NextResponse.json(
      { error: "Backend stream unavailable", status: upstreamResp.status },
      { status: 502 },
    );
  }

  // Pass through content type (e.g. multipart/x-mixed-replace; boundary=frame or video/mp4)
  const contentType =
    upstreamResp.headers.get("content-type") || "application/octet-stream";

  // Remove potential hop-by-hop headers & build clean headers
  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });

  // Stream back directly (no 307 redirect now)
  return new Response(upstreamResp.body, { status: 200, headers });
}
