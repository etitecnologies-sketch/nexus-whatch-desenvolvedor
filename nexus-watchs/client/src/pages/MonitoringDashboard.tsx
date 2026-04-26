import { MonitoringLayout } from "@/components/MonitoringLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { monitoringApi, type MonitoringDevice, type MonitoringHost, type MonitoringStats } from "@/lib/monitoringApi";
import { createMonitoringSocket, type MonitoringSocketMetric } from "@/lib/monitoringSocket";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

type HostState = {
  latest: MonitoringSocketMetric | null;
  history: MonitoringSocketMetric[];
};

const isOnline = (time: string | null | undefined) => {
  if (!time) return false;
  return Date.now() - new Date(time).getTime() < 30_000;
};

function MetricBadge({ label, value, warn, crit, unit }: { label: string; value: number; warn: number; crit: number; unit?: string }) {
  const color =
    value >= crit ? "bg-destructive/15 text-destructive border-destructive/30" : value >= warn ? "bg-amber-500/15 text-amber-500 border-amber-500/30" : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
  return (
    <Badge variant="outline" className={cn("font-normal", color)}>
      {label}: {Number.isFinite(value) ? value : 0}
      {unit || ""}
    </Badge>
  );
}

export default function MonitoringDashboard() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [hosts, setHosts] = useState<MonitoringHost[]>([]);
  const [devices, setDevices] = useState<MonitoringDevice[]>([]);
  const [hostState, setHostState] = useState<Record<string, HostState>>({});
  const socketRef = useRef<ReturnType<typeof createMonitoringSocket> | null>(null);

  const deviceById = useMemo(() => {
    const m = new Map<number, MonitoringDevice>();
    for (const d of devices) m.set(d.id, d);
    return m;
  }, [devices]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      monitoringApi.stats().then((r) => (mounted ? setStats(r) : null)).catch(() => null),
      monitoringApi.hosts().then((r) => (mounted ? setHosts(r) : null)).catch(() => null),
      monitoringApi.devices().then((r) => (mounted ? setDevices(r) : null)).catch(() => null),
    ]);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const socket = createMonitoringSocket();
    socketRef.current = socket;

    const onMetric = (m: MonitoringSocketMetric) => {
      setHostState((prev) => {
        const current = prev[m.host] || { latest: null, history: [] };
        const nextHistory = [...current.history, m].slice(-60);
        return { ...prev, [m.host]: { latest: m, history: nextHistory } };
      });
    };

    socket.on("metric", onMetric);
    socket.on("metric:all", onMetric);

    return () => {
      socket.off("metric", onMetric);
      socket.off("metric:all", onMetric);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    for (const h of hosts) {
      socket.emit("subscribe", h.name);
    }
    return () => {
      for (const h of hosts) {
        socket.emit("unsubscribe", h.name);
      }
    };
  }, [hosts]);

  const mergedHosts = useMemo(() => {
    const names = new Set(hosts.map((h) => h.name));
    for (const name of Object.keys(hostState)) names.add(name);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [hosts, hostState]);

  return (
    <MonitoringLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Métricas em tempo real, status e alertas.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Dispositivos</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{stats?.devices ?? "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Online</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{stats?.online ?? "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Offline</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{stats?.offline ?? "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clientes</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{stats?.clients ?? "—"}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mergedHosts.map((host) => {
            const state = hostState[host];
            const latest = state?.latest ?? null;
            const online = isOnline(latest?.time);
            const device = latest?.device_id ? deviceById.get(latest.device_id) : null;
            const title = device?.name || host;
            const subtitle = device?.location || host;
            return (
              <Card key={host} className={cn(online ? "border-emerald-500/30" : "")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{title}</CardTitle>
                      <div className="text-xs text-muted-foreground truncate mt-1">{subtitle}</div>
                    </div>
                    <Badge variant="outline" className={cn(online ? "border-emerald-500/30 text-emerald-500" : "border-destructive/30 text-destructive")}>
                      {online ? "Online" : "Offline"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <MetricBadge label="CPU" value={Number(latest?.cpu ?? 0)} warn={60} crit={80} unit="%" />
                    <MetricBadge label="Mem" value={Number(latest?.memory ?? 0)} warn={70} crit={85} unit="%" />
                    <MetricBadge label="Disco" value={Number(latest?.disk_percent ?? 0)} warn={70} crit={90} unit="%" />
                    <MetricBadge label="Lat" value={Number(latest?.latency_ms ?? 0)} warn={200} crit={500} unit="ms" />
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{latest?.time ? new Date(latest.time).toLocaleString() : "Aguardando dados..."}</span>
                    <button
                      className="text-primary hover:underline"
                      onClick={() => setLocation(`/monitoring/host/${encodeURIComponent(host)}`)}
                    >
                      Ver detalhes
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MonitoringLayout>
  );
}
