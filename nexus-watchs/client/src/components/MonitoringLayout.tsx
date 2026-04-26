import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { Activity, AlertTriangle, Cpu, LogOut, PlugZap, Settings2, Sun, Users } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useLocation } from "wouter";

const navItems = [
  { href: "/monitoring", label: "Dashboard", icon: Activity },
  { href: "/monitoring/devices", label: "Dispositivos", icon: Cpu },
  { href: "/monitoring/alerts", label: "Alertas", icon: AlertTriangle },
  { href: "/monitoring/triggers", label: "Triggers", icon: PlugZap },
  { href: "/monitoring/solar", label: "Solar", icon: Sun },
  { href: "/monitoring/clients", label: "Clientes", icon: Users },
  { href: "/monitoring/settings", label: "Config", icon: Settings2 },
];

export function MonitoringLayout({ children }: PropsWithChildren) {
  const [location, setLocation] = useLocation();
  const auth = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between gap-4">
          <button className="font-semibold tracking-tight" onClick={() => setLocation("/monitoring")}>
            Monitoring
          </button>
          <div className="flex items-center gap-2 overflow-x-auto">
            {navItems.map((item) => {
              const active = location === item.href;
              return (
                <Button
                  key={item.href}
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLocation(item.href)}
                  className={cn("shrink-0", active ? "" : "text-muted-foreground")}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void auth.logout()}
            className="shrink-0 text-muted-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
