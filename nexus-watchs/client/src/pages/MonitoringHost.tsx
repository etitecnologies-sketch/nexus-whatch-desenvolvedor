import { MonitoringLayout } from "@/components/MonitoringLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { monitoringApi, type MonitoringMetricRow } from "@/lib/monitoringApi";
import { createMonitoringSocket, type MonitoringSocketMetric } from "@/lib/monitoringSocket";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";

type ChartPoint = {
  time: string;
  cpu: number;
  memory: number;
  disk_percent: number;
  latency_ms: number;
};

function toPoint(r: { time: string; cpu: number; memory: number; disk_percent: number; latency_ms: number }): ChartPoint {
  return {
    time: new Date(r.time).toLocaleTimeString(),
    cpu: Number(r.cpu || 0),
    memory: Number(r.memory || 0),
    disk_percent: Number(r.disk_percent || 0),
    latency_ms: Number(r.latency_ms || 0),
  };
}

export default function MonitoringHost() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/monitoring/host/:host");
  const host = match ? decodeURIComponent(params!.host) : "";
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const socketRef = useRef<ReturnType<typeof createMonitoringSocket> | null>(null);

  const latest = history.length > 0 ? history[history.length - 1] : null;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    monitoringApi
      .metricsByHost(host, hours)
      .then((rows: MonitoringMetricRow[]) => {
        if (!mounted) return;
        const normalized = rows
          .slice()
          .reverse()
          .map((r) => toPoint(r));
        setHistory(normalized);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [host, hours]);

  useEffect(() => {
    const socket = createMonitoringSocket();
    socketRef.current = socket;

    const onMetric = (m: MonitoringSocketMetric) => {
      if (m.host !== host) return;
      setHistory((prev) => {
        const next = [...prev, toPoint(m)].slice(-800);
        return next;
      });
    };

    socket.on("metric", onMetric);
    socket.emit("subscribe", host);

    return () => {
      socket.off("metric", onMetric);
      socket.emit("unsubscribe", host);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [host]);

  const chartData = useMemo(() => history, [history]);

  return (
    <MonitoringLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{host}</h1>
            <p className="text-sm text-muted-foreground">Histórico e tempo real.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation("/monitoring")}>
              Voltar
            </Button>
            <Button variant={hours === 1 ? "default" : "outline"} size="sm" onClick={() => setHours(1)}>
              1h
            </Button>
            <Button variant={hours === 24 ? "default" : "outline"} size="sm" onClick={() => setHours(24)}>
              24h
            </Button>
            <Button variant={hours === 168 ? "default" : "outline"} size="sm" onClick={() => setHours(168)}>
              7d
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">CPU</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{latest ? `${latest.cpu.toFixed(1)}%` : "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Memória</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{latest ? `${latest.memory.toFixed(1)}%` : "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Disco</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{latest ? `${latest.disk_percent.toFixed(1)}%` : "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Latência</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{latest ? `${latest.latency_ms.toFixed(0)}ms` : "—"}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Métricas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : chartData.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem dados.</div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="cpuFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="memFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="diskFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="cpu" stroke="#6366f1" fill="url(#cpuFill)" dot={false} name="CPU" />
                    <Area type="monotone" dataKey="memory" stroke="#f59e0b" fill="url(#memFill)" dot={false} name="Memória" />
                    <Area type="monotone" dataKey="disk_percent" stroke="#10b981" fill="url(#diskFill)" dot={false} name="Disco" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MonitoringLayout>
  );
}

