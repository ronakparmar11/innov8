import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Prefer server-only CAMERA_BACKEND_URL (direct IP, bypasses Cloudflare)
const BACKEND_BASE =
  process.env.CAMERA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_CAMERA_BACKEND_URL ||
  "http://localhost:8000";

// Cache for parallel detection results
const detectionCache = new Map<string, { result: unknown; timestamp: number }>();
const CACHE_TTL_MS = 100; // Disable heavy caching for real-time alerts

type DetectAllRequest = {
  cameras: { [cameraId: string]: string };
  conf?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DetectAllRequest;
    const { cameras, conf = 0.5 } = body;

    if (!cameras || Object.keys(cameras).length === 0) {
      return NextResponse.json(
        { error: "cameras object required with at least one camera" },
        { status: 400 },
      );
    }

    console.log(
      `[detect-all] Processing ${Object.keys(cameras).length} cameras`,
    );

    try {
      // Process all cameras in parallel on backend
      const detections: { [cameraId: string]: unknown } = {};

      // Create cache key for all cameras
      const cacheKey = `parallel:${Object.entries(cameras)
        .sort()
        .map(([id, url]) => `${id}:${url}:${conf}`)
        .join("|")}`;

      // Check cache first
      const cached = detectionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        console.log(`[detect-all] Cache hit for parallel request`);
        return NextResponse.json({ alerts: cached.result });
      }

      // Send all cameras to backend at once for parallel processing
      const response = await fetch(`${BACKEND_BASE}/detect/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SecureSight-Frontend/1.0 (Server-Side; Next.js)",
        },
        body: JSON.stringify({ cameras, conf }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        // Fallback: process cameras individually
        console.warn(
          `[detect-all] Batch endpoint failed (${response.status}), falling back to individual processing`,
        );

        // Process each camera individually in parallel
        const results = await Promise.allSettled(
          Object.entries(cameras).map(async ([cameraId, url]) => {
            const cacheKeyIndividual = `${url}:${conf}`;
            const cachedIndividual = detectionCache.get(cacheKeyIndividual);
            if (
              cachedIndividual &&
              Date.now() - cachedIndividual.timestamp < CACHE_TTL_MS
            ) {
              return { cameraId, result: cachedIndividual.result };
            }

            const res = await fetch(`${BACKEND_BASE}/detect/url`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "User-Agent": "SecureSight-Frontend/1.0 (Server-Side; Next.js)",
              },
              body: JSON.stringify({ url, conf }),
              signal: AbortSignal.timeout(25000), // Slightly lower timeout for parallel
            });

            if (!res.ok) {
              return { cameraId, error: `HTTP ${res.status}` };
            }

            const result = await res.json();
            // Cache individual result
            detectionCache.set(cacheKeyIndividual, {
              result,
              timestamp: Date.now(),
            });
            return { cameraId, result };
          }),
        );

        // Aggregate results
        results.forEach((r) => {
          if (r.status === "fulfilled") {
            detections[r.value.cameraId] =
              r.value.error ? { error: r.value.error } : r.value.result || { error: "No result" };
          } else {
            console.error("[detect-all] Individual request rejected", r.reason);
          }
        });
      } else {
        // Got batch response from backend
        const batchResult = await response.json();
        Object.assign(detections, batchResult.alerts || batchResult);
      }

      console.log(`[detect-all] Got results for ${Object.keys(detections).length} cameras`);

      // Cache the combined result
      detectionCache.set(cacheKey, { result: detections, timestamp: Date.now() });

      // Clean up old cache entries
      if (detectionCache.size > 200) {
        const now = Date.now();
        for (const [key, value] of detectionCache.entries()) {
          if (now - value.timestamp > CACHE_TTL_MS) {
            detectionCache.delete(key);
          }
        }
      }

      return NextResponse.json({ alerts: detections });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[detect-all] Forwarding to backend failed: ${message}`);
      return NextResponse.json(
        { error: "Batch detection failed", detail: message },
        { status: 500 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[detect-all] Error: ${message}`);
    return NextResponse.json(
      { error: "Batch detection failed", detail: message },
      { status: 500 },
    );
  }
}
