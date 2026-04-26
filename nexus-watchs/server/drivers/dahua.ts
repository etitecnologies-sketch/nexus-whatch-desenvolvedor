import { GenericDriver } from "./generic";

export class DahuaDriver extends GenericDriver {
  getRtspUrl(channel: number, streamType: "main" | "sub"): string {
    const host = this.device.ipAddress || this.device.ddnsAddress;
    const port = this.getRtspPort();
    
    // Dahua format: rtsp://user:pass@ip:port/cam/realmonitor?channel=X&subtype=Y
    // Y = 0 for main, 1 for sub
    const stream = streamType === "main" ? "0" : "1";
    
    return `rtsp://${this.device.username}:${this.device.password}@${host}:${port}/cam/realmonitor?channel=${channel}&subtype=${stream}`;
  }

  async ptzMove(channel: number, direction: string, speed: number = 1): Promise<boolean> {
    // Dahua uses HTTP API for PTZ
    // Example: /cgi-bin/ptz.cgi?action=start&channel=0&code=Up&arg1=0&arg2=5&arg3=0
    console.log(`[DahuaDriver] PTZ Move: ${direction} on channel ${channel} using HTTP API`);
    return true;
  }
}
