import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Edit2,
  Wifi,
  WifiOff,
  Server,
  QrCode,
  Link2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function DeviceManagement() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [connectionType, setConnectionType] = useState<"ip" | "ddns" | "p2p" | "qrcode">("ip");
  const [manufacturer, setManufacturer] = useState("generic");
  const [deviceName, setDeviceName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [ddnsAddress, setDdnsAddress] = useState("");
  const [p2pId, setP2pId] = useState("");
  const [port, setPort] = useState("554");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<number | null>(null);

  useEffect(() => {
    if (location === "/devices/add") {
      setIsDialogOpen(true);
    }
  }, [location]);

  const { data: devices = [], isLoading } = trpc.devices.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createDeviceMutation = trpc.devices.create.useMutation({
    onSuccess: () => {
      toast.success("Dispositivo adicionado com sucesso");
      utils.devices.list.invalidate();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar dispositivo: ${error.message}`);
    },
  });

  const updateDeviceMutation = trpc.devices.update.useMutation({
    onSuccess: () => {
      toast.success("Dispositivo atualizado com sucesso");
      utils.devices.list.invalidate();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar dispositivo: ${error.message}`);
    },
  });

  const deleteDeviceMutation = trpc.devices.delete.useMutation({
    onSuccess: () => {
      toast.success("Dispositivo removido com sucesso");
      utils.devices.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao remover dispositivo: ${error.message}`);
    },
  });

  const checkStatusMutation = trpc.devices.checkStatus.useMutation({
    onSuccess: (data) => {
      if (data.status === "online") {
        toast.success(`Dispositivo online (${data.latency}ms)`);
      } else {
        toast.error("Dispositivo offline ou inacessível");
      }
      utils.devices.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao verificar status: ${error.message}`);
    },
  });

  const resetForm = () => {
    setDeviceName("");
    setManufacturer("generic");
    setIpAddress("");
    setDdnsAddress("");
    setP2pId("");
    setPort("554");
    setUsername("");
    setPassword("");
    setConnectionType("ip");
    setEditingDeviceId(null);
  };

  const handleEditClick = (device: any) => {
    setDeviceName(device.name);
    setManufacturer(device.manufacturer || "generic");
    setConnectionType(device.connectionType);
    setIpAddress(device.ipAddress || "");
    setDdnsAddress(device.ddnsAddress || "");
    setP2pId(device.p2pId || "");
    setPort(device.port?.toString() || "554");
    setUsername(device.username);
    setPassword(device.password);
    setEditingDeviceId(device.id);
    setIsDialogOpen(true);
  };

  const handleSaveDevice = async () => {
    if (!deviceName.trim() || !username.trim() || !password.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    if (connectionType === "ip" && !ipAddress.trim()) {
      toast.error("Endereço IP é obrigatório para conexão IP");
      return;
    }

    if (connectionType === "ddns" && !ddnsAddress.trim()) {
      toast.error("Endereço DDNS é obrigatório para conexão DDNS");
      return;
    }

    const deviceData = {
      name: deviceName,
      type: "dvr" as const,
      manufacturer,
      connectionType,
      ipAddress: connectionType === "ip" ? ipAddress : undefined,
      ddnsAddress: connectionType === "ddns" ? ddnsAddress : undefined,
      p2pId: connectionType === "p2p" ? p2pId : undefined,
      username,
      password,
      port: parseInt(port) || 554,
    };

    try {
      if (editingDeviceId) {
        await updateDeviceMutation.mutateAsync({
          id: editingDeviceId,
          ...deviceData,
        });
      } else {
        await createDeviceMutation.mutateAsync(deviceData);
      }
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleDeleteDevice = async (id: number) => {
    if (confirm("Tem certeza que deseja remover este dispositivo?")) {
      try {
        await deleteDeviceMutation.mutateAsync({ id });
      } catch (error) {
        // Error handled in mutation
      }
    }
  };

  const AddDeviceForm = () => (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Fabricante</Label>
          <Select value={manufacturer} onValueChange={setManufacturer}>
            <SelectTrigger className="bg-input border-border text-foreground">
              <SelectValue placeholder="Selecione o fabricante" />
            </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="intelbras">Intelbras</SelectItem>
                <SelectItem value="lampttek">Lampttek</SelectItem>
                <SelectItem value="tecsat">Tecsat</SelectItem>
                <SelectItem value="ppa">PPA</SelectItem>
                <SelectItem value="tudo-forte">Tudo Forte</SelectItem>
                <SelectItem value="hikvision">Hikvision</SelectItem>
                <SelectItem value="dahua">Dahua</SelectItem>
                <SelectItem value="uniview">Uniview</SelectItem>
                <SelectItem value="axis">Axis</SelectItem>
                <SelectItem value="bosch">Bosch</SelectItem>
                <SelectItem value="hanwha">Hanwha (Samsung)</SelectItem>
                <SelectItem value="tiandy">Tiandy</SelectItem>
                <SelectItem value="ez-ipc">EZ-IPC</SelectItem>
                <SelectItem value="geovision">Geovision</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
                <SelectItem value="generic">Genérico (RTSP/ONVIF)</SelectItem>
              </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Nome</Label>
          <Input
            placeholder="Ex: DVR Loja"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            className="bg-input border-border text-foreground"
          />
        </div>
      </div>

      <Tabs value={connectionType} onValueChange={(v: any) => setConnectionType(v)}>
        <TabsList className="grid w-full grid-cols-4 bg-muted border-border">
          <TabsTrigger value="ip" className="text-xs">
            <Link2 className="w-3 h-3 mr-1" /> IP
          </TabsTrigger>
          <TabsTrigger value="ddns" className="text-xs">
            DDNS
          </TabsTrigger>
          <TabsTrigger value="p2p" className="text-xs">
            P2P
          </TabsTrigger>
          <TabsTrigger value="qrcode" className="text-xs">
            <QrCode className="w-3 h-3" />
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {connectionType === "ip" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Endereço IP</Label>
                <Input
                  placeholder="192.168.1.100"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="bg-input border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Porta</Label>
                <Input
                  type="number"
                  placeholder="8000"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="bg-input border-border text-foreground"
                />
              </div>
            </div>
          )}

          {connectionType === "ddns" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Endereço DDNS</Label>
                <Input
                  placeholder="seu-dominio.intelbras.com.br"
                  value={ddnsAddress}
                  onChange={(e) => setDdnsAddress(e.target.value)}
                  className="bg-input border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Porta</Label>
                <Input
                  type="number"
                  placeholder="8000"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="bg-input border-border text-foreground"
                />
              </div>
            </div>
          )}

          {connectionType === "p2p" && (
            <div className="space-y-2">
              <Label className="text-foreground">ID P2P / Serial</Label>
              <Input
                placeholder="Ex: ABC123456789"
                value={p2pId}
                onChange={(e) => setP2pId(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>
          )}

          {connectionType === "qrcode" && (
            <div className="space-y-2">
              <Label className="text-foreground">Escanear QR Code</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Aponte a câmera para o QR Code do dispositivo
                </p>
              </div>
            </div>
          )}
        </div>
      </Tabs>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Usuário</Label>
          <Input
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-input border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Senha</Label>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-input border-border text-foreground"
          />
        </div>
      </div>

      <Button
        onClick={handleSaveDevice}
        disabled={createDeviceMutation.isPending || updateDeviceMutation.isPending}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        {createDeviceMutation.isPending || updateDeviceMutation.isPending 
          ? "Salvando..." 
          : editingDeviceId 
            ? "Salvar Alterações" 
            : "Adicionar Dispositivo"}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-6 bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Server className="w-6 h-6 text-accent" />
            Gerenciamento de Dispositivos
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Dispositivo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {editingDeviceId ? "Editar Dispositivo" : "Adicionar Novo Dispositivo"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {editingDeviceId 
                    ? "Altere as configurações do dispositivo" 
                    : "Configure um DVR, NVR ou câmera IP"}
                </DialogDescription>
              </DialogHeader>
              <AddDeviceForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Devices List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Badge variant="outline" className="animate-pulse">Carregando dispositivos...</Badge>
        </div>
      ) : devices.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">Nenhum dispositivo adicionado</p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
              Adicionar Primeiro Dispositivo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <Card
              key={device.id}
              className="bg-card border-border hover:border-accent/50 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                      <Server className="w-6 h-6" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {device.name}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {device.connectionType === 'ip' ? device.ipAddress : 
                           device.connectionType === 'ddns' ? device.ddnsAddress : 
                           'P2P'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {device.type.toUpperCase()}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            device.status === "online"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }
                        >
                          {device.status === "online" ? (
                            <>
                              <Wifi className="w-3 h-3 mr-1" />
                              Online
                            </>
                          ) : (
                            <>
                              <WifiOff className="w-3 h-3 mr-1" />
                              Offline
                            </>
                          )}
                        </Badge>
                        {device.latency && (
                          <span className="text-xs text-muted-foreground">
                            {device.latency}ms
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-2"
                        onClick={() => checkStatusMutation.mutate({ id: device.id })}
                        disabled={checkStatusMutation.isPending}
                      >
                        <RefreshCw className={`w-4 h-4 ${checkStatusMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                      {device.manufacturer === 'intelbras' && device.p2pId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-2 bg-accent/10 text-accent hover:bg-accent/20 border-accent/20"
                          onClick={() => window.open("https://remotizze.intelbras.com.br", "_blank")}
                          title="Acesso P2P Cloud"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-2"
                        onClick={() => handleEditClick(device)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="px-2 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteDevice(device.id)}
                      disabled={deleteDeviceMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
