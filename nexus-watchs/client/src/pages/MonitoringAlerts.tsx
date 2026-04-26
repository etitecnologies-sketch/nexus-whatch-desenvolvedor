import { MonitoringLayout } from "@/components/MonitoringLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { monitoringApi, type MonitoringAlert } from "@/lib/monitoringApi";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function severityBadge(a: MonitoringAlert) {
  const type = a.alert_type || "threshold";
  const cls =
    type === "offline"
      ? "border-destructive/30 text-destructive"
      : a.value >= a.threshold * 1.5
        ? "border-destructive/30 text-destructive"
        : a.value >= a.threshold * 1.2
          ? "border-amber-500/30 text-amber-500"
          : "border-yellow-500/30 text-yellow-500";
  const label = type === "offline" ? "OFFLINE" : "THRESHOLD";
  return (
    <Badge variant="outline" className={cn(cls)}>
      {label}
    </Badge>
  );
}

export default function MonitoringAlerts() {
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await monitoringApi.alerts();
      setAlerts(r);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar alertas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <MonitoringLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Alertas</h1>
            <p className="text-sm text-muted-foreground">Últimos eventos disparados por triggers e offline.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading ? "animate-spin" : "")} />
            Atualizar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Métrica</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Limite</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{severityBadge(a)}</TableCell>
                    <TableCell className="font-medium">{a.device_name || a.host}</TableCell>
                    <TableCell>{a.trigger_name || "—"}</TableCell>
                    <TableCell>{a.expression}</TableCell>
                    <TableCell>{Number(a.value).toFixed(1)}</TableCell>
                    <TableCell>{Number(a.threshold).toFixed(1)}</TableCell>
                    <TableCell>{a.client_name || "—"}</TableCell>
                    <TableCell>{a.fired_at ? new Date(a.fired_at).toLocaleString() : "—"}</TableCell>
                  </TableRow>
                ))}
                {alerts.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-sm text-muted-foreground">
                      Nenhum alerta.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MonitoringLayout>
  );
}

