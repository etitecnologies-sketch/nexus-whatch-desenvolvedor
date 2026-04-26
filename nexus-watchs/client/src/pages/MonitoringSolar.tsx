import { MonitoringLayout } from "@/components/MonitoringLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { monitoringApi, type MonitoringSolarInverter, type MonitoringSolarSummary } from "@/lib/monitoringApi";
import { cn } from "@/lib/utils";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type InverterForm = {
  name: string;
  brand: string;
  model: string;
  location: string;
  capacity_kwp: string;
  tariff_kwh: string;
  notes: string;
  api_url: string;
  api_key: string;
  api_type: string;
};

const empty = (): InverterForm => ({
  name: "",
  brand: "other",
  model: "",
  location: "",
  capacity_kwp: "0",
  tariff_kwh: "0.85",
  notes: "",
  api_url: "",
  api_key: "",
  api_type: "",
});

export default function MonitoringSolar() {
  const [summary, setSummary] = useState<MonitoringSolarSummary | null>(null);
  const [brands, setBrands] = useState<Array<{ value: string; label: string; icon: string; fields: string[] }>>([]);
  const [inverters, setInverters] = useState<MonitoringSolarInverter[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MonitoringSolarInverter | null>(null);
  const [form, setForm] = useState<InverterForm>(empty());
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [s, b, inv] = await Promise.all([
        monitoringApi.solarSummary().catch(() => null),
        monitoringApi.solarBrands().catch(() => []),
        monitoringApi.solarInverters().catch(() => []),
      ]);
      setSummary(s);
      setBrands(b as any);
      setInverters(inv);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar solar");
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

  const openEdit = (i: MonitoringSolarInverter) => {
    setEditing(i);
    setForm({
      name: i.name || "",
      brand: i.brand || "other",
      model: i.model || "",
      location: i.location || "",
      capacity_kwp: String(i.capacity_kwp ?? 0),
      tariff_kwh: String(i.tariff_kwh ?? 0.85),
      notes: i.notes || "",
      api_url: "",
      api_key: "",
      api_type: "",
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        brand: form.brand,
        model: form.model,
        location: form.location,
        capacity_kwp: Number.parseFloat(form.capacity_kwp) || 0,
        tariff_kwh: Number.parseFloat(form.tariff_kwh) || 0.85,
        notes: form.notes,
        api_url: form.api_url,
        api_key: form.api_key,
        api_type: form.api_type,
      };
      if (editing) {
        await monitoringApi.updateSolarInverter(editing.id, payload);
        toast.success("Inversor atualizado");
      } else {
        await monitoringApi.createSolarInverter(payload);
        toast.success("Inversor criado");
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
    if (!confirm("Remover inversor?")) return;
    try {
      await monitoringApi.deleteSolarInverter(id);
      toast.success("Removido");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao remover");
    }
  };

  const brandOptions = brands.length > 0 ? brands : [{ value: "other", label: "Outro", icon: "☀️", fields: [] }];
  const selectedBrand = brandOptions.find((b) => b.value === form.brand);

  return (
    <MonitoringLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Solar</h1>
            <p className="text-sm text-muted-foreground">Inversores e resumo do dia.</p>
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
                  <DialogTitle>{editing ? "Editar inversor" : "Novo inversor"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Marca</Label>
                    <Select value={form.brand} onValueChange={(v) => setForm((f) => ({ ...f, brand: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {brandOptions.map((b) => (
                          <SelectItem key={b.value} value={b.value}>
                            {b.icon} {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Local</Label>
                    <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacidade (kWp)</Label>
                    <Input value={form.capacity_kwp} onChange={(e) => setForm((f) => ({ ...f, capacity_kwp: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tarifa (R$/kWh)</Label>
                    <Input value={form.tariff_kwh} onChange={(e) => setForm((f) => ({ ...f, tariff_kwh: e.target.value }))} />
                  </div>
                  {selectedBrand?.fields?.includes("api_url") ? (
                    <div className="space-y-2 md:col-span-2">
                      <Label>API URL</Label>
                      <Input value={form.api_url} onChange={(e) => setForm((f) => ({ ...f, api_url: e.target.value }))} />
                    </div>
                  ) : null}
                  {selectedBrand?.fields?.includes("api_key") ? (
                    <div className="space-y-2 md:col-span-2">
                      <Label>API Key</Label>
                      <Input value={form.api_key} onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))} />
                    </div>
                  ) : null}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Notas</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => void save()} disabled={saving || !form.name || !form.brand}>
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inversores</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{summary?.total_inverters ?? "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Potência</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{summary ? `${(summary.total_power_w / 1000).toFixed(2)} kW` : "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Energia hoje</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{summary ? `${summary.energy_today_kwh.toFixed(2)} kWh` : "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita hoje</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-semibold">{summary ? `R$ ${summary.revenue_today.toFixed(2)}` : "—"}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inversores</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Potência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inverters.map((i) => (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => openEdit(i)}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell>{i.brand}</TableCell>
                    <TableCell>{i.location || "—"}</TableCell>
                    <TableCell>{i.last_power !== undefined && i.last_power !== null ? `${(Number(i.last_power) / 1000).toFixed(2)} kW` : "—"}</TableCell>
                    <TableCell>{i.last_status || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button variant="destructive" size="sm" onClick={() => void remove(i.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {inverters.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      Nenhum inversor.
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

