import type React from "react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}

export default function FeatureCard({
  icon,
  title,
  description,
  badge,
}: FeatureCardProps) {
  return (
    <div className="group relative glass-card card-hover-lift p-6 md:p-8 rounded-2xl overflow-hidden">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {badge && (
        <span className="absolute top-4 right-4 md:top-5 md:right-5 status-badge bg-primary/10 border-primary/30 text-primary text-[10px] font-bold tracking-widest uppercase z-10">
          {badge}
        </span>
      )}

      {/* Icon container with premium styling */}
      <div className="relative mb-4 md:mb-6 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20 group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:ring-primary/40 group-hover:scale-110 transition-all duration-500">
        <div className="relative z-10">{icon}</div>
        {/* Rotating border effect */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-glow-pulse" />
      </div>

      <h3 className="relative text-xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">
        {title}
      </h3>

      <p className="relative text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 scale-x-0 group-hover:scale-x-100 transition-all duration-700" />
    </div>
  );
}
