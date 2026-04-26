import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  User,
  Bell,
  Wifi,
  Video,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [motionAlerts, setMotionAlerts] = useState(true);
  const [videoQuality, setVideoQuality] = useState("hd");
  const [networkType, setNetworkType] = useState("wifi");

  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    logout();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-8 h-8 text-accent" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas preferências e configurações do sistema
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-card border border-border">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Conta</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Vídeo</span>
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            <span className="hidden sm:inline">Rede</span>
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Informações da Conta</CardTitle>
              <CardDescription className="text-muted-foreground">
                Gerencie suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Nome</Label>
                <Input
                  value={user?.name || ""}
                  readOnly
                  className="bg-muted border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Email</Label>
                <Input
                  value={user?.email || ""}
                  readOnly
                  className="bg-muted border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">ID do Usuário</Label>
                <Input
                  value={user?.id || ""}
                  readOnly
                  className="bg-muted border-border text-foreground font-mono text-sm"
                />
              </div>

              <div className="pt-4 border-t border-border">
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Fazer Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Preferências de Notificações</CardTitle>
              <CardDescription className="text-muted-foreground">
                Controle como você recebe alertas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Ativar Notificações
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Receba alertas em tempo real
                  </p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>

              {/* Motion Detection Alerts */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Alertas de Movimento
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Notifique quando houver detecção de movimento
                  </p>
                </div>
                <Switch
                  checked={motionAlerts}
                  onCheckedChange={setMotionAlerts}
                  disabled={!notificationsEnabled}
                />
              </div>

              {/* Alarm Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Alertas de Alarme
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Notifique quando houver alarme acionado
                  </p>
                </div>
                <Switch disabled={!notificationsEnabled} defaultChecked />
              </div>

              {/* Device Offline Alerts */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Alertas de Dispositivo Offline
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Notifique quando um dispositivo ficar offline
                  </p>
                </div>
                <Switch disabled={!notificationsEnabled} defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video Tab */}
        <TabsContent value="video" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Configurações de Vídeo</CardTitle>
              <CardDescription className="text-muted-foreground">
                Ajuste a qualidade e preferências de vídeo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Default Video Quality */}
              <div className="space-y-2">
                <Label className="text-foreground">Qualidade Padrão</Label>
                <Select value={videoQuality} onValueChange={setVideoQuality}>
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="sd">SD (Padrão)</SelectItem>
                    <SelectItem value="hd">HD (Recomendado)</SelectItem>
                    <SelectItem value="fullhd">Full HD</SelectItem>
                    <SelectItem value="4k">4K</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Qualidade padrão para visualização ao vivo
                </p>
              </div>

              {/* Auto-play */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="font-medium text-foreground">
                    Reprodução Automática
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Iniciar vídeo automaticamente
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              {/* Full Screen */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Tela Cheia por Padrão
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Abrir em modo tela cheia
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Tab */}
        <TabsContent value="network" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Configurações de Rede</CardTitle>
              <CardDescription className="text-muted-foreground">
                Gerencie suas preferências de conectividade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Network Type */}
              <div className="space-y-2">
                <Label className="text-foreground">Tipo de Rede</Label>
                <Select value={networkType} onValueChange={setNetworkType}>
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="wifi">Wi-Fi</SelectItem>
                    <SelectItem value="mobile">Dados Móveis</SelectItem>
                    <SelectItem value="ethernet">Ethernet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data Saver */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="font-medium text-foreground">
                    Economizador de Dados
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Reduzir consumo de dados
                  </p>
                </div>
                <Switch />
              </div>

              {/* Auto-reconnect */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Reconectar Automaticamente
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Reconectar quando perder conexão
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              {/* Connection Info */}
              <div className="pt-4 border-t border-border space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Informações de Conexão
                </p>
                <div className="bg-muted rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="text-foreground font-mono">
                      {networkType.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-green-400 font-mono">Conectado</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
