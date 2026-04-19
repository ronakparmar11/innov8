"use client";

import { useEffect } from "react";
import { AlertCircle, Shield, Flame, Users, Package, Car } from "lucide-react";
import { useDetectionAlerts } from "@/hooks/use-detection-alerts";
import { Badge } from "@/components/ui/badge";

interface AlertOverlayProps {
  cameraUrl?: string;
  cameraName?: string;
  onAlertDetected?: (alert: {
    id: string;
    label: string;
    score: number;
    timestamp: number;
  }) => void;
  showDetectionBoxes?: boolean;
  className?: string;
}

const alertIcons: Record<string, any> = {
  "weapon-detected": Shield,
  "violence-detected": AlertCircle,
  "fire-detected": Flame,
  "person-unauthorized": Users,
  "multiple-persons": Users,
  "suspicious-object": Package,
  "vehicle-detected": Car,
};

const alertColors: Record<string, string> = {
  "weapon-detected": "bg-red-500/90",
  "violence-detected": "bg-red-600/90",
  "fire-detected": "bg-orange-500/90",
  "person-unauthorized": "bg-yellow-500/90",
  "multiple-persons": "bg-yellow-400/90",
  "suspicious-object": "bg-blue-500/90",
  "vehicle-detected": "bg-slate-500/90",
};

export default function AlertOverlay({
  cameraUrl,
  cameraName,
  onAlertDetected,
  showDetectionBoxes = false,
  className = "",
}: AlertOverlayProps) {
  const { latestAlert, lastDetections, personCount, status, errorMessage } =
    useDetectionAlerts(cameraUrl, {
      enabled: !!cameraUrl,
      minScore: 0.6,
    });

  // Trigger callback when new alert is detected
  useEffect(() => {
    if (latestAlert && onAlertDetected) {
      onAlertDetected({
        id: latestAlert.id,
        label: latestAlert.label,
        score: latestAlert.score,
        timestamp: latestAlert.ts,
      });
    }
  }, [latestAlert, onAlertDetected]);

  if (!cameraUrl) return null;

  const Icon = latestAlert
    ? alertIcons[latestAlert.label] || AlertCircle
    : null;
  const alertColor = latestAlert
    ? alertColors[latestAlert.label] || "bg-gray-500/90"
    : "";

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Detection Status Indicator */}
      <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-auto z-10">
        {status === "connected" && (
          <Badge className="bg-green-500/90 text-white border-0 shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
            AI Detection Active
          </Badge>
        )}
        {status === "polling" && (
          <Badge className="bg-blue-500/90 text-white border-0 shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
            Polling Mode
          </Badge>
        )}
        {personCount > 0 && (
          <Badge className="bg-purple-500/90 text-white border-0 shadow-lg">
            <Users className="w-3 h-3 mr-1" />
            {personCount} Person{personCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Live Alert Notification - Simple version without framer-motion */}
      {latestAlert && Icon && (
        <div className="absolute top-2 right-2 pointer-events-auto z-10 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`${alertColor} text-white px-4 py-2 rounded-lg shadow-2xl flex items-center gap-2 min-w-[200px]`}
          >
            <Icon className="h-5 w-5 animate-pulse" />
            <div className="flex-1">
              <div className="font-bold text-sm uppercase tracking-wide">
                {latestAlert.label.replace(/-/g, " ")}
              </div>
              <div className="text-xs opacity-90">
                Confidence: {(latestAlert.score * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detection Boxes (Optional) */}
      {showDetectionBoxes && lastDetections.length > 0 && (
        <div className="absolute inset-0 z-5">
          {lastDetections.map((det, idx) => (
            <div
              key={idx}
              className="absolute border-2 border-green-400 rounded"
              style={{
                left: `${(det.box[0] / 640) * 100}%`,
                top: `${(det.box[1] / 640) * 100}%`,
                width: `${((det.box[2] - det.box[0]) / 640) * 100}%`,
                height: `${((det.box[3] - det.box[1]) / 640) * 100}%`,
              }}
            >
              <div className="bg-green-400 text-black text-xs px-1 -mt-5">
                {det.name} {(det.conf * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="absolute bottom-2 left-2 right-2 pointer-events-auto z-10">
          <div className="bg-red-500/90 text-white px-3 py-2 rounded text-xs">
            {errorMessage}
          </div>
        </div>
      )}
    </div>
  );
}
