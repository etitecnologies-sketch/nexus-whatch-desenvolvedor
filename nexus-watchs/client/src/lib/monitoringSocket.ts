import { io } from "socket.io-client";

export type MonitoringSocketMetric = {
  host: string;
  cpu: number;
  memory: number;
  disk_percent: number;
  latency_ms: number;
  device_id: number | null;
  client_id: number | null;
  time: string;
};

export function createMonitoringSocket() {
  const socket = io({
    transports: ["websocket", "polling"],
    withCredentials: true,
  });

  return socket;
}
