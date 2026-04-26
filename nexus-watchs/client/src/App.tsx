import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import MonitoringAlerts from "./pages/MonitoringAlerts";
import MonitoringClients from "./pages/MonitoringClients";
import MonitoringDashboard from "./pages/MonitoringDashboard";
import MonitoringDevices from "./pages/MonitoringDevices";
import MonitoringHost from "./pages/MonitoringHost";
import MonitoringSettings from "./pages/MonitoringSettings";
import MonitoringSolar from "./pages/MonitoringSolar";
import MonitoringTriggers from "./pages/MonitoringTriggers";
import Home from "./pages/Home";
import Login from "./pages/Login";
import DeviceManagement from "./pages/DeviceManagement";
import LiveView from "./pages/LiveView";
import Playback from "./pages/Playback";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Favorites from "./pages/Favorites";
import PTZControls from "./pages/PTZControls";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/monitoring/host/:host" component={MonitoringHost} />
      <Route path="/monitoring/devices" component={MonitoringDevices} />
      <Route path="/monitoring/alerts" component={MonitoringAlerts} />
      <Route path="/monitoring/triggers" component={MonitoringTriggers} />
      <Route path="/monitoring/solar" component={MonitoringSolar} />
      <Route path="/monitoring/clients" component={MonitoringClients} />
      <Route path="/monitoring/settings" component={MonitoringSettings} />
      <Route path="/monitoring" component={MonitoringDashboard} />
      <Route path="/live-view" component={LiveView} />
      <Route path="/playback" component={Playback} />
      <Route path="/devices" component={DeviceManagement} />
      <Route path="/devices/add" component={DeviceManagement} />
      <Route path="/devices/:id" component={LiveView} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/settings" component={Settings} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/favorites/:id" component={LiveView} />
      <Route path="/ptz" component={PTZControls} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
