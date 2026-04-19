"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface IPCameraFeedProps {
  streamUrl: string;
  className?: string;
  autoPlay?: boolean;
  onError?: (error: string) => void;
  onPlay?: () => void;
}

export default function IPCameraFeed({
  streamUrl,
  className,
  autoPlay = true,
  onError,
  onPlay,
}: IPCameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mountedRef = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMjpeg, setIsMjpeg] = useState(false);
  const [isHls, setIsHls] = useState(false);
  const [useImgFallback, setUseImgFallback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const initHlsStream = useCallback(() => {
    if (!videoRef.current || !mountedRef.current) return;

    // Cleanup any existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      console.log("HLS.js is supported, initializing player");
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsRef.current = hls;

      // Setup HLS event handlers
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log("HLS media attached, loading source:", streamUrl);
        hls.loadSource(streamUrl);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!mountedRef.current) return;
        console.log("HLS manifest parsed, starting playback");
        if (autoPlay) {
          videoRef.current
            ?.play()
            .then(() => {
              if (mountedRef.current) {
                setLoading(false);
                onPlay?.();
              }
            })
            .catch((err) => {
              if (mountedRef.current) {
                console.error("HLS autoplay error:", err);
                setError("Autoplay blocked. Click to play.");
                setLoading(false);
                onError?.("Autoplay blocked");
              }
            });
        } else {
          if (mountedRef.current) setLoading(false);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn("HLS error:", data);
        if (data.fatal && mountedRef.current) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try to recover network error
              console.log("Fatal network error, trying to recover");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Fatal media error, trying to recover");
              hls.recoverMediaError();
              break;
            default:
              setError(`Stream playback error: ${data.details}`);
              setLoading(false);
              onError?.(`Stream playback error: ${data.details}`);
              break;
          }
        }
      });

      // Attach HLS to video element
      hls.attachMedia(videoRef.current);
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      // For Safari which has built-in HLS support
      console.log("Using native HLS support");
      videoRef.current.src = streamUrl;

      if (autoPlay) {
        videoRef.current
          .play()
          .then(() => {
            if (mountedRef.current) {
              setLoading(false);
              onPlay?.();
            }
          })
          .catch((err) => {
            if (mountedRef.current) {
              console.error("Native HLS autoplay error:", err);
              setError("Autoplay blocked. Click to play.");
              setLoading(false);
              onError?.("Autoplay blocked");
            }
          });
      } else {
        if (mountedRef.current) setLoading(false);
      }
    } else {
      if (mountedRef.current) {
        setError("HLS playback not supported in this browser");
        setLoading(false);
        onError?.("HLS not supported");
      }
    }
  }, [autoPlay, onError, onPlay, streamUrl]);

  const initDirectStream = useCallback(() => {
    if (!videoRef.current || !mountedRef.current) return;

    console.log("Initializing direct stream:", streamUrl);
    videoRef.current.src = streamUrl;

    if (autoPlay) {
      videoRef.current
        .play()
        .then(() => {
          if (mountedRef.current) {
            console.log("Direct stream playback started");
            setLoading(false);
            onPlay?.();
          }
        })
        .catch((err) => {
          if (!mountedRef.current) return;
          console.error("Direct stream error:", err);

          // If we detect MJPEG stream that failed in video tag,
          // try with an image tag as fallback (better MJPEG support)
          if ((isMjpeg || useImgFallback) && imgRef.current) {
            console.log("Trying MJPEG with img tag instead");
            imgRef.current.src = streamUrl;
            setLoading(false);
            setUseImgFallback(true);
          } else {
            setError(`Unable to play stream: ${err.message}`);
            setLoading(false);
            onError?.(`Playback error: ${err.message}`);
          }
        });
    } else {
      if (mountedRef.current) setLoading(false);
    }
  }, [autoPlay, isMjpeg, useImgFallback, onError, onPlay, streamUrl]);

  const handleRetry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
    setError(null);
    setLoading(true);
    if (isHls) {
      initHlsStream();
    } else {
      initDirectStream();
    }
  }, [initDirectStream, initHlsStream, isHls]);

  const cleanupStreams = useCallback(() => {
    const hlsInstance = hlsRef.current;
    const videoEl = videoRef.current;
    hlsInstance?.destroy();
    hlsRef.current = null;
    if (videoEl) {
      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.load();
    }
  }, []);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Clean up resources when component unmounts
  useEffect(() => cleanupStreams, [cleanupStreams]);

  // Initialize stream when URL changes
  useEffect(() => {
    if (!streamUrl) {
      setError("No stream URL provided");
      setLoading(false);
      return;
    }

    // Use a ref to track if this effect's timeout should trigger
    let shouldTimeout = true;

    console.log("IPCameraFeed: Initializing with URL:", streamUrl);
    setError(null);
    setLoading(true);
    setUseImgFallback(false);

    // Detect stream type
    const urlLower = streamUrl.toLowerCase();
    const isHlsStream =
      urlLower.endsWith(".m3u8") || urlLower.includes(".m3u8?");
    // Broader MJPEG heuristics (common mobile IP cam apps like IP Webcam)
    const isMjpegStream =
      urlLower.endsWith(".mjpg") ||
      urlLower.includes("mjpg/video") ||
      urlLower.includes("mjpeg") ||
      urlLower.includes("/videofeed") ||
      urlLower.includes("/video") ||
      urlLower.includes("action=stream") ||
      urlLower.includes("/mjpg") ||
      urlLower.includes("cgi-bin") ||
      urlLower.includes("/stream");

    setIsHls(isHlsStream);
    setIsMjpeg(isMjpegStream);

    // Set a timeout to detect if loading takes too long
    const timeoutId = setTimeout(() => {
      if (mountedRef.current && shouldTimeout) {
        setLoading(false);
        setError(
          "Stream timed out. Possible connection issues or the camera is offline.",
        );
        onError?.("Stream timed out");
      }
    }, 15000); // 15 seconds timeout

    // Start the appropriate player type based on URL
    if (isHlsStream) {
      initHlsStream();
    } else {
      initDirectStream();
    }

    return () => {
      shouldTimeout = false; // Prevent timeout from firing after cleanup
      clearTimeout(timeoutId);
    };
  }, [streamUrl, retryCount, initHlsStream, initDirectStream, onError]); // Added proper dependencies

  return (
    <div
      className={`relative aspect-video overflow-hidden bg-black ${className || ""}`}
    >
      {/* Video tag for HLS and most direct streams */}
      <video
        ref={videoRef}
        className={`w-full h-full object-contain ${isMjpeg || useImgFallback ? "hidden" : ""}`}
        controls
        playsInline
        muted
      />

      {/* Image tag as fallback for MJPEG streams */}
      {(isMjpeg || useImgFallback) && (
        <img
          ref={imgRef}
          className="w-full h-full object-contain"
          alt="MJPEG Stream"
          onLoad={() => {
            if (mountedRef.current) {
              setLoading(false);
              setError(null);
              onPlay?.();
            }
          }}
          onError={() => {
            if (mountedRef.current) {
              setLoading(false);
              setError("Failed to load MJPEG stream");
              onError?.("MJPEG load failed");
            }
          }}
        />
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
          <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
          <span className="text-white text-sm">Connecting to stream...</span>
        </div>
      )}

      {/* Connection status indicator */}
      {!loading && !error && (
        <div className="absolute bottom-2 left-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-[10px]">
            <Wifi className="h-3 w-3" />
            Connected
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/80">
          <Alert className="w-full max-w-md bg-background/90">
            <WifiOff className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={handleRetry}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Connection {retryCount > 0 && `(${retryCount})`}
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center max-w-xs">
            Check if the camera is online and the URL is correct
          </p>
        </div>
      )}
    </div>
  );
}
