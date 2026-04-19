import { Shield, Lock } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl px-4 py-16 md:py-24">
      <div className="space-y-6 mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
          <Lock className="h-3.5 w-3.5" />
          Privacy
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">
          Privacy <span className="text-primary">Policy</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Last updated: February 2026
        </p>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed">
            SecureSight processes video frames for real-time detection. We do
            not persistently store raw video data. Account information
            (email, hashed password) is stored securely for authentication
            purposes only.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">How We Use Your Data</h2>
          <p className="text-muted-foreground leading-relaxed">
            Video frames are processed through our AI models for threat
            detection and immediately discarded after analysis. Detection
            metadata (alert type, timestamp, confidence score) is retained
            for generating alert history and analytics.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            All connections use TLS/SSL encryption. Camera credentials are
            stored locally in your browser and never transmitted to our
            servers. Backend communication uses CORS-protected API endpoints.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Third-Party Services</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do not share any personal or surveillance data with third
            parties. All AI processing happens on your designated backend
            server.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            You may request deletion of your account data at any time. Camera
            configurations can be cleared from your browser&apos;s local storage.
            Contact us for data-related requests.
          </p>
        </section>
      </div>
    </div>
  );
}
