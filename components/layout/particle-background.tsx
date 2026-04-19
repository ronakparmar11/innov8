"use client";
import React, { useMemo } from "react";

interface ParticleBackgroundProps {
  count?: number;
  maxSize?: number;
  speed?: number;
  repel?: boolean;
  className?: string;
}

/** Static orbs placed in a uniform grid across the viewport. */
const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  className = "",
}) => {
  const orbs = useMemo(() => {
    const cols = 8;
    const rows = 6;
    const items: { x: string; y: string; size: number; opacity: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        items.push({
          x: `${((c + 0.5) / cols) * 100}%`,
          y: `${((r + 0.5) / rows) * 100}%`,
          size: 3 + ((r * cols + c) % 3) * 1.5,
          opacity: 0.06 + ((r + c) % 4) * 0.03,
        });
      }
    }
    return items;
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
    >
      {orbs.map((orb, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-primary"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            opacity: orb.opacity,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
};

export default ParticleBackground;
