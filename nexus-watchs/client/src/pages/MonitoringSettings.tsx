import { MonitoringLayout } from "@/components/MonitoringLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { monitoringApi } from "@/lib/monitoringApi";
import { useEffect, useState } from "react";

export default function MonitoringSettings() {
  const [me, setMe] = useState<{ role: string; client_id: number | null; supabase_id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await monitoringApi.me();
      setMe({ role: r.role, client_id: r.client_id, supabase_id: r.supabase_id });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <MonitoringLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Config</h1>
          <p className="text-sm text-muted-foreground">Sessão do monitoring usa o mesmo login do Nexus Watch (cookie).</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Supabase ID:</span> {loading ? "—" : me?.supabase_id || "—"}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Role:</span> {loading ? "—" : me?.role || "—"}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Client:</span> {loading ? "—" : me?.client_id ?? "—"}
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                Recarregar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MonitoringLayout>
  );
}
