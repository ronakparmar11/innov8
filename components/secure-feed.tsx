"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera } from "./camera/cctv-manager";
import IPCameraFeed from "./camera/ip-camera-feed";
import {
  ShieldCheck,
  Shield,
  ShieldAlert,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface SecureFeedProps {
  cameras: Camera[];
  onFullscreen?: () => void;
}

export default function SecureFeed({ cameras, onFullscreen }: SecureFeedProps) {
  const [activeCamera, setActiveCamera] = useState<Camera | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handlePlayback = (cam: Camera) => {
    setError(null);
    setActiveCamera(cam);
  };

  const handleError = (errorMsg: string) => {
    setError(`Camera error: ${errorMsg}`);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    onFullscreen?.();
  };

  return (
    <Card
      className={`transition-all ${isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}`}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {activeCamera ? (
              <>
                Live Feed:{" "}
                <span className="text-primary">{activeCamera.name}</span>
              </>
            ) : (
              "Live Security Feed"
            )}
          </CardTitle>
          <CardDescription>
            {activeCamera?.status === "online" ? (
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-green-500" /> Secure connection
                established
              </span>
            ) : activeCamera?.status === "offline" ? (
              <span className="flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-red-500" /> Connection
                issues detected
              </span>
            ) : (
              "Select a camera to view live feed"
            )}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="h-8 w-8 p-0"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>

      <CardContent>
        {cameras.length === 0 ? (
          <div className="bg-muted/50 rounded-md p-8 text-center">
            <p className="text-muted-foreground">No cameras configured</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add cameras in the CCTV Manager
            </p>
          </div>
        ) : activeCamera ? (
          <div className="relative">
            <IPCameraFeed
              streamUrl={activeCamera.url}
              className="rounded-md overflow-hidden"
              onError={handleError}
            />
            {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All Cameras</TabsTrigger>
              <TabsTrigger value="online">Online Only</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-2 space-y-2">
              {cameras.map((cam) => (
                <Button
                  key={cam.id}
                  variant={cam.status === "online" ? "default" : "outline"}
                  className="w-full justify-start text-left"
                  onClick={() => handlePlayback(cam)}
                >
                  <span
                    className={`mr-2 h-2 w-2 rounded-full ${
                      cam.status === "online"
                        ? "bg-green-500"
                        : cam.status === "offline"
                          ? "bg-red-500"
                          : "bg-gray-400"
                    }`}
                  />
                  {cam.name}
                </Button>
              ))}
            </TabsContent>

            <TabsContent value="online" className="mt-2 space-y-2">
              {cameras
                .filter((c) => c.status === "online")
                .map((cam) => (
                  <Button
                    key={cam.id}
                    variant="default"
                    className="w-full justify-start text-left"
                    onClick={() => handlePlayback(cam)}
                  >
                    <span className="mr-2 h-2 w-2 rounded-full bg-green-500" />
                    {cam.name}
                  </Button>
                ))}
              {cameras.filter((c) => c.status === "online").length === 0 && (
                <p className="text-sm text-muted-foreground p-2">
                  No online cameras found
                </p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
