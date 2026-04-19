"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Plus,
  Link as LinkIcon,
  Wifi,
  PlayCircle,
  StopCircle,
} from "lucide-react";
import Hls from "hls.js";

export type Camera = {
  id: string;
  name: string;
  url: string;
  protocol: "rtsp" | "http" | "https";
  status: "unknown" | "online" | "offline";
  playing?: boolean;
};

interface CCTVManagerProps {
  onCameraPlay?: (cam: Camera) => void;
}

export default function CCTVManager({ onCameraPlay }: CCTVManagerProps) {
  const generateId = React.useCallback(() => {
    try {
      // @ts-ignore
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        // @ts-ignore
        return crypto.randomUUID();
      }
    } catch {}
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }, []);
  const [cameras, setCameras] = React.useState<Camera[]>([]);
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const hlsRef = React.useRef<Hls | null>(null);

  // Load cameras from localStorage on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return; // SSR check

    try {
      const savedCameras = localStorage.getItem("securesight-cameras");
      if (savedCameras) {
        const parsedCameras = JSON.parse(savedCameras);
        console.log("Loaded cameras from localStorage:", parsedCameras);
        setCameras(parsedCameras);
      }
    } catch (e) {
      console.error("Failed to load cameras from localStorage", e);
    }
  }, []);

  // Save cameras to localStorage when they change
  React.useEffect(() => {
    if (typeof window === "undefined") return; // SSR check

    try {
      console.log("Saving cameras to localStorage:", cameras);
      localStorage.setItem("securesight-cameras", JSON.stringify(cameras));
    } catch (e) {
      console.error("Failed to save cameras to localStorage", e);
    }
  }, [cameras]);

  const addCamera = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;

    // Clean up the URL - trim whitespace
    const cleanUrl = url.trim();

    // Determine protocol from URL
    const protocol = cleanUrl.startsWith("rtsp")
      ? "rtsp"
      : cleanUrl.startsWith("https")
        ? "https"
        : "http";

    // No longer auto-modifying base URLs; use exactly what user enters
    const actualUrl = cleanUrl;

    // Create camera object
    // Optionally wrap via proxy if cross-origin (simple heuristic: if hostname not same-origin)
    let finalUrl = actualUrl;
    try {
      const u = new URL(actualUrl);
      if (
        typeof window !== "undefined" &&
        u.origin !== window.location.origin
      ) {
        // Only wrap if http(s); never wrap rtsp (not supported by proxy).
        if (u.protocol === "http:" || u.protocol === "https:") {
          finalUrl = `/api/proxy?url=${encodeURIComponent(u.toString())}`;
        }
      }
    } catch {}

    const cam: Camera = {
      id: generateId(),
      name: name.trim(),
      url: finalUrl,
      protocol,
      status: "unknown",
    };

    console.log("Adding camera:", cam);

    // Add to camera list
    setCameras((prev) => [...prev, cam]);

    // Reset form
    setName("");
    setUrl("");

    // Auto-test the connection
    setTimeout(() => testConnection(cam), 500);

    // Try to play the camera automatically
    setTimeout(() => startPlayback(cam), 1000);
  };

  const removeCamera = (id: string) => {
    setCameras((prev) => prev.filter((c) => c.id !== id));
  };

  const testConnection = async (cam: Camera) => {
    setTestingId(cam.id);
    console.log("Testing connection to camera:", cam.url);

    // Placeholder: For RTSP you'd normally test via backend proxy; browser can't open raw RTSP.
    // We'll treat HTTP(S) fetch 200 as online; RTSP stays unknown (needs server component).
    let status: Camera["status"] =
      cam.protocol === "rtsp" ? "unknown" : "offline";

    if (cam.protocol !== "rtsp") {
      if (cam.url.endsWith(".m3u8")) {
        // For HLS streams, we'll do a quick check if it returns valid content
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 4000);
          await fetch(cam.url, {
            signal: ctrl.signal,
            // For CORS-enabled streams we can inspect contents,
            // for CORS-restricted streams we'll use no-cors and assume it's valid if reachable
            mode: "no-cors",
          });
          clearTimeout(timer);
          status = "online";
        } catch (err) {
          console.warn("HLS check failed:", err);
          status = "offline";
        }
      } else if (
        cam.url.endsWith(".mjpg") ||
        cam.url.includes("mjpg/video") ||
        cam.url.includes("mjpeg")
      ) {
        // For MJPEG streams, a HEAD request or no-cors GET is the best we can do
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 4000);
          await fetch(cam.url, {
            method: "HEAD",
            mode: "no-cors",
            signal: ctrl.signal,
          });
          clearTimeout(timer);
          status = "online";
        } catch (err) {
          console.warn("MJPEG check failed:", err);
          status = "offline";
        }
      } else {
        // Standard HTTP check for other streams
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 4000);
          await fetch(cam.url, {
            method: "HEAD",
            mode: "no-cors",
            signal: ctrl.signal,
          });
          clearTimeout(timer);
          status = "online";
        } catch (err) {
          console.warn("Stream check failed:", err);
          status = "offline";
        }
      }
    }

    setCameras((prev) =>
      prev.map((c) => (c.id === cam.id ? { ...c, status } : c)),
    );
    setTestingId(null);
  };

  const stopPlayback = React.useCallback(() => {
    try {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }
      setActiveId((prev) => {
        console.log("Stopping playback for camera ID:", prev);
        return null;
      });
      setCameras((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, playing: false } : c)),
      );
    } catch (err) {
      console.error("Error stopping playback:", err);
    }
  }, [activeId]);

  const startPlayback = (cam: Camera) => {
    if (!videoRef.current) return;
    stopPlayback();
    setActiveId(cam.id);
    // Log camera details for debugging
    console.log("Starting camera playback:", cam);

    // First, notify that we're selecting this camera regardless of playback status
    onCameraPlay?.(cam);

    // If it's an HLS (.m3u8) URL
    if (cam.url.endsWith(".m3u8")) {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;
        hls.loadSource(cam.url);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(console.error);
          setCameras((prev) =>
            prev.map((c) => (c.id === cam.id ? { ...c, playing: true } : c)),
          );
          onCameraPlay?.({ ...cam, playing: true });
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.warn("HLS error:", event, data);
          if (data.fatal) {
            setCameras((prev) =>
              prev.map((c) =>
                c.id === cam.id
                  ? { ...c, playing: false, status: "offline" }
                  : c,
              ),
            );
          }
        });
      } else if (
        videoRef.current.canPlayType("application/vnd.apple.mpegurl")
      ) {
        videoRef.current.src = cam.url;
        videoRef.current.addEventListener(
          "loadedmetadata",
          () => {
            videoRef.current?.play().catch(console.error);
            setCameras((prev) =>
              prev.map((c) => (c.id === cam.id ? { ...c, playing: true } : c)),
            );
            onCameraPlay?.({ ...cam, playing: true });
          },
          { once: true },
        );
      } else {
        alert("HLS not supported in this browser.");
      }
    } else if (
      cam.url.endsWith(".mjpg") ||
      cam.url.includes("mjpg/video") ||
      cam.url.includes("mjpeg")
    ) {
      // MJPEG streams often work with <img> but we'll try video first
      videoRef.current.src = cam.url;
      videoRef.current
        .play()
        .then(() => {
          setCameras((prev) =>
            prev.map((c) => (c.id === cam.id ? { ...c, playing: true } : c)),
          );
          onCameraPlay?.({ ...cam, playing: true });
        })
        .catch((err) => {
          console.warn("MJPEG error:", err);
          // If video fails, we could try image-based MJPEG but that requires custom implementation
          setCameras((prev) =>
            prev.map((c) =>
              c.id === cam.id ? { ...c, playing: false, status: "offline" } : c,
            ),
          );
        });
    } else {
      // For direct video streams (MP4, WebM, etc) or snapshot endpoints
      videoRef.current.src = cam.url;
      videoRef.current
        .play()
        .then(() => {
          console.log("Stream started successfully:", cam.url);
          setCameras((prev) =>
            prev.map((c) => (c.id === cam.id ? { ...c, playing: true } : c)),
          );
          onCameraPlay?.({ ...cam, playing: true });
        })
        .catch((err) => {
          console.warn("Stream error:", err);

          try {
            // Try with a different approach - for some streams, direct assignment works better
            if (videoRef.current) {
              videoRef.current.src = "";
              const source = document.createElement("source");
              source.src = cam.url;
              source.type = "video/mp4";
              videoRef.current.appendChild(source);
              videoRef.current.load();
              videoRef.current
                .play()
                .then(() => {
                  console.log("Alternative playback method succeeded");
                  setCameras((prev) =>
                    prev.map((c) =>
                      c.id === cam.id ? { ...c, playing: true } : c,
                    ),
                  );
                  onCameraPlay?.({ ...cam, playing: true });
                })
                .catch(() => {
                  setCameras((prev) =>
                    prev.map((c) =>
                      c.id === cam.id
                        ? { ...c, playing: false, status: "offline" }
                        : c,
                    ),
                  );
                });
            }
          } catch (e) {
            console.error("Both playback methods failed:", e);
            setCameras((prev) =>
              prev.map((c) =>
                c.id === cam.id
                  ? { ...c, playing: false, status: "offline" }
                  : c,
              ),
            );
          }
        });
    }
  };

  React.useEffect(() => stopPlayback, [stopPlayback]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">CCTV Cameras</CardTitle>
        <CardDescription>
          Register network streams (RTSP/HTTP). RTSP requires backend relay.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={addCamera} className="grid gap-2">
          <div className="grid gap-1">
            <Label htmlFor="cam-name">Name</Label>
            <Input
              id="cam-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lobby Camera"
              required
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="cam-url">Stream URL</Label>
            <Input
              id="cam-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://your-camera-ip:port/stream"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter RTSP/HTTP(S) URL. External domains auto-routed via
              /api/proxy for CORS. RTSP still needs a relay.
            </p>
          </div>
          <Button type="submit" size="sm" className="mt-2 gap-1">
            <Plus className="h-4 w-4" /> Add Camera
          </Button>
        </form>
        <div className="space-y-3">
          {cameras.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No cameras added yet.
            </p>
          )}
          {cameras.map((cam) => (
            <div
              key={cam.id}
              className="rounded-md border p-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {cam.protocol === "rtsp" ? (
                    <Wifi className="h-4 w-4" />
                  ) : (
                    <LinkIcon className="h-4 w-4" />
                  )}
                  <span className="font-medium">{cam.name}</span>
                  <Badge
                    variant={
                      cam.status === "online"
                        ? "default"
                        : cam.status === "offline"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {cam.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {cam.playing ? (
                    <Button size="sm" variant="outline" onClick={stopPlayback}>
                      <StopCircle className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startPlayback(cam)}
                      disabled={testingId === cam.id}
                    >
                      <PlayCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testConnection(cam)}
                    disabled={testingId === cam.id}
                  >
                    {testingId === cam.id ? "Testing..." : "Test"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeCamera(cam.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <code className="text-xs break-all text-muted-foreground">
                {cam.url}
              </code>
              {cam.protocol === "rtsp" && cam.status === "unknown" && (
                <p className="text-xs text-muted-foreground">
                  RTSP needs a server relay (FFmpeg/WebRTC) to preview in
                  browser.
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <video
            ref={videoRef}
            controls
            playsInline
            className="w-full rounded-md bg-black aspect-video"
          />
        </div>
      </CardContent>
    </Card>
  );
}
