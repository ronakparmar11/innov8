"use client";

import { useEffect, useRef, useState } from "react";
import { Shield, Eye, Zap, Clock } from "lucide-react";

interface StatItem {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
}

const stats: StatItem[] = [
  {
    icon: <Eye className="h-5 w-5 text-primary" />,
    value: 99.7,
    suffix: "%",
    label: "Detection Accuracy",
  },
  {
    icon: <Zap className="h-5 w-5 text-primary" />,
    value: 45,
    suffix: "ms",
    label: "Avg Inference Time",
  },
  {
    icon: <Shield className="h-5 w-5 text-primary" />,
    value: 80,
    suffix: "+",
    label: "Object Classes",
  },
  {
    icon: <Clock className="h-5 w-5 text-primary" />,
    value: 24,
    suffix: "/7",
    label: "Continuous Monitoring",
  },
];

function useCountUp(end: number, duration = 2000, trigger = false) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!trigger) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * end).toFixed(1)));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };
    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [end, duration, trigger]);

  return value;
}

function StatCounter({ stat, inView }: { stat: StatItem; inView: boolean }) {
  const count = useCountUp(stat.value, 2000, inView);
  const display =
    stat.value % 1 !== 0 ? count.toFixed(1) : Math.round(count).toString();

  return (
    <div className="flex items-center gap-3 py-4 sm:py-6 px-3 sm:px-4">
      <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        {stat.icon}
      </div>
      <div className="min-w-0">
        <div className="text-xl sm:text-2xl font-bold tabular-nums">
          {display}
          <span className="text-primary">{stat.suffix}</span>
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
          {stat.label}
        </div>
      </div>
    </div>
  );
}

export function AnimatedStats() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0"
    >
      {stats.map((stat) => (
        <StatCounter key={stat.label} stat={stat} inView={inView} />
      ))}
    </div>
  );
}
