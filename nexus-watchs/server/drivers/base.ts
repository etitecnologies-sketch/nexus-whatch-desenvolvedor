import axios from "axios";
import { Device } from "../../drizzle/schema";

export type DriverResult = {
  success: boolean;
  status: "online" | "offline" | "error";
  latency?: number;
  message?: string;
};

export abstract class BaseDriver {
  constructor(protected device: Device) {}

  protected getRtspPort(defaultPort: number = 554): number {
    const port = this.device.port;
    if (!port) return defaultPort;
    if (port === 80 || port === 8000) return defaultPort;
    return port;
  }

  /**
   * Check if the device is reachable
   */
  abstract checkStatus(): Promise<DriverResult>;

  /**
   * Get RTSP URL for a specific channel
   */
  abstract getRtspUrl(channel: number, streamType: "main" | "sub"): string;

  /**
   * Get Web Playback URL (HLS) via MediaMTX
   */
  async getWebStreamUrl(channel: number, streamType: "main" | "sub"): Promise<string> {
    const streamName = `device_${this.device.id}_ch${channel}_${streamType}`;
    const mediaMtxHost = process.env.MEDIAMTX_HOST || "localhost";
    const mediaMtxApiPort = process.env.MEDIAMTX_API_PORT || "9999";
    const rtspUrl = this.getRtspUrl(channel, streamType);

    // Tenta registrar o caminho no MediaMTX via API
    try {
      const apiUrl = `http://${mediaMtxHost}:${mediaMtxApiPort}/v3/config/paths/add/${streamName}`;
      await axios.post(apiUrl, {
        source: rtspUrl,
        sourceOnDemand: true // Só puxa do DVR quando alguém estiver assistindo
      });
      console.log(`[MediaMTX] Caminho registrado: ${streamName}`);
    } catch (error: any) {
      // Se já existir (400), ignoramos. Se for outro erro, logamos.
      if (error.response?.status !== 400) {
        console.error(`[MediaMTX] Erro ao registrar caminho ${streamName}:`, error.message);
      }
    }

    return `http://${mediaMtxHost}:8888/${streamName}/index.m3u8`;
  }

  /**
   * Get P2P Web Access URL (if supported by manufacturer)
   */
  getP2PUrl(): string | null {
    return null;
  }

  /**
   * Move PTZ camera
   */
  abstract ptzMove(channel: number, direction: string, speed?: number): Promise<boolean>;
}
