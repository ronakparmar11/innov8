"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type DetectionAlert = {
  id: string;
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

type FrameDetectionsPayload = {
  ts?: number;
  detections?: DetectionBox[];
  alerts?: string[];
  person_count?: number;
  error?: string;
};

const POLL_INTERVAL_MS = 15000; // Poll every 15s to reduce backend load (was 8s)
const WS_CONNECT_TIMEOUT_MS = 5000;
const WS_DESIRED_FPS = 0.35; // ~1 frame every 3s — very light on backend

const isAbsoluteCameraUrl = (url?: string) =>
  typeof url === "string" && /^(https?:|rtsp:)/i.test(url);

const buildWsUrl = (base: string) => {
  const normalized = base.replace(/\/+$/, "");
  const protocolSwapped = normalized.replace(/^http/i, "ws");
  return `${protocolSwapped}/ws/stream`;
};

export function useDetectionAlerts(
  cameraUrl?: string,
  options?: { enabled?: boolean; minScore?: number },
) {
  const { enabled = true, minScore = 0.65 } = options || {};
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "polling" | "error"
  >("idle");
  const [latestAlert, setLatestAlert] = useState<DetectionAlert | null>(null);
  const [lastDetections, setLastDetections] = useState<DetectionBox[]>([]);
  const [personCount, setPersonCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const currentSourceRef = useRef<string | undefined>(undefined);
  const lastAlertRef = useRef<{ label: string; ts: number } | null>(null);
  const isCleaningUpRef = useRef(false);
  const wsFailedRef = useRef(false);
  const lastRequestTimeRef = useRef<number>(0); // Track last request time for debouncing
  const pendingRequestRef = useRef<Promise<void> | null>(null); // Track pending requests

  // Stop polling - defined first since it's used by pollDetections
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // REST API polling fallback when WebSocket is unavailable
  const pollDetections = useCallback(
    async (analysisUrl: string) => {
      if (isCleaningUpRef.current || !analysisUrl) return;

      // Prevent duplicate concurrent requests - don't send if one is already in flight
      if (pendingRequestRef.current) return;

      // Extra debouncing: don't send requests closer than 12 seconds apart
      const now = Date.now();
      if (now - lastRequestTimeRef.current < 12000) return;

      try {
        lastRequestTimeRef.current = now;
        
        // Mark that a request is in progress
        const requestPromise = (async () => {
          // Use local API proxy endpoint which forwards to backend
          const response = await fetch(`/api/detect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: analysisUrl, conf: minScore }),
          });

          if (!response.ok) {
            // If endpoint doesn't exist, show meaningful error
            if (response.status === 404) {
              console.warn("⚠️ Detection endpoint /api/detect not available.");
              setErrorMessage(
                "AI detection endpoint not available. Check server logs.",
              );
              setStatus("error");
              stopPolling();
              return;
            }
            throw new Error(`HTTP ${response.status}`);
          }

          const data = (await response.json()) as FrameDetectionsPayload;

          if (isCleaningUpRef.current) return;

          if (data.error) {
            console.warn("Detection error:", data.error);
            return;
          }

          if (Array.isArray(data.detections)) {
            setLastDetections(data.detections);
          }

          const computedCount =
            data.person_count ??
            data.detections?.filter((d) => d.name.toLowerCase() === "person")
              .length ??
            0;
          setPersonCount(computedCount);
          setStatus("polling");
          setErrorMessage(null);

          // Handle alerts
          if (data.alerts && data.alerts.length > 0) {
            const ts = data.ts ? data.ts * 1000 : Date.now();
            const label = data.alerts[0];
            const topScore = data.detections?.[0]?.conf ?? 0;
            const shouldTrigger =
              !lastAlertRef.current ||
              lastAlertRef.current.label !== label ||
              ts - lastAlertRef.current.ts > 3000;
            if (topScore >= minScore && shouldTrigger) {
              lastAlertRef.current = { label, ts };
              setLatestAlert({
                id: `${Math.floor(ts)}-${label}-${Math.random()}`,
                label,
                score: topScore,
                ts,
                source: analysisUrl ?? "",
              });
            }
          }
        })();
        
        pendingRequestRef.current = requestPromise;
        await requestPromise;
        pendingRequestRef.current = null;
      } catch (err) {
        console.warn("Polling detection failed:", err);
        pendingRequestRef.current = null;
        // Don't set error status for transient polling failures
      }
    },
    [minScore, stopPolling],
  );

  // Start polling as fallback
  const startPolling = useCallback(
    (analysisUrl: string) => {
      if (pollingRef.current) return; // Already polling

      setStatus("polling");

      // Poll every 2.5 seconds
      pollingRef.current = setInterval(() => {
        pollDetections(analysisUrl);
      }, POLL_INTERVAL_MS);

      // Do an immediate poll
      pollDetections(analysisUrl);
    },
    [pollDetections],
  );

  useEffect(() => {
    if (!cameraUrl) return;
    setPersonCount(0);
    setLastDetections([]);
    setLatestAlert(null);
    setErrorMessage(null);
    lastAlertRef.current = null;
  }, [cameraUrl]);

  useEffect(() => {
    // Reset cleanup flag
    isCleaningUpRef.current = false;
    wsFailedRef.current = false;

    if (!enabled || !isAbsoluteCameraUrl(cameraUrl)) {
      setStatus("idle");
      setLastDetections([]);
      setPersonCount(0); // Reset person count when camera URL changes or disabled
      setErrorMessage(null);
      currentSourceRef.current = undefined;
      stopPolling();
      if (wsRef.current) {
        isCleaningUpRef.current = true;
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    // Close existing connection if URL changed
    if (wsRef.current && currentSourceRef.current !== cameraUrl) {
      isCleaningUpRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
      stopPolling();
      isCleaningUpRef.current = false;
    }

    // Don't create duplicate connection
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      return;
    }

    const backendBase =
      process.env.NEXT_PUBLIC_CAMERA_BACKEND_URL || "http://localhost:8000";
    const wsUrl = buildWsUrl(backendBase);
    currentSourceRef.current = cameraUrl;
    setStatus("connecting");
    setErrorMessage(null);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const connectionTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.close();
        // Try polling fallback
        wsFailedRef.current = true;
        if (cameraUrl) startPolling(cameraUrl);
      }
    }, WS_CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      // Double-check we're not cleaning up
      if (isCleaningUpRef.current) {
        ws.close();
        return;
      }
      setStatus("connected");
      setErrorMessage(null);
      stopPolling(); // Stop polling if it was running
      ws.send(
        JSON.stringify({
          url: cameraUrl,
          desired_fps: WS_DESIRED_FPS,
          detection_conf: minScore,
        }),
      );
    };
    ws.onerror = (error) => {
      clearTimeout(connectionTimeout);
      wsFailedRef.current = true;

      // Try polling fallback instead of just showing error
      if (cameraUrl) startPolling(cameraUrl);
    };
    ws.onclose = (event) => {
      // If WebSocket failed, keep polling
      if (!wsFailedRef.current) {
        setStatus((prev) => (prev === "error" ? "error" : "idle"));
      }
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as FrameDetectionsPayload;
        // Batch update: only update state once per message
        if (Array.isArray(payload.detections)) {
          setLastDetections(payload.detections);
        }
        const computedCount =
          payload.person_count ??
          payload.detections?.filter((d) => d.name.toLowerCase() === "person")
            .length ??
          0;
        setPersonCount(computedCount);
        if (payload.alerts && payload.alerts.length > 0) {
          const ts = payload.ts ? payload.ts * 1000 : Date.now();
          const label = payload.alerts[0];
          const topScore = payload.detections?.[0]?.conf ?? 0;
          // Prevent duplicate alerts: only trigger if 3+ seconds since last same alert
          const shouldTrigger =
            !lastAlertRef.current ||
            lastAlertRef.current.label !== label ||
            ts - lastAlertRef.current.ts > 3000;
          if (topScore >= minScore && shouldTrigger) {
            lastAlertRef.current = { label, ts };
            setLatestAlert({
              id: `${Math.floor(ts)}-${label}-${Math.random()}`,
              label,
              score: topScore,
              ts,
              source: cameraUrl ?? "",
            });
          }
        }
      } catch (error) {
        // Ignore malformed payloads silently
      }
    };

    return () => {
      // Mark as cleaning up to prevent any pending callbacks
      isCleaningUpRef.current = true;

      // Stop polling
      stopPolling();

      // Close WebSocket connection
      if (wsRef.current === ws) {
        wsRef.current = null;
      }

      // Use close code 1000 (normal closure)
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close(1000, "Component unmounted");
      }
    };
  }, [cameraUrl, enabled, minScore, startPolling, stopPolling]);

  return {
    status,
    latestAlert,
    lastDetections,
    personCount,
    source: currentSourceRef.current,
    errorMessage,
  };
}
