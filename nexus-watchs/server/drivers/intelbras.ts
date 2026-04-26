import { GenericDriver } from "./generic";
import { DriverResult } from "./base";

export class IntelbrasDriver extends GenericDriver {
  async checkStatus(): Promise<DriverResult> {
    if (this.device.connectionType === "p2p") {
      if (this.device.p2pId) {
        // In a real scenario, we would use Intelbras Cloud SDK to check status
        // For now, we mock it as online if ID exists
        return { success: true, status: "online", latency: 50 };
      }
      return { success: false, status: "error", message: "P2P ID missing" };
    }
    
    return super.checkStatus();
  }

  getRtspUrl(channel: number, streamType: "main" | "sub"): string {
    const host = this.device.ipAddress || this.device.ddnsAddress;
    const port = this.getRtspPort();
    const stream = streamType === "main" ? "0" : "1";
    
    if (this.device.connectionType === "p2p") {
      // Intelbras P2P usually requires a proxy or local stream agent
      // Returning a mock URL for now
      return `rtsp://p2p:${this.device.p2pId}@intelbras-cloud.com/${channel}/${stream}`;
    }

    // Intelbras RTSP format: rtsp://user:pass@ip:port/cam/realmonitor?channel=X&subtype=Y
    return `rtsp://${this.device.username}:${this.device.password}@${host}:${port}/cam/realmonitor?channel=${channel}&subtype=${stream}`;
  }

  getP2PUrl(): string | null {
    if (this.device.p2pId) {
      // URL de acesso Intelbras Cloud
      return "https://remotizze.intelbras.com.br";
    }
    return null;
  }
}
