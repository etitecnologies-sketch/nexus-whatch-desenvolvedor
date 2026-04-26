import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { z } from "zod";
import { ENV } from "./env";
import { migrate } from "./migrate";
import { pool, withClient } from "./db";
import { signAdminJwt, timingSafeEqual, verifyJwt } from "./auth";
import crypto from "node:crypto";

const metricSchema = z.object({
  host: z.string().min(1),
  source_product: z.string().optional().default("nexus-watch"),
  source_agent_name: z.string().optional(),
  cpu: z.number(),
  memory: z.number(),
  disk_used: z.number().optional().default(0),
  disk_total: z.number().optional().default(0),
  disk_percent: z.number().optional().default(0),
  net_rx_bytes: z.number().optional().default(0),
  net_tx_bytes: z.number().optional().default(0),
  latency_ms: z.number().optional().default(0),
  uptime_seconds: z.number().optional().default(0),
  load_avg: z.number().optional().default(0),
  processes: z.number().optional().default(0),
  temperature: z.number().optional().default(0),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const createDeviceSchema = z.object({
  clientName: z.string().min(1).optional().default("Default"),
  name: z.string().min(1),
});

function computeMetricSignature(secret: string, ts: string, rawBody: Buffer) {
  return crypto
    .createHmac("sha256", secret)
    .update(ts)
    .update(".")
    .update(rawBody)
    .digest("hex");
}

function isFreshTimestamp(tsSeconds: number, maxSkewSeconds = 300) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return Math.abs(nowSeconds - tsSeconds) <= maxSkewSeconds;
}

function getBearerToken(req: express.Request) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [kind, token] = header.split(" ");
  if (kind?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    verifyJwt(token);
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

async function start() {
  await migrate();

  const app = express();
  app.set("trust proxy", 1);

  app.use(
    express.json({
      limit: "256kb",
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(
    cors({
      origin: ENV.corsOrigin === "*" ? true : ENV.corsOrigin,
      credentials: true,
    })
  );

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: ENV.corsOrigin === "*" ? true : ENV.corsOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(" ")[1];
    if (!token) return next(new Error("Unauthorized"));
    try {
      verifyJwt(token);
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", socket => {
    socket.on("subscribe", (host: string) => {
      if (typeof host !== "string" || host.length === 0) return;
      socket.join(`host:${host}`);
    });
    socket.on("unsubscribe", (host: string) => {
      if (typeof host !== "string" || host.length === 0) return;
      socket.leave(`host:${host}`);
    });
  });

  app.get("/health", async (_req, res) => {
    try {
      await pool.query("select 1 as ok");
      res.json({ status: "ok" });
    } catch (e) {
      res.status(500).json({ status: "error" });
    }
  });

  app.post("/auth/login", async (req, res) => {
    if (ENV.authMode !== "local") {
      return res.status(400).json({ error: "Local auth disabled" });
    }
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
    const { username, password } = parsed.data;

    if (!ENV.localUser || !ENV.localPassword) {
      return res.status(500).json({ error: "Local credentials not configured" });
    }

    const userOk = username === ENV.localUser;
    const passOk = timingSafeEqual(password, ENV.localPassword);
    if (!userOk || !passOk) return res.status(401).json({ error: "Invalid credentials" });

    const token = signAdminJwt(username);
    return res.json({ token });
  });

  app.get("/auth/me", requireAdmin, (req, res) => {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const payload = verifyJwt(token);
    res.json({ user: payload });
  });

  app.get("/devices", requireAdmin, async (_req, res) => {
    const r = await pool.query(
      "select id, client_id, name, hostname, token, status, last_seen, created_at from devices order by id desc"
    );
    res.json(r.rows);
  });

  app.post("/devices", requireAdmin, async (req, res) => {
    const parsed = createDeviceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
    const { clientName, name } = parsed.data;
    const token = crypto.randomBytes(24).toString("hex");
    const ingest_secret = crypto.randomBytes(32).toString("hex");

    const row = await withClient(async client => {
      await client.query("BEGIN");
      const cr = await client.query(
        "insert into clients(name) values($1) on conflict do nothing returning id",
        [clientName]
      );

      let clientId: number;
      if (cr.rows.length) {
        clientId = cr.rows[0].id;
      } else {
        const existing = await client.query(
          "select id from clients where name = $1 order by id asc limit 1",
          [clientName]
        );
        clientId = existing.rows[0]?.id;
      }

      const dr = await client.query(
        "insert into devices(client_id, name, token, ingest_secret, status) values($1,$2,$3,$4,'pending') returning id, client_id, name, hostname, token, ingest_secret, status, last_seen, created_at",
        [clientId, name, token, ingest_secret]
      );
      await client.query("COMMIT");
      return dr.rows[0];
    });

    res.status(201).json(row);
  });

  app.post("/metrics", async (req, res) => {
    const deviceToken =
      (req.headers["x-device-token"] as string | undefined) ||
      (typeof req.body?.device_token === "string" ? req.body.device_token : undefined);

    const signature = (req.headers["x-nx-signature"] as string | undefined) ?? undefined;
    const ts = (req.headers["x-nx-timestamp"] as string | undefined) ?? undefined;

    const parsed = metricSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

    const metric = parsed.data;

    if (!deviceToken) {
      return res.status(401).json({ error: "Missing device token" });
    }
    if (!signature || !ts) {
      return res.status(401).json({ error: "Missing signature" });
    }
    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum) || !isFreshTimestamp(tsNum)) {
      return res.status(401).json({ error: "Invalid timestamp" });
    }

    await withClient(async client => {
      await client.query("BEGIN");

      let deviceId: number | null = null;
      let clientId: number | null = null;

      const dr = await client.query(
        "select id, client_id, ingest_secret from devices where token = $1",
        [deviceToken]
      );
      if (!dr.rows.length) {
        await client.query("ROLLBACK");
        res.status(401).json({ error: "Invalid device token" });
        return;
      }

      deviceId = dr.rows[0].id;
      clientId = dr.rows[0].client_id;
      const secret = String(dr.rows[0].ingest_secret || "");
      const rawBody = (req as any).rawBody as Buffer | undefined;
      if (!secret || !rawBody) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: "Signature not configured" });
        return;
      }

      const expected = computeMetricSignature(secret, String(ts), rawBody);
      const sigOk = timingSafeEqual(signature, expected);
      if (!sigOk) {
        await client.query("ROLLBACK");
        res.status(401).json({ error: "Invalid signature" });
        return;
      }

      await client.query(
        "update devices set last_seen = now(), hostname = $1, status = 'online' where id = $2",
        [metric.host, deviceId]
      );

      await client.query(
        `insert into metrics(time, host, device_id, client_id, source_product, source_agent_name, signature, signature_ts,
          cpu, memory, disk_used, disk_total, disk_percent,
          net_rx_bytes, net_tx_bytes, latency_ms, uptime_seconds, load_avg, processes, temperature)
         values(now(), $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19)`,
        [
          metric.host,
          deviceId,
          clientId,
          metric.source_product,
          metric.source_agent_name ?? null,
          signature,
          tsNum,
          metric.cpu,
          metric.memory,
          metric.disk_used,
          metric.disk_total,
          metric.disk_percent,
          metric.net_rx_bytes,
          metric.net_tx_bytes,
          metric.latency_ms,
          metric.uptime_seconds,
          metric.load_avg,
          metric.processes,
          metric.temperature,
        ]
      );

      await client.query("COMMIT");

      const payload = {
        ...metric,
        device_id: deviceId,
        client_id: clientId,
        time: new Date().toISOString(),
      };
      io.to(`host:${metric.host}`).emit("metric", payload);
      io.emit("metric:all", payload);
    });

    res.status(201).json({ ok: true });
  });

  app.get("/hosts", requireAdmin, async (_req, res) => {
    const r = await pool.query(
      "select host, max(time) as last_time from metrics group by host order by last_time desc"
    );
    res.json(r.rows);
  });

  app.get("/metrics/:host", requireAdmin, async (req, res) => {
    const hours = Math.max(1, Math.min(168, Number(req.query.hours ?? 1)));
    const host = req.params.host;
    const r = await pool.query(
      "select * from metrics where host = $1 and time > now() - ($2 || ' hours')::interval order by time desc",
      [host, String(hours)]
    );
    res.json(r.rows);
  });

  httpServer.listen(ENV.port, "0.0.0.0", () => {
    console.log(`Cloud listening on 0.0.0.0:${ENV.port}`);
  });
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});

