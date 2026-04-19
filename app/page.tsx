import {
  ArrowRight,
  Bell,
  Cctv,
  UserCheck,
  Shield,
  Eye,
  Zap,
  Lock,
  Activity,
  Radio,
  ChevronRight,
  Flame,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import FeatureCard from "@/components/feature-card";
import { AnimatedStats } from "@/components/home/animated-stats";
import { HeroStatusTicker } from "@/components/home/hero-status-ticker";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ HERO SECTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative w-full pt-24 pb-20 md:pt-36 md:pb-28 lg:pt-48 lg:pb-36 overflow-hidden">
        {/* Premium gradient background */}
        <div className="pointer-events-none absolute inset-0 hero-gradient opacity-90" />
        <div className="pointer-events-none absolute inset-0 surface-mesh opacity-40" />

        <div className="relative z-10 container px-4 md:px-6">
          <div className="flex flex-col items-center text-center max-w-5xl mx-auto space-y-10">
            {/* Premium status badge */}
            <div className="status-badge-success animate-scale-in">
              <span className="status-dot-pulse">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>
              <span className="font-bold">System Online</span>
              <span className="opacity-70">•</span>
              <span>AI Models Active</span>
            </div>

            {/* Hero title with premium gradient */}
            <h1 className="hero-title animate-fade-in-up">
              <span className="block mb-2">Intelligent Security</span>
              <span className="block hero-accent">Powered by AI</span>
            </h1>

            <p className="max-w-3xl text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed animate-fade-in-up animation-delay-200">
              Real-time threat detection, violence recognition, and smart
              alerting — all from your existing camera infrastructure.
              <span className="block mt-2 text-gradient font-semibold">
                See what others miss.
              </span>
            </p>

            {/* CTA buttons with premium effects */}
            <div className="flex flex-col gap-4 sm:flex-row animate-fade-in-up animation-delay-400">
              <Link href="/live">
                <Button
                  size="lg"
                  className="px-10 py-6 text-base premium-button shadow-2xl shadow-primary/25 hover:shadow-primary/40 group"
                >
                  <Eye className="mr-2 h-5 w-5" />
                  Live Monitoring
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-2" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-10 py-6 text-base glass-button group"
                >
                  View Plans
                  <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>

            {/* Live status ticker */}
            <div className="animate-fade-in-up animation-delay-600">
              <HeroStatusTicker />
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ STATS BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative w-full border-y border-border/50 bg-gradient-to-b from-muted/40 to-background backdrop-blur-sm">
        <div className="container px-4 md:px-6">
          <AnimatedStats />
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ FEATURES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="w-full py-20 md:py-32 lg:py-40 relative overflow-hidden">
        {/* Background decoration */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

        <div className="relative container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-6 mb-20 animate-fade-in-up">
            <div className="status-badge-info">
              <Zap className="h-4 w-4" />
              <span className="font-bold">Enterprise Capabilities</span>
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight max-w-3xl">
              Six Layers of{" "}
              <span className="text-gradient">Intelligent Protection</span>
            </h2>
            <p className="max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
              Advanced AI models working 24/7 to detect threats, analyze
              behavior, and keep your premises secure.
            </p>
          </div>

          <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="animate-scale-in animation-delay-100">
              <FeatureCard
                icon={<Brain className="h-8 w-8" />}
                title="Violence Detection"
                description="CNN-RNN deep learning model analyzes video sequences to detect fights, aggression, and violent behavior in real-time with 95%+ accuracy."
                badge="AI Model"
              />
            </div>
            <div className="animate-scale-in animation-delay-200">
              <FeatureCard
                icon={<UserCheck className="h-8 w-8" />}
                title="Person Detection"
                description="YOLOv8-powered person tracking with unauthorized access alerts for restricted areas, counting, and behavior analysis."
                badge="YOLOv8"
              />
            </div>
            <div className="animate-scale-in animation-delay-300">
              <FeatureCard
                icon={<Shield className="h-8 w-8" />}
                title="Weapon Detection"
                description="Automatic identification of weapons including knives, firearms, and dangerous objects with critical-severity instant alerts."
                badge="Critical"
              />
            </div>
            <div className="animate-scale-in animation-delay-400">
              <FeatureCard
                icon={<Flame className="h-8 w-8" />}
                title="Fire & Smoke Detection"
                description="Early warning system for fire and smoke hazards with instant emergency alerts to prevent disasters before escalation."
              />
            </div>
            <div className="animate-scale-in animation-delay-500">
              <FeatureCard
                icon={<Bell className="h-8 w-8" />}
                title="Smart Alerting"
                description="Multi-severity alert engine with per-camera cooldowns, zone filtering, and real-time WebSocket push notifications."
              />
            </div>
            <div className="animate-scale-in animation-delay-600">
              <FeatureCard
                icon={<Cctv className="h-8 w-8" />}
                title="Multi-Camera Streams"
                description="Connect unlimited IP cameras via RTSP, MJPEG, or HLS. Process multiple feeds simultaneously with optimized parallel inference."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── HOW IT WORKS ──────────── */}
      <section className="w-full py-16 md:py-28 lg:py-36 bg-muted/20">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Activity className="h-3.5 w-3.5" />
              How It Works
            </div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              From Camera to Alert in Milliseconds
            </h2>
            <p className="max-w-2xl text-muted-foreground md:text-lg">
              Our pipeline processes every frame through multiple AI models and
              delivers actionable insights instantly.
            </p>
          </div>

          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  icon: <Cctv className="h-6 w-6" />,
                  title: "Connect Cameras",
                  desc: "Add your IP cameras via RTSP, MJPEG, or HLS streams. Works with any standard surveillance hardware.",
                },
                {
                  step: "02",
                  icon: <Brain className="h-6 w-6" />,
                  title: "AI Analysis",
                  desc: "YOLOv8 object detection + CNN-RNN violence model process frames in parallel on the server.",
                },
                {
                  step: "03",
                  icon: <Bell className="h-6 w-6" />,
                  title: "Instant Alerts",
                  desc: "Threats trigger real-time WebSocket alerts with severity levels, detection boxes, and timestamps.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="group relative flex flex-col items-center text-center p-5 md:p-6 rounded-2xl border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                >
                  <div className="absolute -top-3 right-4 text-[11px] font-bold text-primary/40 tracking-widest">
                    STEP {item.step}
                  </div>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── ABOUT ──────────── */}
      <section className="w-full py-16 md:py-28 lg:py-36">
        <div className="container px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="flex flex-col space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary w-fit">
                <Lock className="h-3.5 w-3.5" />
                About SecureSight
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                Security That Thinks <span className="text-primary">Ahead</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                SecureSight combines cutting-edge computer vision with deep
                learning to transform ordinary surveillance cameras into
                intelligent threat detection systems.
              </p>
              <div className="space-y-4">
                {[
                  "YOLOv8 object detection running at optimized FPS",
                  "CNN-RNN violence detection on video sequences",
                  "Multi-severity alert engine with smart cooldowns",
                  "WebSocket real-time streaming architecture",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <ChevronRight className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Link href="/pricing">
                  <Button className="group">
                    View Plans
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/live">
                  <Button variant="outline">Try Live Demo</Button>
                </Link>
              </div>
            </div>

            {/* Tech stack visual instead of placeholder image */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    icon: <Brain className="h-8 w-8" />,
                    label: "YOLOv8",
                    sub: "Object Detection",
                  },
                  {
                    icon: <Activity className="h-8 w-8" />,
                    label: "CNN-RNN",
                    sub: "Violence Detection",
                  },
                  {
                    icon: <Radio className="h-8 w-8" />,
                    label: "WebSocket",
                    sub: "Real-Time Stream",
                  },
                  {
                    icon: <Zap className="h-8 w-8" />,
                    label: "FastAPI",
                    sub: "Backend Engine",
                  },
                ].map((tech) => (
                  <div
                    key={tech.label}
                    className="group flex flex-col items-center justify-center p-4 md:p-6 rounded-2xl border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 aspect-square"
                  >
                    <div className="mb-3 text-primary/60 group-hover:text-primary transition-colors">
                      {tech.icon}
                    </div>
                    <span className="font-semibold text-sm">{tech.label}</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {tech.sub}
                    </span>
                  </div>
                ))}
              </div>
              {/* Glow effect */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── CTA ──────────── */}
      <section className="w-full py-16 md:py-24 lg:py-32 border-t relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_110%,hsl(var(--primary)/0.08),transparent)]" />
        <div className="container relative z-10 px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              Ready to Secure Your Premises?
            </h2>
            <p className="text-muted-foreground text-lg">
              Deploy SecureSight in minutes. Connect your cameras, enable AI
              detection, and start receiving real-time security alerts.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row pt-2">
              <Link href="/pricing">
                <Button size="lg" className="px-10 text-base group">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/live">
                <Button variant="outline" size="lg" className="px-10 text-base">
                  <Eye className="mr-2 h-5 w-5" />
                  Live Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
