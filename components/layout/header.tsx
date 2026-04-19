"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/layout/mode-toggle";
import {
  Shield,
  Menu,
  X,
  User,
  Bell,
  Home,
  Settings,
  LogOut,
  Lock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAlertCount } from "@/contexts/alert-count-context";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  // Placeholder auth flag (replace later with real auth state)
  const isAuthenticated = false;
  const { alertCount } = useAlertCount();

  const routes = [
    { href: "/", label: "Home", icon: Home },
    { href: "/live-access", label: "Live Monitoring", icon: Lock },
    { href: "/calendar", label: "Alert History", icon: Bell },
  ];

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60 shadow-lg shadow-primary/[0.02]">
      <div className="container flex h-16 md:h-18 items-center justify-between px-4 md:px-6">
        {/* Logo Section */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 group-hover:from-primary group-hover:to-primary/80 transition-all duration-300 group-hover:scale-110">
              <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm md:text-base font-bold leading-tight tracking-tight group-hover:text-primary transition-colors">
                SecureSight
              </div>
              <div className="text-[10px] md:text-[11px] text-muted-foreground leading-tight font-medium">
                AI Surveillance
              </div>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                isActive(route.href)
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              }`}
            >
              {route.label}
              {route.href === "/calendar" && alertCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white animate-pulse shadow-lg shadow-red-500/30">
                  {alertCount > 99 ? "99+" : alertCount}
                </span>
              )}
              {isActive(route.href) && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          <ModeToggle />

          <Link href="/login" className="hidden md:inline-flex">
            <Button
              variant="outline"
              size="sm"
              className="glass-button premium-button"
            >
              Login
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full border-2 border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <User className="h-4 w-4 md:h-5 md:w-5" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-panel w-56">
              {isAuthenticated ? (
                <>
                  <DropdownMenuLabel className="font-bold">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer hover:bg-primary/10">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-primary/10">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer hover:bg-destructive/10 text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuLabel className="font-bold">
                    Welcome
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/login"
                      className="cursor-pointer hover:bg-primary/10"
                    >
                      Login
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/login#register"
                      className="cursor-pointer hover:bg-primary/10"
                    >
                      Register
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-lg hover:bg-primary/10"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="fixed inset-0 top-16 z-50 grid h-[calc(100vh-4rem)] grid-flow-row auto-rows-max overflow-auto p-4 pb-32 shadow-2xl animate-slide-in-right md:hidden bg-background/95 backdrop-blur-xl">
          <div className="relative z-20 glass-panel p-5 shadow-2xl rounded-2xl">
            <nav className="grid gap-1">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={`flex items-center gap-3 rounded-xl p-3 text-sm font-semibold transition-all duration-300 ${
                    isActive(route.href)
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "hover:bg-primary/5 hover:text-primary"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <route.icon className="h-5 w-5" />
                  {route.label}
                  {route.href === "/calendar" && alertCount > 0 && (
                    <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {alertCount > 99 ? "99+" : alertCount}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t border-border/50">
              <Link
                href="/login"
                className="w-full"
                onClick={() => setIsOpen(false)}
              >
                <Button className="w-full premium-button gap-2">
                  <User className="h-4 w-4" />
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
