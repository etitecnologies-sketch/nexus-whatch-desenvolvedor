import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Camera, 
  Wifi, 
  AlertCircle, 
  Activity, 
  Plus, 
  Settings,
  Bell,
  Grid3x3,
  List
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  
  // Fetch devices
  const { data: devices = [] } = trpc.devices.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Fetch notifications
  const { data: notifications = [] } = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Fetch favorites
  const { data: favorites = [] } = trpc.favorites.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Activity className="w-8 h-8 text-accent" />
          </div>
          <p className="text-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <Camera className="w-16 h-16 text-accent mx-auto" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Nexus Watch</h1>
          <p className="text-muted-foreground mb-8">
            Sistema profissional de monitoramento de câmeras de segurança
          </p>
          <Button 
            size="lg" 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => {
              navigate("/login");
            }}
          >
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  const onlineDevices = devices.filter(d => d.status === "online").length;
  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Camera className="w-8 h-8 text-accent" />
                Nexus Watch
              </h1>
              <p className="text-muted-foreground mt-1">Bem-vindo, {user?.name}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => navigate("/notifications")}
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground">
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => navigate("/settings")}
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dispositivos Online
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-accent">
                  {onlineDevices}/{devices.length}
                </div>
                <Wifi className="w-8 h-8 text-accent/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Câmeras Totais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-accent">
                  {devices.length}
                </div>
                <Camera className="w-8 h-8 text-accent/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Alertas Não Lidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-destructive">
                  {unreadNotifications}
                </div>
                <AlertCircle className="w-8 h-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="devices" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="devices" className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4" />
              Dispositivos
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Favoritos
            </TabsTrigger>
          </TabsList>

          {/* Devices Tab */}
          <TabsContent value="devices" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-foreground">
                Seus Dispositivos
              </h2>
              <Button 
                size="sm" 
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => navigate("/devices/add")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Dispositivo
              </Button>
            </div>

            {devices.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">Nenhum dispositivo adicionado</p>
                  <Button 
                    variant="outline"
                    onClick={() => navigate("/devices/add")}
                  >
                    Adicionar Primeiro Dispositivo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devices.map((device) => (
                  <Card 
                    key={device.id} 
                    className="bg-card border-border hover:border-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/devices/${device.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-foreground">
                            {device.name}
                          </CardTitle>
                          <CardDescription className="text-muted-foreground">
                            {device.type.toUpperCase()}
                          </CardDescription>
                        </div>
                        <Badge 
                          className={device.status === "online" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}
                        >
                          {device.status === "online" ? "Online" : "Offline"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Latência:</span>
                        <span className="text-foreground font-mono">
                          {device.latency ? `${device.latency}ms` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tipo de Conexão:</span>
                        <span className="text-accent font-mono text-xs">
                          {device.connectionType.toUpperCase()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-foreground">
                Grupos de Favoritos
              </h2>
              <Button 
                size="sm" 
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => navigate("/favorites/add")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Grupo
              </Button>
            </div>

            {favorites.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <List className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">Nenhum grupo de favoritos</p>
                  <Button 
                    variant="outline"
                    onClick={() => navigate("/favorites/add")}
                  >
                    Criar Grupo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {favorites.map((favorite) => (
                  <Card 
                    key={favorite.id} 
                    className="bg-card border-border hover:border-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/favorites/${favorite.id}`)}
                  >
                    <CardHeader>
                      <CardTitle className="text-foreground">
                        {favorite.name}
                      </CardTitle>
                      {favorite.description && (
                        <CardDescription className="text-muted-foreground">
                          {favorite.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
