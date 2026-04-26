import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Trash2,
  Filter,
  Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Notifications() {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<"all" | "unread">("all");

  const { data: notifications = [] } = trpc.notifications.list.useQuery(
    undefined,
    {
      enabled: !!user,
    }
  );

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation();

  const handleMarkAsRead = async (notificationId: number) => {
    await markAsReadMutation.mutateAsync({ id: notificationId });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const displayNotifications =
    filterType === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "motion_detection":
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case "alarm":
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case "device_offline":
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      case "system_alert":
        return <Bell className="w-5 h-5 text-blue-400" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getNotificationBadgeClass = (type: string) => {
    switch (type) {
      case "motion_detection":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "alarm":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "device_offline":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "system_alert":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "motion_detection":
        return "Detecção de Movimento";
      case "alarm":
        return "Alarme";
      case "device_offline":
        return "Dispositivo Offline";
      case "system_alert":
        return "Alerta do Sistema";
      default:
        return "Notificação";
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Agora";
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-6 bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-accent" />
            Notificações e Alarmes
          </h1>
          {unreadCount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground">
              {unreadCount} não lido{unreadCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Filter Tabs */}
        <Tabs value={filterType} onValueChange={(v: any) => setFilterType(v)}>
          <TabsList className="bg-muted border-border">
            <TabsTrigger value="all">
              Todas ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Não Lidas ({unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Notifications List */}
      {displayNotifications.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-2">
              {filterType === "unread"
                ? "Nenhuma notificação não lida"
                : "Nenhuma notificação"}
            </p>
            <p className="text-sm text-muted-foreground/70">
              Você está sempre atualizado!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`bg-card border transition-colors ${
                notification.isRead
                  ? "border-border opacity-75"
                  : "border-accent/50 bg-card/80"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>

                    {notification.message && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getNotificationBadgeClass(notification.type)}>
                        {getNotificationTypeLabel(notification.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notification.isRead && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="h-8"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-destructive hover:text-destructive"
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

      {/* Clear All Button */}
      {displayNotifications.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" className="text-muted-foreground">
            Limpar Todas as Notificações
          </Button>
        </div>
      )}
    </div>
  );
}
