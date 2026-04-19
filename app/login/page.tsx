"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Shield, Lock, ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  const onLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder auth flow
    window.alert(`Login attempted for: ${loginEmail}`);
  };

  const onRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (registerPassword !== registerConfirmPassword) {
      window.alert("Passwords do not match.");
      return;
    }
    window.alert(`Registration attempted for: ${registerEmail}`);
  };

  return (
    <div className="container max-w-6xl px-4 py-14 md:py-20">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Shield className="h-3.5 w-3.5" />
            Secure Authentication
          </div>

          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            Welcome to <span className="text-primary">SecureSight</span>
          </h1>

          <p className="text-muted-foreground md:text-lg">
            Access your surveillance dashboard, manage camera streams, and monitor real-time alerts in one place.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-card/70 p-4">
              <p className="text-sm font-semibold">Live Monitoring</p>
              <p className="text-xs text-muted-foreground mt-1">Protected access and low-latency feed control.</p>
            </div>
            <div className="rounded-xl border bg-card/70 p-4">
              <p className="text-sm font-semibold">Smart Alerts</p>
              <p className="text-xs text-muted-foreground mt-1">AI detection with calendar history and export.</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Need access to live feeds directly? Use the dedicated gate at{" "}
            <Link href="/live-access" className="text-primary hover:underline underline-offset-4">
              /live-access
            </Link>
            .
          </p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Account Access</CardTitle>
            <CardDescription>Log in or create an account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-5">
                <form onSubmit={onLoginSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="admin@securesight.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        className="pl-10 pr-10"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowLoginPassword((p) => !p)}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full group">
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-5">
                <form onSubmit={onRegisterSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Full Name</Label>
                    <Input
                      id="register-name"
                      placeholder="Your name"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="you@company.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type={showRegisterPassword ? "text" : "password"}
                        className="pl-10 pr-10"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowRegisterPassword((p) => !p)}
                      >
                        {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-confirm-password"
                        type={showRegisterConfirmPassword ? "text" : "password"}
                        className="pl-10 pr-10"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowRegisterConfirmPassword((p) => !p)}
                      >
                        {showRegisterConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full group" variant="secondary">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="text-primary hover:underline underline-offset-4">Terms</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-primary hover:underline underline-offset-4">Privacy Policy</Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
