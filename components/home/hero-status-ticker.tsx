"use client";

import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Eye } from "lucide-react";

const messages = [
  {
    icon: <Shield className="h-3.5 w-3.5 text-green-500" />,
    text: "All zones secure — 0 active threats",
    color: "text-green-600 dark:text-green-400",
  },
  {
    icon: <Eye className="h-3.5 w-3.5 text-blue-500" />,
    text: "YOLOv8 model loaded — 80+ object classes ready",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
    text: "Violence detection model active — CNN-RNN pipeline online",
    color: "text-amber-600 dark:text-amber-400",
  },
  {
    icon: <Shield className="h-3.5 w-3.5 text-green-500" />,
    text: "WebSocket stream ready — real-time alerts enabled",
    color: "text-green-600 dark:text-green-400",
  },
];

export function HeroStatusTicker() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % messages.length);
        setVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const msg = messages[index];

  return (
    <div className="h-8 flex items-center justify-center animate-fade-in-up animation-delay-600">
      <div
        className={`inline-flex items-center gap-2 text-xs font-medium transition-all duration-400 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
        } ${msg.color}`}
      >
        {msg.icon}
        <span>{msg.text}</span>
      </div>
    </div>
  );
}
