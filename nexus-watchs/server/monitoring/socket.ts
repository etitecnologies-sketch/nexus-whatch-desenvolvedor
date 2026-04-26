import type { Express } from "express";
import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { Pool } from "pg";
import { MONITORING_ENV } from "./env";
import { sdk } from "../_core/sdk";

export type MonitoringMetricPayload = {
  host: string;
  cpu: number;
  memory: number;
  disk_percent: number;
  latency_ms: number;
  device_id: number | null;
  client_id: number | null;
  time: string;
};

export function createMonitoringSocket(server: HttpServer, pool: Pool) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: MONITORING_ENV.corsOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const cookieHeader = (socket.request as any)?.headers?.cookie as string | undefined;
      const req = { headers: { cookie: cookieHeader } } as any;
      const nexusUser = await sdk.authenticateRequest(req);

      const defaultRole = nexusUser.role === "admin" ? "superadmin" : "client";
      const existing = await pool.query(
        "SELECT role, client_id FROM monitoring_identities WHERE supabase_id=$1 LIMIT 1",
        [nexusUser.supabaseId],
      );

      let role: "superadmin" | "client" = defaultRole;
      let clientId: number | null = null;

      if (existing.rows.length > 0) {
        role = existing.rows[0].role === "superadmin" ? "superadmin" : "client";
        clientId = existing.rows[0].client_id === null ? null : Number(existing.rows[0].client_id);
      } else {
        if (role === "client") {
          const cr = await pool.query("SELECT id FROM clients ORDER BY id ASC LIMIT 1");
          clientId = cr.rows.length > 0 ? Number(cr.rows[0].id) : null;
        }
        await pool.query(
          "INSERT INTO monitoring_identities (supabase_id, role, client_id) VALUES ($1,$2,$3)",
          [nexusUser.supabaseId, role, clientId],
        );
      }

      (socket.data as any).monitoring = { role, clientId, supabaseId: nexusUser.supabaseId };
      if (role === "superadmin") {
        socket.join("monitoring:superadmin");
      } else if (clientId !== null) {
        socket.join(`monitoring:client:${clientId}`);
      }

      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("subscribe", (host: string) => {
      if (typeof host !== "string" || host.length === 0) return;
      const role = (socket.data as any)?.monitoring?.role as string | undefined;
      if (role !== "superadmin") return;
      socket.join(`host:${host}`);
    });

    socket.on("unsubscribe", (host: string) => {
      if (typeof host !== "string" || host.length === 0) return;
      socket.leave(`host:${host}`);
    });
  });

  const publish = (metric: MonitoringMetricPayload) => {
    if (metric.client_id !== null) {
      io.to(`monitoring:client:${metric.client_id}`).emit("metric", metric);
    }
    io.to("monitoring:superadmin").emit("metric:all", metric);
    io.to(`host:${metric.host}`).emit("metric", metric);
  };

  const registerPublishEndpoint = (app: Express) => {
    const handler = async (req: any, res: any) => {
      if (MONITORING_ENV.publishSecret) {
        const secret = req.headers["x-publish-secret"];
        if (secret !== MONITORING_ENV.publishSecret) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
      }

      const body = req.body as Partial<MonitoringMetricPayload>;
      if (!body.host) {
        res.status(400).json({ error: "host required" });
        return;
      }
      const payload: MonitoringMetricPayload = {
        host: String(body.host),
        cpu: Number(body.cpu ?? 0),
        memory: Number(body.memory ?? 0),
        disk_percent: Number(body.disk_percent ?? 0),
        latency_ms: Number(body.latency_ms ?? 0),
        device_id: body.device_id === null || body.device_id === undefined ? null : Number(body.device_id),
        client_id: body.client_id === null || body.client_id === undefined ? null : Number(body.client_id),
        time: String(body.time ?? new Date().toISOString()),
      };
      publish(payload);
      res.json({ ok: true });
    };

    app.post("/publish", handler);
    app.post("/monitoring/publish", handler);
  };

  return { io, publish, registerPublishEndpoint };
}
