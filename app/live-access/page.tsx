"use client";

import { useState, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, User, ArrowRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function LiveAccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/live";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/live-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        setError("Invalid credentials.");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-5xl px-4 py-14 md:py-20">
      <div className="grid gap-8 lg:grid-cols-2 items-center">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Live Monitoring Security Check
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            Secure Access Required for <span className="text-primary">Live Feed</span>
          </h1>
          <p className="text-muted-foreground md:text-lg">
            This page is protected. Enter the operator credentials to continue to live monitoring.
          </p>
          <div className="rounded-xl border bg-card/70 p-4 text-sm text-muted-foreground">
            Credentials are validated securely on the server.
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Verify Identity
            </CardTitle>
            <CardDescription>Enter credentials to unlock /live</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    placeholder="Enter username"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {error ? (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="w-full group" disabled={loading}>
                {loading ? "Verifying..." : "Unlock Live Monitoring"}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <Link href="/" className="hover:text-primary underline-offset-4 hover:underline">
                  Return to Home
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LiveAccessPage() {
  return (
    <Suspense fallback={<div className="container max-w-5xl px-4 py-14 md:py-20">Loading...</div>}>
      <LiveAccessForm />
    </Suspense>
  );
}
