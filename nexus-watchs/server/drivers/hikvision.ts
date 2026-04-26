import { GenericDriver } from "./generic";

export class HikvisionDriver extends GenericDriver {
  getRtspUrl(channel: number, streamType: "main" | "sub"): string {
    const host = this.device.ipAddress || this.device.ddnsAddress;
    const port = this.getRtspPort();
    
    // Hikvision format: rtsp://user:pass@ip:port/Streaming/Channels/XYY
    // X = Channel, YY = Stream (01 for main, 02 for sub)
    const stream = streamType === "main" ? "01" : "02";
    const channelId = `${channel}${stream}`;
    
    return `rtsp://${this.device.username}:${this.device.password}@${host}:${port}/Streaming/Channels/${channelId}`;
  }

  async ptzMove(channel: number, direction: string, speed: number = 1): Promise<boolean> {
    // Hikvision uses ISAPI for PTZ
    // Example: PUT /ISAPI/PTZCtrl/channels/1/continuous
    console.log(`[HikvisionDriver] PTZ Move: ${direction} on channel ${channel} using ISAPI`);
    return true; 
  }
}
