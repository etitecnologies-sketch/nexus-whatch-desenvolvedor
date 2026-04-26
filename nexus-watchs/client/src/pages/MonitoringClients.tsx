import { MonitoringLayout } from "@/components/MonitoringLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { monitoringApi, type MonitoringClient } from "@/lib/monitoringApi";
import { cn } from "@/lib/utils";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type ClientForm = {
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  plan: string;
  status: string;
  telegram_token: string;
  telegram_chat_id: string;
  alert_email: string;
  notes: string;
};

const empty = (): ClientForm => ({
  name: "",
  document: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  plan: "basic",
  status: "active",
  telegram_token: "",
  telegram_chat_id: "",
  alert_email: "",
  notes: "",
});

function fromClient(c: MonitoringClient): ClientForm {
  return {
    name: c.name || "",
    document: c.document || "",
    email: c.email || "",
    phone: c.phone || "",
    address: c.address || "",
    city: c.city || "",
    state: c.state || "",
    plan: c.plan || "basic",
    status: c.status || "active",
    telegram_token: c.telegram_token || "",
    telegram_chat_id: c.telegram_chat_id || "",
    alert_email: c.alert_email || "",
    notes: c.notes || "",
  };
}

export default function MonitoringClients() {
  const [clients, setClients] = useState<MonitoringClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MonitoringClient | null>(null);
  const [form, setForm] = useState<ClientForm>(empty());
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await monitoringApi.clients();
      setClients(r);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar clientes");
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

  const openEdit = (c: MonitoringClient) => {
    setEditing(c);
    setForm(fromClient(c));
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await monitoringApi.updateClient(editing.id, form);
        toast.success("Cliente atualizado");
      } else {
        await monitoringApi.createClient(form);
        toast.success("Cliente criado");
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
    if (!confirm("Remover cliente?")) return;
    try {
      await monitoringApi.deleteClient(id);
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
            <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
            <p className="text-sm text-muted-foreground">Multi-tenant do monitoring.</p>
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
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Documento</Label>
                    <Input value={form.document} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Endereço</Label>
                    <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Plano</Label>
                    <Select value={form.plan} onValueChange={(v) => setForm((f) => ({ ...f, plan: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">basic</SelectItem>
                        <SelectItem value="pro">pro</SelectItem>
                        <SelectItem value="enterprise">enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">active</SelectItem>
                        <SelectItem value="suspended">suspended</SelectItem>
                        <SelectItem value="cancelled">cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Telegram token</Label>
                    <Input value={form.telegram_token} onChange={(e) => setForm((f) => ({ ...f, telegram_token: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telegram chat_id</Label>
                    <Input value={form.telegram_chat_id} onChange={(e) => setForm((f) => ({ ...f, telegram_chat_id: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>E-mail alertas</Label>
                    <Input value={form.alert_email} onChange={(e) => setForm((f) => ({ ...f, alert_email: e.target.value }))} />
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
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => openEdit(c)}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.plan}</TableCell>
                    <TableCell>{c.status}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="destructive" size="sm" onClick={() => void remove(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {clients.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      Nenhum cliente.
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
