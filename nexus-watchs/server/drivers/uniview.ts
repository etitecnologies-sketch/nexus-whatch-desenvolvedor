import { GenericDriver } from "./generic";

export class UniviewDriver extends GenericDriver {
  getRtspUrl(channel: number, streamType: "main" | "sub"): string {
    const host = this.device.ipAddress || this.device.ddnsAddress;
    const port = this.getRtspPort();
    
    // Uniview format: rtsp://user:pass@ip:port/unicast/cX/sY/live
    // X = Channel, Y = Stream (0 for main, 1 for sub)
    const stream = streamType === "main" ? "0" : "1";
    
    return `rtsp://${this.device.username}:${this.device.password}@${host}:${port}/unicast/c${channel}/s${stream}/live`;
  }
}
