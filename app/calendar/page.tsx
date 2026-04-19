"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  AlertCircle,
  Download,
  Search,
  Activity,
  Shield,
  BarChart3,
  Radio,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParallelDetection } from "@/hooks/use-parallel-detection";

type CameraEntry = {
  id: string;
  name: string;
  url: string;
};

const defaultCameras: CameraEntry[] = [
  { id: "mobile-cam-1", name: "Mobile Camera", url: "http://192.168.1.101:8080/video" },
];

export default function AlertsPage() {
  const [mounted, setMounted] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("all");
  const [cameras, setCameras] = useState<CameraEntry[]>(defaultCameras);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("ss:cameras");
    if (stored) {
      try {
        const parsed: CameraEntry[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) setCameras(parsed);
      } catch { /* defaults */ }
    }
  }, []);

  // Memoize camera list to avoid creating a new array every render
  // (which would restart the useEffect polling loop in the hook)
  const cameraListRef = useRef(cameras);
  const stableCameraList = useMemo(() => {
    const serialized = JSON.stringify(cameras.map((c) => [c.id, c.url]));
    const prevSerialized = JSON.stringify(cameraListRef.current.map((c: CameraEntry) => [c.id, c.url]));
    if (serialized !== prevSerialized) {
      cameraListRef.current = cameras;
    }
    return cameraListRef.current.map((c: CameraEntry) => ({ id: c.id, name: c.name, url: c.url }));
  }, [cameras]);

  const { status, alerts, errorMessage } = useParallelDetection(
    stableCameraList,
    { enabled: mounted },
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const alertDate = new Date(alert.ts);
      const sameDay =
        date &&
        alertDate.getDate() === date.getDate() &&
        alertDate.getMonth() === date.getMonth() &&
        alertDate.getFullYear() === date.getFullYear();
      const matchesCamera = selectedCamera === "all" || alert.cameraId === selectedCamera;
      const matchesSearch =
        alert.cameraName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.label.toLowerCase().includes(searchQuery.toLowerCase());
      return sameDay && matchesCamera && matchesSearch;
    });
  }, [alerts, date, selectedCamera, searchQuery]);

  const uniqueAlertDays = useMemo(() => {
    const days = new Set<string>();
    alerts.forEach((alert) => {
      const alertDate = new Date(alert.ts);
      days.add(`${alertDate.getFullYear()}-${alertDate.getMonth()}-${alertDate.getDate()}`);
    });
    return Array.from(days).map((key) => {
      const [year, month, day] = key.split("-").map(Number);
      return new Date(year, month, day);
    });
  }, [alerts]);

  const getSeverityColor = (label: string) => {
    if (label.toLowerCase().includes("violence")) return "destructive";
    if (label.toLowerCase().includes("person")) return "default";
    return "secondary";
  };

  const todaysAlerts = alerts.filter((a) => {
    const today = new Date();
    const aDate = new Date(a.ts);
    return aDate.getDate() === today.getDate() && aDate.getMonth() === today.getMonth() && aDate.getFullYear() === today.getFullYear();
  });

  return (
    <div className="flex flex-col w-full">
      {/* Page header */}
      <div className="w-full border-b bg-muted/20">
        <div className="container px-4 py-6 md:px-6 md:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Security Alerts</h1>
                <p className="text-sm text-muted-foreground">Real-time detection alerts from all cameras</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`gap-1.5 py-1 px-3 text-xs ${
                  status === "polling"
                    ? "border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400"
                    : ""
                }`}
              >
                <span className={`inline-flex h-2 w-2 rounded-full ${status === "polling" ? "bg-green-500" : "bg-gray-500"}`} />
                {status === "polling" ? "Monitoring" : "Ready"}
              </Badge>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 py-6 md:px-6 md:py-8 space-y-6">
        {errorMessage && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="pt-6 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="text-sm text-red-600 dark:text-red-400">{errorMessage}</div>
            </CardContent>
          </Card>
        )}

        {/* Stats row */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Alerts", value: alerts.length, icon: Bell, color: "text-primary" },
            { label: "Today's Alerts", value: todaysAlerts.length, icon: Activity, color: "text-orange-500" },
            { label: "Cameras", value: cameras.length, icon: Radio, color: "text-blue-500" },
            { label: "Status", value: status === "polling" ? "Active" : status, icon: Shield, color: "text-green-500", isStatus: true },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/50 hover:border-primary/20 transition-colors">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                {"isStatus" in stat ? (
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${status === "polling" ? "bg-green-500" : "bg-gray-500"}`} />
                    <span className="text-lg font-bold capitalize">{stat.value}</span>
                  </div>
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <Card className="lg:col-span-1 border-border/50 shadow-lg shadow-primary/5">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Calendar</CardTitle>
                  <CardDescription className="text-xs">Select a date to view alerts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-lg border"
                modifiers={{ alert: uniqueAlertDays }}
                modifiersStyles={{
                  alert: {
                    fontWeight: "bold",
                    backgroundColor: "hsl(var(--primary) / 0.1)",
                    color: "hsl(var(--primary))",
                    borderRadius: "50%",
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="lg:col-span-2 border-border/50 shadow-lg shadow-primary/5">
            <CardHeader className="border-b bg-muted/30">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Eye className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">Alert Details</CardTitle>
                      <CardDescription className="text-xs">
                        {date
                          ? date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
                          : "Please select a date"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="gap-1.5 text-xs">
                    <Bell className="h-3 w-3" />
                    {filteredAlerts.length}
                  </Badge>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 gap-3">
                  <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All cameras" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cameras</SelectItem>
                      {cameras.map((cam) => (
                        <SelectItem key={cam.id} value={cam.id}>{cam.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search alerts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 text-xs pl-8"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mx-auto mb-3">
                    <Bell className="h-6 w-6 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">No alerts found</p>
                  <p className="text-xs mt-1">Try selecting a different date or adjusting filters</p>
                </div>
              ) : (
                <div className="divide-y max-h-[420px] overflow-y-auto">
                  {filteredAlerts
                    .sort((a, b) => b.ts - a.ts)
                    .map((alert) => {
                      const alertTime = new Date(alert.ts);
                      return (
                        <div
                          key={alert.id}
                          className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium truncate">{alert.cameraName}</span>
                              <Badge variant={getSeverityColor(alert.label)} className="text-[10px]">
                                {alert.label}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="font-mono">{alertTime.toLocaleTimeString("en-GB", { hour12: false })}</span>
                              <span>Confidence: {(alert.score * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
