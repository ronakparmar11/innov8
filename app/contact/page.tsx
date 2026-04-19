import { Mail, Shield, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="container max-w-4xl px-4 py-16 md:py-24">
      <div className="space-y-6 mb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mx-auto">
          <MessageSquare className="h-3.5 w-3.5" />
          Get in Touch
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">
          Contact <span className="text-primary">Us</span>
        </h1>
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed">
          Have questions about SecureSight? Need enterprise support or custom
          deployments? We&apos;d love to hear from you.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="group flex flex-col items-center text-center p-8 rounded-2xl border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
            <Mail className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Email Us</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            For general inquiries, support requests, or partnership
            opportunities.
          </p>
          <a
            href="mailto:contact@securesight.tech"
            className="text-primary font-medium text-sm hover:underline underline-offset-4"
          >
            contact@securesight.tech
          </a>
        </div>

        <div className="group flex flex-col items-center text-center p-8 rounded-2xl border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
            <Shield className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Enterprise Sales</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            For custom deployments, on-premise installations, and volume
            licensing.
          </p>
          <a
            href="mailto:enterprise@securesight.tech"
            className="text-primary font-medium text-sm hover:underline underline-offset-4"
          >
            enterprise@securesight.tech
          </a>
        </div>
      </div>

      <div className="mt-12 text-center">
        <Link href="/">
          <Button variant="outline" className="glass-button">
            ← Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
