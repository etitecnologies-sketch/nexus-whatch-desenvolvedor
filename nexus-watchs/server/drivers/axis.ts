import { GenericDriver } from "./generic";

export class AxisDriver extends GenericDriver {
  getRtspUrl(channel: number, streamType: "main" | "sub"): string {
    const host = this.device.ipAddress || this.device.ddnsAddress;
    const port = this.getRtspPort();
    
    // Axis format: rtsp://user:pass@ip:port/axis-media/media.amp?videocodec=h264&camera=X
    // Stream type is usually handled via resolution or profiles in Axis
    return `rtsp://${this.device.username}:${this.device.password}@${host}:${port}/axis-media/media.amp?videocodec=h264&camera=${channel}`;
  }
}
