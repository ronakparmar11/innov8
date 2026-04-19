"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AddIpCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (url: string, name: string) => void;
}

export default function AddIpCameraDialog({
  open,
  onOpenChange,
  onAdd,
}: AddIpCameraDialogProps) {
  const [url, setUrl] = useState("https://video1.yashpatelis.online/video");
  const [name, setName] = useState("");

  const handleAdd = () => {
    if (url && name) {
      const raw = url.trim();
      let finalUrl = raw;
      try {
        const u = new URL(raw);
        const isGo2RtcViewer =
          u.pathname.endsWith("/stream.html") && u.searchParams.has("src");

        // For go2rtc viewer URLs, keep as-is so we can use WebRTC/ws directly (HLS may not be enabled)
        // We leave finalUrl as raw URL. The live/page.tsx handles the proxy wrapping.
      } catch {
        // If URL parsing fails, keep as-is
      }

      onAdd(finalUrl, name.trim());
      setUrl("https://video1.yashpatelis.online/video");
      setName("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add IP Camera</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            placeholder="Camera Name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setName(e.target.value)
            }
            required
          />
          <Input
            placeholder="Stream URL (MJPEG: http://ip/videofeed or http://ip/video.mjpg, HLS: http://ip/live/index.m3u8, Snapshot: http://ip/shot.jpg)"
            value={url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUrl(e.target.value)
            }
            required
          />
        </div>
        <DialogFooter>
          <Button onClick={handleAdd} disabled={!url || !name}>
            Add Camera
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
