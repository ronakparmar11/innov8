import Link from "next/link";
import { Shield, Lock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/70 backdrop-blur py-8">
      <div className="container flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">SecureSight Technologies</p>
            <p className="text-xs text-muted-foreground mt-1">
              &copy; {new Date().getFullYear()} • AI-powered safety surveillance.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link
            href="/live-access"
            className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            <Lock className="h-3.5 w-3.5" />
            Live Access
          </Link>
          <Link
            href="/terms"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Privacy
          </Link>
          <Link
            href="/contact"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
