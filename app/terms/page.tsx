import { Shield, FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="container max-w-3xl px-4 py-16 md:py-24">
      <div className="space-y-6 mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
          <FileText className="h-3.5 w-3.5" />
          Legal
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">
          Terms of <span className="text-primary">Service</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Last updated: February 2026
        </p>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing and using SecureSight Technologies&apos; services, you agree
            to be bound by these Terms of Service. If you do not agree, please
            do not use our services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Description of Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            SecureSight provides AI-powered surveillance analytics, including
            real-time object detection, violence recognition, and automated
            alerting. The service processes video feeds using machine learning
            models to detect security-relevant events.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. User Responsibilities</h2>
          <p className="text-muted-foreground leading-relaxed">
            You are responsible for ensuring you have the legal right to monitor
            the areas covered by your cameras. You must comply with all
            applicable local laws regarding video surveillance and data
            privacy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. Data Processing</h2>
          <p className="text-muted-foreground leading-relaxed">
            Video frames are processed in real-time for detection purposes and
            are not stored beyond the immediate processing window. Alert
            metadata may be retained to provide detection history.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">5. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            SecureSight is provided &quot;as is&quot; without warranty. We do not guarantee
            100% detection accuracy. The service should supplement, not replace,
            human security monitoring.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">6. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions regarding these terms, please contact us via the
            contact page.
          </p>
        </section>
      </div>
    </div>
  );
}
