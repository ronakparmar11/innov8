"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LiveCameraFeedProps {
  src: string;
  alt?: string;
  className?: string;
  onError?: (error: string) => void;
  onLoad?: () => void;
}

export default function LiveCameraFeed({
  src,
  alt = "Live Camera Feed",
  className = "",
  onError,
  onLoad,
}: LiveCameraFeedProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgKey, setImgKey] = useState(0); // Used to force re-render on retry
  const imgRef = useRef<HTMLImageElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle image load success
  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onLoad?.();
  }, [onLoad]);

  // Handle image load error
  const handleError = useCallback(() => {
    setLoading(false);
    const errorMsg =
      "Failed to load camera feed. Stream may be offline or URL is incorrect.";
    setError(errorMsg);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onError?.(errorMsg);
    console.error(`LiveCameraFeed: Failed to load stream from ${src}`);
  }, [src, onError]);

  // Retry loading
  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setImgKey((prev) => prev + 1);
  }, []);

  // Setup loading timeout
  useEffect(() => {
    setLoading(true);
    setError(null);
    let cancelled = false;

    // Set a timeout to detect if loading takes too long
    timeoutRef.current = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        const errorMsg =
          "Stream connection timed out. Check network or camera status.";
        setError(errorMsg);
        onError?.(errorMsg);
      }
    }, 8000); // 8 second timeout

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [src, imgKey]); // Reset when src or key changes

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-t-lg bg-black ${className}`}
    >
      <img
        key={imgKey}
        ref={imgRef}
        src={src}
        alt={alt}
        className={`object-cover w-full h-full transition-opacity duration-300 ${loading || error ? "opacity-50" : "opacity-100"}`}
        style={{ background: "#000" }}
        draggable={false}
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-2 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Connecting to stream...</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4">
          <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
          <p className="text-white text-sm text-center mb-4 max-w-xs">
            {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
