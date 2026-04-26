import net from "net";
import { BaseDriver, DriverResult } from "./base";

export class GenericDriver extends BaseDriver {
  async checkStatus(): Promise<DriverResult> {
    const host = this.device.ipAddress || this.device.ddnsAddress;
    const port = this.device.port || 8000;

    if (!host) {
      return { success: false, status: "error", message: "No host provided" };
    }

    const connectOnce = (targetPort: number) =>
      new Promise<DriverResult>((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();
        socket.setTimeout(5000);

        socket.on("connect", () => {
          const latency = Date.now() - start;
          socket.destroy();
          resolve({ success: true, status: "online", latency });
        });

        socket.on("timeout", () => {
          socket.destroy();
          resolve({ success: false, status: "offline" });
        });

        socket.on("error", () => {
          socket.destroy();
          resolve({ success: false, status: "offline" });
        });

        socket.connect(targetPort, host);
      });

    const primaryResult = await connectOnce(port);
    if (primaryResult.status === "online") return primaryResult;

    if (port === 80 || port === 8000) {
      return connectOnce(554);
    }

    return primaryResult;
  }

  getRtspUrl(channel: number, streamType: "main" | "sub"): string {
    const host = this.device.ipAddress || this.device.ddnsAddress;
    const port = this.getRtspPort();
    const stream = streamType === "main" ? "0" : "1";
    // Standard RTSP URL format (can vary by manufacturer, but this is a common one)
    return `rtsp://${this.device.username}:${this.device.password}@${host}:${port}/cam/realmonitor?channel=${channel}&subtype=${stream}`;
  }

  async ptzMove(channel: number, direction: string, speed: number = 1): Promise<boolean> {
    console.log(`[GenericDriver] PTZ Move: ${direction} on channel ${channel}`);
    return true; // Generic RTSP doesn't support PTZ, requires ONVIF/HTTP API
  }
}
