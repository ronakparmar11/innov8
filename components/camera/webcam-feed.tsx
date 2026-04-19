"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CameraOff, Camera, ImageDown } from "lucide-react";

interface WebcamFeedProps {
  className?: string;
}

export default function WebcamFeed({ className }: WebcamFeedProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [snapUrl, setSnapUrl] = React.useState<string | null>(null);

  // Capability detection (avoids SSR & unsupported browsers / insecure contexts)
  const hasMediaApi = React.useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return (
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    );
  }, []);
  const secureContext = React.useMemo(
    () => (typeof window !== "undefined" ? window.isSecureContext : false),
    [],
  );

  const start = React.useCallback(async () => {
    if (!hasMediaApi) {
      setError(
        secureContext
          ? "Camera API not available in this browser."
          : "Insecure context. Use https:// or http://localhost (browsers block camera on plain HTTP over network).",
      );
      return;
    }
    if (!secureContext) {
      setError("Insecure context. Serve site over https or use localhost.");
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setActive(true);
      }
    } catch (e: any) {
      const name = e?.name;
      let msg = e?.message || "Unable to access webcam";
      if (name === "NotAllowedError")
        msg =
          "Camera permission denied. Click the site info (lock) icon to allow.";
      if (name === "NotFoundError" || name === "DevicesNotFoundError")
        msg = "No camera device found.";
      if (name === "NotReadableError")
        msg = "Camera busy (another app/tab using it).";
      if (name === "NotSecureError") msg = "Needs HTTPS or localhost.";
      setError(msg);
    }
  }, [hasMediaApi, secureContext]);

  const stop = React.useCallback(() => {
    const mediaStream = videoRef.current?.srcObject as MediaStream | null;
    mediaStream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  const capture = React.useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setSnapUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      }
    }, "image/png");
  }, []);

  React.useEffect(() => {
    // Try auto-start only when both API + secure context are present
    if (hasMediaApi && secureContext) start();
    else if (!hasMediaApi)
      setError(
        "Camera API unavailable. Try Chrome/Edge/Firefox or update browser.",
      );
    else if (!secureContext)
      setError("Insecure context. Use https or localhost for camera access.");
    return () => {
      stop();
      setSnapUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [hasMediaApi, secureContext, start, stop]);

  return (
    <div className={className}>
      <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        {!active && !error && hasMediaApi && secureContext && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Initializing camera...
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <Alert className="w-full max-w-sm">
              <CameraOff className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex gap-2">
          {active ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={stop}
              className="gap-1"
            >
              <CameraOff className="h-4 w-4" /> Stop
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={start}
              className="gap-1"
            >
              <Camera className="h-4 w-4" /> Start
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={capture}
            disabled={!active}
            className="gap-1"
          >
            <ImageDown className="h-4 w-4" /> Snapshot
          </Button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {snapUrl && (
        <div className="mt-2 text-xs flex items-center gap-2">
          <a className="underline" href={snapUrl} download="snapshot.png">
            Download snapshot
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              URL.revokeObjectURL(snapUrl);
              setSnapUrl(null);
            }}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
