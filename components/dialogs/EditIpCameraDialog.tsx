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

export interface EditableCamera {
  id: string;
  name: string;
  url: string;
}

interface EditIpCameraDialogProps {
  open: boolean;
  camera: EditableCamera | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, name: string, url: string) => void;
  onDelete?: (id: string) => void;
}

export default function EditIpCameraDialog({
  open,
  camera,
  onOpenChange,
  onSave,
  onDelete,
}: EditIpCameraDialogProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    const nextName = camera?.name ?? "";
    const nextUrl = camera?.url ?? "";
    setName(nextName);
    setUrl(nextUrl);
  }, [open, camera?.id, camera?.name, camera?.url]);

  const handleSave = () => {
    if (!camera) return;
    if (!name.trim() || !url.trim()) return;
    onSave(camera.id, name.trim(), url.trim());
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!camera || !onDelete) return;
    onDelete(camera.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit IP Camera</DialogTitle>
        </DialogHeader>
        {camera ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Name</label>
              <Input
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Stream URL</label>
              <Input
                value={url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUrl(e.target.value)
                }
                placeholder="http://ip/mjpg/video.mjpg or http://ip/live/index.m3u8"
              />
              <p className="text-[10px] text-muted-foreground leading-snug">
                Supports MJPEG (.mjpg / mjpeg path), HLS (.m3u8), or static
                snapshot (.jpg/.png). For RTSP use a gateway.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No camera selected.</p>
        )}
        <DialogFooter className="flex justify-between gap-2">
          {camera && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              size="sm"
            >
              Delete
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!name.trim() || !url.trim()}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
