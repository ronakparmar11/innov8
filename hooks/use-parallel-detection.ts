"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type CameraAlert = {
  id: string;
  cameraId: string;
  cameraName: string;
  label: string;
  score: number;
  ts: number;
  source: string;
};

export type DetectionBox = {
  cls: number;
  name: string;
  conf: number;
  box: number[];
};

type ParallelDetectionPayload = {
  alerts: {
    [cameraId: string]: {
      ts?: number;
      detections?: DetectionBox[];
      alerts?: string[];
      person_count?: number;
      error?: string;
    };
  };
  error?: string;
};

const POLL_INTERVAL_MS = 1500; // Poll every 1.5 seconds for real-time alerts
const MIN_SCORE = 0.65;
const HISTORY_FETCH_INTERVAL_MS = 30000; // Fetch persistent history every 30s

// Persistent history alert type — matches backend SQLite schema
type PersistentAlert = {
  id: string;
  camera_id: string;
  camera_name: string;
  alert_type: string;
  severity: string;
  confidence: number;
  detections: DetectionBox[];
  source_url: string;
  created_at: number;
  created_at_iso: string;
  acknowledged: boolean;
  metadata: Record<string, unknown>;
};

/**
 * Hook for parallel monitoring of multiple cameras.
 * Now also loads PERSISTENT alert history from the backend so alerts
 * are visible even after page refresh / even if detected while site was closed.
 */
export function useParallelDetection(
  cameras: Array<{ id: string; name: string; url?: string }> = [],
  options?: { enabled?: boolean; minScore?: number },
) {
  const { enabled = true, minScore = MIN_SCORE } = options || {};
  const [alerts, setAlerts] = useState<CameraAlert[]>([]);
  const [detections, setDetections] = useState<Map<string, DetectionBox[]>>(
    new Map(),
  );
  const [status, setStatus] = useState<"idle" | "polling" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const historyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAlertRef = useRef<
    Map<string, { label: string; ts: number }>
  >(new Map());
  const isCleaningUpRef = useRef(false);
  const pendingRequestRef = useRef<Promise<void> | null>(null);
  const lastRequestTimeRef = useRef<number>(0);
  const persistentIdsRef = useRef<Set<string>>(new Set());

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (historyTimerRef.current) {
      clearInterval(historyTimerRef.current);
      historyTimerRef.current = null;
    }
  }, []);

  // ── Fetch persistent alert history from backend ──
  const fetchPersistentHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/history?limit=200", {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.alerts || !Array.isArray(data.alerts)) return;

      const historicAlerts: CameraAlert[] = (data.alerts as PersistentAlert[])
        .map((a) => ({
          id: a.id,
          cameraId: a.camera_id,
          cameraName: a.camera_name,
          label: a.alert_type,
          score: a.confidence,
          ts: a.created_at * 1000, // backend uses seconds, frontend uses ms
          source: a.source_url,
        }));

      // Merge with existing real-time alerts (avoid duplicates)
      setAlerts((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newHistoric = historicAlerts.filter((a) => !existingIds.has(a.id));
        // Track persistent IDs so we don't re-add them
        for (const a of historicAlerts) persistentIdsRef.current.add(a.id);
        if (newHistoric.length === 0) return prev;
        // Merge: real-time first, then historic, sort by newest
        const merged = [...prev, ...newHistoric]
          .sort((a, b) => b.ts - a.ts)
          .slice(0, 500);
        return merged;
      });
    } catch (err) {
      console.debug("Persistent history fetch failed:", err);
    }
  }, []);

  // Poll all cameras at once
  const pollAllDetections = useCallback(
    async (cameraList: Array<{ id: string; name: string; url?: string }>) => {
      if (
        isCleaningUpRef.current ||
        !cameraList.length ||
        !enabled ||
        pendingRequestRef.current
      ) {
        return;
      }

      // Debounce: don't send requests closer than 1 second apart
      const now = Date.now();
      if (now - lastRequestTimeRef.current < 1000) return;

      try {
        lastRequestTimeRef.current = now;

        const requestPromise = (async () => {
          // Build analysis URLs for all cameras
          const cameraAnalysisUrls: {
            [cameraId: string]: string | undefined;
          } = {};
          cameraList.forEach((cam) => {
            // Derive analysis URL same way as live page
            if (!cam.url) return;
            try {
              const u = new URL(
                cam.url,
                typeof window !== "undefined" ? window.location.origin : undefined,
              );
              const src = u.searchParams.get("src");
              if (src && /^(https?:|rtsp:)/i.test(src)) {
                cameraAnalysisUrls[cam.id] = src;
              } else if (src && /^[a-zA-Z0-9_-]+$/i.test(src)) {
                // go2rtc stream token; use MP4 stream endpoint for backend analysis
                // (frame.jpeg requires ffmpeg; stream.mjpeg broken behind Cloudflare;
                //  stream.mp4 works reliably with OpenCV VideoCapture)
                cameraAnalysisUrls[cam.id] = `${u.origin}/api/stream.mp4?src=${encodeURIComponent(src)}`;
              } else {
                const isAbsolute = /^(https?:|rtsp:)/i.test(u.href);
                if (isAbsolute) {
                  cameraAnalysisUrls[cam.id] = u.href;
                }
              }
            } catch {
              // Skip invalid URLs
            }
          });

          if (Object.keys(cameraAnalysisUrls).length === 0) return;

          // Send all camera URLs to backend at once
          const response = await fetch(`/api/detect-all`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cameras: cameraAnalysisUrls,
              conf: minScore,
            }),
          });

          if (!response.ok) {
            if (response.status === 404) {
              console.warn("⚠️ Detection endpoint /api/detect-all not available.");
              setErrorMessage(
                "AI detection endpoint not available. Check server logs.",
              );
              setStatus("error");
              stopPolling();
              return;
            }
            throw new Error(`HTTP ${response.status}`);
          }

          const data = (await response.json()) as ParallelDetectionPayload;

          if (isCleaningUpRef.current) return;

          if (data.error) {
            console.warn("Parallel detection error:", data.error);
            return;
          }

          // Process all camera results
          const newDetections = new Map<string, DetectionBox[]>();
          const newAlerts: CameraAlert[] = [];

          for (const [cameraId, result] of Object.entries(data.alerts)) {
            if (result.error) continue;

            if (Array.isArray(result.detections)) {
              newDetections.set(cameraId, result.detections);
            }

            // Handle alerts for this camera
            if (result.alerts && result.alerts.length > 0) {
              const ts = result.ts ? result.ts * 1000 : Date.now();
              const label = result.alerts[0];
              const topScore = result.detections?.[0]?.conf ?? 0;

              // Get last alert for this camera
              let lastAlert = lastAlertRef.current.get(cameraId);
              const shouldTrigger =
                !lastAlert ||
                lastAlert.label !== label ||
                ts - lastAlert.ts > 3000;

              if (topScore >= minScore && shouldTrigger) {
                lastAlert = { label, ts };
                lastAlertRef.current.set(cameraId, lastAlert);

                const camera = cameraList.find((c) => c.id === cameraId);
                newAlerts.push({
                  id: `${Math.floor(ts)}-${cameraId}-${label}-${Math.random()}`,
                  cameraId,
                  cameraName: camera?.name || `Camera ${cameraId}`,
                  label,
                  score: topScore,
                  ts,
                  source: cameraAnalysisUrls[cameraId] ?? "",
                });
              }
            }
          }

          // Update state
          setDetections(newDetections);
          if (newAlerts.length > 0) {
            setAlerts((prev) => {
              // Avoid duplicates
              const filtered = prev.filter(
                (a) => !newAlerts.some((n) => n.id === a.id),
              );
              const combined = [...newAlerts, ...filtered];
              return combined.slice(0, 500); // Keep last 500 alerts (match persistent history)
            });
          }

          setStatus("polling");
          setErrorMessage(null);
        })();

        pendingRequestRef.current = requestPromise;
        await requestPromise;
        pendingRequestRef.current = null;
      } catch (err) {
        console.warn("Parallel detection poll failed:", err);
        pendingRequestRef.current = null;
      }
    },
    [enabled, minScore, stopPolling],
  );

  // Start polling all cameras together
  const startPolling = useCallback(
    (cameraList: Array<{ id: string; name: string; url?: string }>) => {
      if (pollingRef.current) return; // Already polling

      setStatus("polling");

      // Fetch persistent history immediately on start
      fetchPersistentHistory();

      // Poll every 15 seconds
      pollingRef.current = setInterval(() => {
        pollAllDetections(cameraList);
      }, POLL_INTERVAL_MS);

      // Fetch persistent history periodically (catches BG monitor alerts)
      historyTimerRef.current = setInterval(() => {
        fetchPersistentHistory();
      }, HISTORY_FETCH_INTERVAL_MS);

      // Do an immediate poll
      pollAllDetections(cameraList);
    },
    [pollAllDetections, fetchPersistentHistory],
  );

  // Setup/cleanup polling
  useEffect(() => {
    isCleaningUpRef.current = false;

    if (!enabled || !cameras.length) {
      setStatus("idle");
      setAlerts([]);
      setDetections(new Map());
      setErrorMessage(null);
      lastAlertRef.current.clear();
      stopPolling();
      return;
    }

    startPolling(cameras);

    return () => {
      isCleaningUpRef.current = true;
      stopPolling();
    };
  }, [enabled, cameras, startPolling, stopPolling]);

  return {
    status,
    alerts,
    detections,
    errorMessage,
  };
}
