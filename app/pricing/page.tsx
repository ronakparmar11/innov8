import { Check, Shield, Eye, Zap, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    description: "Perfect for small installations",
    price: "Free",
    priceNote: "forever",
    features: [
      "Up to 2 camera feeds",
      "YOLOv8 object detection",
      "Basic alert notifications",
      "Community support",
      "REST API access",
    ],
    cta: "Get Started",
    href: "/live-access",
    variant: "outline" as const,
    popular: false,
  },
  {
    name: "Professional",
    description: "For growing security needs",
    price: "$49",
    priceNote: "/month",
    features: [
      "Up to 16 camera feeds",
      "YOLOv8 + violence detection",
      "Real-time WebSocket alerts",
      "Custom alert rules & zones",
      "Priority email support",
      "Alert history & analytics",
      "Per-camera cooldown tuning",
    ],
    cta: "Start Free Trial",
    href: "/live-access",
    variant: "default" as const,
    popular: true,
  },
  {
    name: "Enterprise",
    description: "Full-scale deployments",
    price: "Custom",
    priceNote: "contact us",
    features: [
      "Unlimited camera feeds",
      "All AI models included",
      "On-premise deployment option",
      "Custom model training",
      "24/7 dedicated support",
      "SLA guarantees",
      "White-label available",
      "Multi-site management",
    ],
    cta: "Contact Sales",
    href: "/contact",
    variant: "outline" as const,
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero */}
      <section className="relative w-full pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-gradient opacity-70" />
        <div className="pointer-events-none absolute inset-0 surface-mesh opacity-30" />
        <div className="relative z-10 container px-4 md:px-6">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
            <div className="status-badge-info animate-scale-in">
              <Star className="h-4 w-4" />
              <span className="font-bold">Simple Pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight">
              Plans That Scale <span className="text-gradient">With You</span>
            </h1>
            <p className="max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
              Start free with core detection capabilities. Upgrade as your
              security infrastructure grows.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Pricing Cards */}
      <section className="w-full py-8 md:py-16">
        <div className="container px-4 md:px-6">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border-2 bg-card p-6 md:p-8 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 ${
                  plan.popular
                    ? "border-primary shadow-lg shadow-primary/10 md:scale-[1.02]"
                    : "border-border/60 hover:border-primary/30"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-lg">
                      <Zap className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-8">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-sm text-muted-foreground ml-1">
                    {plan.priceNote}
                  </span>
                </div>

                <ul className="mb-8 flex-grow space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.href} className="mt-auto">
                  <Button
                    variant={plan.variant}
                    className={`w-full group ${plan.popular ? "premium-button" : "glass-button"}`}
                    size="lg"
                  >
                    {plan.cta}
                    <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="w-full py-16 md:py-24 border-t relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_110%,hsl(var(--primary)/0.08),transparent)]" />
        <div className="container relative z-10 px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Not Sure Which Plan?
            </h2>
            <p className="text-muted-foreground text-lg">
              Try the live demo with no commitment. See SecureSight in action
              with your own cameras.
            </p>
            <Link href="/live-access">
              <Button
                size="lg"
                className="px-10 text-base premium-button group"
              >
                <Eye className="mr-2 h-5 w-5" />
                Try Live Demo
                <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
