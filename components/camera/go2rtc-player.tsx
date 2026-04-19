"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Play,
  Wifi,
  WifiOff,
} from "lucide-react";
import Hls from "hls.js";

type Go2RtcPlayerProps = {
  /** Base URL of the go2rtc host, e.g. https://cam1.yashpatelis.online */
  baseUrl: string;
  /** Stream name configured in go2rtc, e.g. cam1 */
  stream: string;
  /** UI mode: webrtc (default), mp4, mse, etc. */
  mode?: string;
  className?: string;
};

/**
 * Go2RTC Player with multi-format fallbacks.
 * Tries: HLS (primary) → MSE/WebRTC iframe → MJPEG snapshot → error state
 */
export default function Go2RtcPlayer({
  baseUrl,
  stream,
  mode = "mse",
  className,
}: Go2RtcPlayerProps) {
  const [playerMode, setPlayerMode] = useState<
    "hls" | "iframe" | "mjpeg" | "error"
  >("hls");
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mountedRef = useRef(true);

  const origin = baseUrl.replace(/\/$/, "");
  const iframeSrc = `${origin}/stream.html?src=${encodeURIComponent(stream)}&mode=${mode}`;
  const hlsSrc = `${origin}/api/stream.m3u8?src=${encodeURIComponent(stream)}`;
  const mjpegSrc = `${origin}/api/frame.jpeg?src=${encodeURIComponent(stream)}`;

  // Reset state when stream changes
  useEffect(() => {
    mountedRef.current = true;
    setLoaded(false);
    setTimedOut(false);
    setError(null);
    setNeedsManualPlay(false);
    setPlayerMode("hls");
    setRetryCount(0);
    return () => {
      mountedRef.current = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [stream, baseUrl]);

  // HLS Mode - Primary method with better error handling
  useEffect(() => {
    if (playerMode !== "hls" || !videoRef.current) return;

    const video = videoRef.current;
    let hlsErrorCount = 0;
    const maxHlsRetries = 3;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Add timeout for HLS initialization
    const hlsTimeout = setTimeout(() => {
      if (!loaded && mountedRef.current) {
        console.warn(`⏱️ HLS timeout for ${stream}, falling back to iframe`);
        setPlayerMode("iframe");
      }
    }, 6000); // 6 second timeout for HLS

    if (Hls.isSupported()) {
      console.log(`🎬 Initializing HLS.js for stream: ${stream}`);
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 10,
        maxBufferLength: 5,
        maxMaxBufferLength: 10,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 3,
        maxLoadingDelay: 2,
        manifestLoadingTimeOut: 5000,
        manifestLoadingMaxRetry: 2,
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log(`📎 HLS media attached, loading: ${hlsSrc}`);
        hls.loadSource(hlsSrc);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!mountedRef.current) return;
        clearTimeout(hlsTimeout);
        console.log(`✅ HLS manifest parsed for: ${stream}`);
        setLoaded(true);
        video.play().catch((err) => {
          if (mountedRef.current) {
            console.warn(
              "Autoplay blocked, user interaction needed:",
              err.message,
            );
            setNeedsManualPlay(true);
          }
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn(`HLS error for ${stream}:`, data);
        if (data.fatal) {
          hlsErrorCount++;
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (hlsErrorCount < maxHlsRetries) {
                console.warn(
                  `Network error, retry ${hlsErrorCount}/${maxHlsRetries}...`,
                );
                setTimeout(() => hls.startLoad(), 1000);
              } else {
                console.warn("Max HLS retries reached, trying iframe");
                clearTimeout(hlsTimeout);
                if (mountedRef.current) setPlayerMode("iframe");
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("Media error, recovering...");
              hls.recoverMediaError();
              break;
            default:
              console.error("Fatal HLS error, trying iframe fallback");
              clearTimeout(hlsTimeout);
              if (mountedRef.current) setPlayerMode("iframe");
              break;
          }
        }
      });

      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari has native HLS support
      console.log(`🍎 Using native HLS support for: ${stream}`);
      video.src = hlsSrc;

      const handleLoadedData = () => {
        if (!mountedRef.current) return;
        clearTimeout(hlsTimeout);
        setLoaded(true);
        video.play().catch(() => {
          if (mountedRef.current) setNeedsManualPlay(true);
        });
      };

      const handleVideoError = () => {
        clearTimeout(hlsTimeout);
        if (mountedRef.current) setPlayerMode("iframe");
      };

      video.addEventListener("loadeddata", handleLoadedData);
      video.addEventListener("error", handleVideoError);

      return () => {
        clearTimeout(hlsTimeout);
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleVideoError);
      };
    } else {
      console.warn("HLS not supported, trying iframe...");
      clearTimeout(hlsTimeout);
      setPlayerMode("iframe");
    }

    return () => {
      clearTimeout(hlsTimeout);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playerMode, stream, hlsSrc, loaded]);

  // Timeout for iframe mode - with better cleanup
  useEffect(() => {
    if (loaded || playerMode !== "iframe") return;
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setTimedOut(true);
        console.warn(`⏱️ go2rtc iframe loading took >5s, trying MJPEG...`);
        setPlayerMode("mjpeg");
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [stream, loaded, playerMode]);

  const handleIframeLoad = useCallback(() => {
    console.log(`📦 go2rtc iframe onLoad fired for stream: ${stream}`);
    setTimeout(() => {
      if (!loaded && mountedRef.current) {
        setLoaded(true);
        setError(null);
        console.log(`✅ go2rtc iframe loaded for stream: ${stream}`);
      }
    }, 2000);
  }, [stream, loaded]);

  const handleMjpegError = () => {
    if (!mountedRef.current) return;
    console.error(`❌ All playback methods failed for ${stream}`);
    setError(
      `Unable to load stream "${stream}". The stream may be offline or the go2rtc server is not reachable.`,
    );
    setPlayerMode("error");
  };

  const handleMjpegLoad = useCallback(() => {
    if (mountedRef.current) {
      setLoaded(true);
      setError(null);
      console.log(`✅ Snapshot loaded: ${stream}`);
    }
  }, [stream]);

  const retry = () => {
    setRetryCount((prev) => prev + 1);
    setLoaded(false);
    setTimedOut(false);
    setError(null);
    setNeedsManualPlay(false);
    setPlayerMode("hls");
  };

  const openDirectly = () => {
    window.open(iframeSrc, "_blank", "noopener,noreferrer");
  };

  const handleManualPlay = () => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => {
          setNeedsManualPlay(false);
        })
        .catch(console.error);
    }
  };

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-md bg-black ${className ?? ""}`}
    >
      {/* HLS Mode - Primary method */}
      {playerMode === "hls" && (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            muted
            controls
          />
          {!loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white text-sm gap-2">
              <div className="animate-pulse">Connecting to {stream}…</div>
            </div>
          )}
          {loaded && needsManualPlay && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Button
                size="lg"
                variant="secondary"
                onClick={handleManualPlay}
                className="gap-2"
              >
                <Play className="h-6 w-6" />
                Click to Play
              </Button>
            </div>
          )}
        </>
      )}

      {/* Iframe Mode - Fallback */}
      {playerMode === "iframe" && (
        <>
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            className="w-full h-full border-0"
            allow="autoplay; camera; microphone; display-capture; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            title={`go2rtc stream: ${stream}`}
            onLoad={handleIframeLoad}
            onError={() => setPlayerMode("mjpeg")}
            referrerPolicy="no-referrer-when-downgrade"
            loading="eager"
          />
          {!loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white text-sm gap-2">
              <div className="animate-pulse">Loading {stream}…</div>
              {timedOut && (
                <div className="text-xs text-amber-400 text-center px-4">
                  Trying snapshot mode…
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MJPEG Snapshot Fallback */}
      {playerMode === "mjpeg" && (
        <>
          <img
            src={`${mjpegSrc}&t=${Date.now()}`}
            alt={`Snapshot: ${stream}`}
            className="w-full h-full object-contain"
            onLoad={handleMjpegLoad}
            onError={handleMjpegError}
          />
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs text-orange-400">
              Loading snapshot…
            </div>
          )}
        </>
      )}

      {/* Error State */}
      {playerMode === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-4 gap-4">
          <Alert className="w-full max-w-md bg-red-500/20 border-red-500/50 text-red-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={retry}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again {retryCount > 0 && `(${retryCount})`}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={openDirectly}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Directly
            </Button>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            <p className="font-medium mb-1">Troubleshooting:</p>
            <p>• Verify go2rtc server is running at {origin}</p>
            <p>• Check if stream &quot;{stream}&quot; is configured</p>
            <p>• Ensure CORS headers allow this origin</p>
            <p>• Try opening the stream directly in a new tab</p>
          </div>
        </div>
      )}

      {/* Connection status indicator */}
      {!error && playerMode !== "error" && (
        <div className="absolute bottom-2 left-2">
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] ${loaded ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}
          >
            {loaded ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3 animate-pulse" />
            )}
            {loaded ? "Connected" : "Connecting..."}
          </div>
        </div>
      )}
    </div>
  );
}
