import { MonitoringLayout } from "@/components/MonitoringLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { monitoringApi, type MonitoringDevice } from "@/lib/monitoringApi";
import { cn } from "@/lib/utils";
import { KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type DeviceForm = {
  name: string;
  description: string;
  location: string;
  device_type: string;
  ip_address: string;
  tags: string;
  snmp_community: string;
  snmp_version: string;
  ssh_user: string;
  ssh_port: string;
  monitor_ping: boolean;
  monitor_snmp: boolean;
  monitor_agent: boolean;
  notes: string;
};

const emptyForm = (): DeviceForm => ({
  name: "",
  description: "",
  location: "",
  device_type: "other",
  ip_address: "",
  tags: "",
  snmp_community: "public",
  snmp_version: "2c",
  ssh_user: "",
  ssh_port: "22",
  monitor_ping: true,
  monitor_snmp: false,
  monitor_agent: true,
  notes: "",
});

function toTags(value: string) {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function fromDevice(d: MonitoringDevice): DeviceForm {
  return {
    name: d.name || "",
    description: d.description || "",
    location: d.location || "",
    device_type: d.device_type || "other",
    ip_address: d.ip_address || "",
    tags: (d.tags || []).join(", "),
    snmp_community: d.snmp_community || "public",
    snmp_version: d.snmp_version || "2c",
    ssh_user: d.ssh_user || "",
    ssh_port: String(d.ssh_port || 22),
    monitor_ping: Boolean(d.monitor_ping),
    monitor_snmp: Boolean(d.monitor_snmp),
    monitor_agent: Boolean(d.monitor_agent),
    notes: d.notes || "",
  };
}

export default function MonitoringDevices() {
  const [devices, setDevices] = useState<MonitoringDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState<Array<{ value: string; label: string; icon: string }>>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MonitoringDevice | null>(null);
  const [form, setForm] = useState<DeviceForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const deviceTypeLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of types) m.set(t.value, `${t.icon} ${t.label}`);
    return m;
  }, [types]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [d, t] = await Promise.all([monitoringApi.devices(), monitoringApi.deviceTypes().catch(() => [])]);
      setDevices(d);
      setTypes(t);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (d: MonitoringDevice) => {
    setEditing(d);
    setForm(fromDevice(d));
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        location: form.location,
        device_type: form.device_type,
        ip_address: form.ip_address || null,
        tags: toTags(form.tags),
        snmp_community: form.snmp_community,
        snmp_version: form.snmp_version,
        ssh_user: form.ssh_user || null,
        ssh_port: Number.parseInt(form.ssh_port || "22", 10) || 22,
        monitor_ping: form.monitor_ping,
        monitor_snmp: form.monitor_snmp,
        monitor_agent: form.monitor_agent,
        notes: form.notes,
      };
      if (editing) {
        await monitoringApi.updateDevice(editing.id, payload);
        toast.success("Dispositivo atualizado");
      } else {
        await monitoringApi.createDevice(payload);
        toast.success("Dispositivo criado");
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
    if (!confirm("Remover dispositivo?")) return;
    try {
      await monitoringApi.deleteDevice(id);
      toast.success("Removido");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao remover");
    }
  };

  const regenToken = async (id: number) => {
    if (!confirm("Gerar novo token do agente?")) return;
    try {
      const r = await monitoringApi.regenerateDeviceToken(id);
      await navigator.clipboard.writeText(r.token);
      toast.success("Token gerado e copiado");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar token");
    }
  };

  return (
    <MonitoringLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dispositivos</h1>
            <p className="text-sm text-muted-foreground">Cadastro e tokens de agentes.</p>
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
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editing ? "Editar dispositivo" : "Novo dispositivo"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.device_type} onValueChange={(v) => setForm((f) => ({ ...f, device_type: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {types.length > 0 ? (
                          types.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.icon} {t.label}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="other">Outro</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>IP</Label>
                    <Input value={form.ip_address} onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))} placeholder="192.168.0.10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Local</Label>
                    <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Descrição</Label>
                    <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Tags (separadas por vírgula)</Label>
                    <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="loja, rede, mikrotik" />
                  </div>
                  <div className="space-y-2">
                    <Label>SNMP community</Label>
                    <Input value={form.snmp_community} onChange={(e) => setForm((f) => ({ ...f, snmp_community: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>SNMP version</Label>
                    <Select value={form.snmp_version} onValueChange={(v) => setForm((f) => ({ ...f, snmp_version: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2c">2c</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>SSH user</Label>
                    <Input value={form.ssh_user} onChange={(e) => setForm((f) => ({ ...f, ssh_user: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>SSH port</Label>
                    <Input value={form.ssh_port} onChange={(e) => setForm((f) => ({ ...f, ssh_port: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Notas</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => void save()} disabled={saving || !form.name}>
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => openEdit(d)}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{deviceTypeLabel.get(d.device_type) || d.device_type}</TableCell>
                    <TableCell>{d.status}</TableCell>
                    <TableCell>{d.last_seen ? new Date(d.last_seen).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" onClick={() => void regenToken(d.id)}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => void remove(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {devices.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      Nenhum dispositivo.
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

