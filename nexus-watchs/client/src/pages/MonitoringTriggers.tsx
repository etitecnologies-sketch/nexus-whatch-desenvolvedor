import { MonitoringLayout } from "@/components/MonitoringLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { monitoringApi, type MonitoringTrigger } from "@/lib/monitoringApi";
import { cn } from "@/lib/utils";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const expressions = [
  { value: "cpu", label: "CPU (%)" },
  { value: "memory", label: "Memória (%)" },
  { value: "disk_percent", label: "Disco (%)" },
  { value: "latency_ms", label: "Latência (ms)" },
  { value: "load_avg", label: "Load avg" },
  { value: "temperature", label: "Temperatura (°C)" },
] as const;

type TriggerForm = {
  name: string;
  expression: string;
  threshold: string;
  enabled: boolean;
  device_type: string;
  tags: string;
};

const empty = (): TriggerForm => ({
  name: "",
  expression: "cpu",
  threshold: "80",
  enabled: true,
  device_type: "",
  tags: "",
});

export default function MonitoringTriggers() {
  const [triggers, setTriggers] = useState<MonitoringTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MonitoringTrigger | null>(null);
  const [form, setForm] = useState<TriggerForm>(empty());
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await monitoringApi.triggers();
      setTriggers(r);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar triggers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  };

  const openEdit = (t: MonitoringTrigger) => {
    setEditing(t);
    setForm({
      name: t.name,
      expression: t.expression,
      threshold: String(t.threshold),
      enabled: Boolean(t.enabled),
      device_type: t.device_type || "",
      tags: (t.tags || []).join(", "),
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        expression: form.expression,
        threshold: Number.parseFloat(form.threshold),
        enabled: form.enabled,
        device_type: form.device_type || null,
        tags: form.tags
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      };
      if (editing) {
        await monitoringApi.updateTrigger(editing.id, payload);
        toast.success("Trigger atualizado");
      } else {
        await monitoringApi.createTrigger(payload as any);
        toast.success("Trigger criado");
      }
      setOpen(false);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Remover trigger?")) return;
    try {
      await monitoringApi.deleteTrigger(id);
      toast.success("Removido");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao remover");
    }
  };

  return (
    <MonitoringLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Triggers</h1>
            <p className="text-sm text-muted-foreground">Regras de alerta por métrica.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading ? "animate-spin" : "")} />
              Atualizar
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editing ? "Editar trigger" : "Novo trigger"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Métrica</Label>
                      <Select value={form.expression} onValueChange={(v) => setForm((f) => ({ ...f, expression: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {expressions.map((x) => (
                            <SelectItem key={x.value} value={x.value}>
                              {x.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Threshold</Label>
                      <Input value={form.threshold} onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Filtro por tipo (opcional)</Label>
                    <Input value={form.device_type} onChange={(e) => setForm((f) => ({ ...f, device_type: e.target.value }))} placeholder="server, router..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Tags (opcional, vírgula)</Label>
                    <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => void save()} disabled={saving || !form.name}>
                      {saving ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Métrica</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {triggers.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => openEdit(t)}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.expression}</TableCell>
                    <TableCell>{Number(t.threshold).toFixed(1)}</TableCell>
                    <TableCell>{t.enabled ? "Sim" : "Não"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button variant="destructive" size="sm" onClick={() => void remove(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {triggers.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      Nenhum trigger.
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

