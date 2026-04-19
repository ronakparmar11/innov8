import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Prefer server-only CAMERA_BACKEND_URL (direct IP, bypasses Cloudflare)
const BACKEND_BASE =
  process.env.CAMERA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_CAMERA_BACKEND_URL ||
  "https://api1.yashpatelis.online";

// Simple in-memory cache to prevent duplicate detections on same image
// Maps URL + conf to cached result. Cache expires after 10 seconds.
const detectionCache = new Map<string, { result: unknown; timestamp: number }>();
const CACHE_TTL_MS = 15000; // 15 second cache (matches poll interval)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, conf = 0.5 } = body as { url?: string; conf?: number };

    if (!url) {
      return NextResponse.json(
        { error: "url parameter required" },
        { status: 400 },
      );
    }

    // Create cache key from URL and confidence threshold
    const cacheKey = `${url}:${conf}`;

    // Check cache first
    const cached = detectionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[detect] Cache hit for ${url}`);
      return NextResponse.json(cached.result);
    }

    console.log(`[detect] URL: ${url}, conf: ${conf}`);

    try {
      // Forward to backend's /detect/url endpoint
      console.log(`[detect] Forwarding to ${BACKEND_BASE}/detect/url`);
      const response = await fetch(`${BACKEND_BASE}/detect/url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SecureSight-Frontend/1.0 (Server-Side; Next.js)",
        },
        body: JSON.stringify({ url, conf }),
        signal: AbortSignal.timeout(30000), // 30 second timeout for YOLO inference
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[detect] Backend returned ${response.status}: ${text}`);
        return NextResponse.json(
          { error: `Backend error: ${response.status}`, detail: text },
          { status: response.status },
        );
      }

      const detections = await response.json();
      console.log(`[detect] Success, got ${detections.person_count} people`);

      // Cache the result
      detectionCache.set(cacheKey, { result: detections, timestamp: Date.now() });

      // Clean up old cache entries to prevent memory leak
      if (detectionCache.size > 100) {
        const now = Date.now();
        for (const [key, value] of detectionCache.entries()) {
          if (now - value.timestamp > CACHE_TTL_MS) {
            detectionCache.delete(key);
          }
        }
      }

      return NextResponse.json(detections);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[detect] Forwarding to backend failed: ${message}`);
      return NextResponse.json(
        { error: "Detection failed", detail: message },
        { status: 500 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[detect] Error: ${message}`);
    return NextResponse.json(
      { error: "Detection failed", detail: message },
      { status: 500 },
    );
  }
}
