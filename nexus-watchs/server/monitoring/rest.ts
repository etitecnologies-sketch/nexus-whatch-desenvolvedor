import cors from "cors";
import crypto from "crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import type { Pool } from "pg";
import { MONITORING_ENV } from "./env";
import type { MonitoringMetricPayload } from "./socket";
import { authenticateMonitoringRequest, type MonitoringIdentity } from "./auth";

type ReqWithMonitoring = express.Request & {
  monitoring?: {
    identity: MonitoringIdentity;
  };
};

function logger(level: string, message: string, data: Record<string, unknown> = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}]`, message, data);
}

function makeAuthMiddleware(pool: Pool) {
  return async (req: ReqWithMonitoring, res: express.Response, next: express.NextFunction) => {
    try {
      const { identity } = await authenticateMonitoringRequest(pool, req);
      req.monitoring = { identity };
      next();
    } catch (err) {
      logger("WARN", "Monitoring auth failed", { error: String(err) });
      res.status(401).json({ error: "Unauthorized" });
    }
  };
}

function requireSuperadmin(req: ReqWithMonitoring, res: express.Response, next: express.NextFunction) {
  if (req.monitoring?.identity.role !== "superadmin") {
    res.status(403).json({ error: "Superadmin only" });
    return;
  }
  next();
}

function clientFilter(req: ReqWithMonitoring) {
  const identity = req.monitoring?.identity;
  if (!identity) return null;

  if (identity.role === "superadmin") {
    const q = req.query.client_id;
    if (!q) return null;
    const parsed = Number.parseInt(String(q), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (identity.clientId === null) return null;
  return identity.clientId;
}

function requireClientId(req: ReqWithMonitoring, res: express.Response) {
  const identity = req.monitoring?.identity;
  if (!identity) {
    res.status(401).json({ error: "Unauthorized" });
    return undefined;
  }
  if (identity.role === "superadmin") return null;
  if (identity.clientId === null) {
    res.status(403).json({ error: "Client not assigned" });
    return undefined;
  }
  return identity.clientId;
}

export function registerMonitoringRest(app: express.Express, pool: Pool, opts: {
  publishMetric: (metric: MonitoringMetricPayload) => void;
}) {
  app.use("/monitoring", cors({
    origin: MONITORING_ENV.corsOrigin,
    credentials: true,
    optionsSuccessStatus: 200,
  }));

  const metricsLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    skip: (req) => Boolean(req.headers["x-device-token"]),
  });

  const authMiddleware = makeAuthMiddleware(pool);

  app.get("/monitoring/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/monitoring/ready", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ready", timestamp: new Date().toISOString() });
    } catch (e: any) {
      logger("ERROR", "Readiness check failed");
      res.status(503).json({ status: "not ready", error: e?.message ?? String(e) });
    }
  });

  app.get("/monitoring/auth/me", authMiddleware, (req: ReqWithMonitoring, res) => {
    const identity = req.monitoring!.identity;
    res.json({
      role: identity.role,
      client_id: identity.clientId,
      supabase_id: identity.supabaseId,
    });
  });

  app.get("/monitoring/clients", authMiddleware, requireSuperadmin, async (_req, res) => {
    try {
      const r = await pool.query(`
        SELECT c.*,
          COUNT(DISTINCT d.id) as device_count,
          COUNT(DISTINCT CASE WHEN d.status='online' THEN d.id END) as online_count,
          COUNT(DISTINCT CASE WHEN d.status='offline' THEN d.id END) as offline_count,
          COUNT(DISTINCT mi.supabase_id) as user_count
        FROM clients c
        LEFT JOIN devices d ON d.client_id = c.id
        LEFT JOIN monitoring_identities mi ON mi.client_id = c.id
        GROUP BY c.id ORDER BY c.created_at DESC
      `);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? String(e) });
    }
  });

  app.get("/monitoring/clients/:id", authMiddleware, requireSuperadmin, async (req, res) => {
    const r = await pool.query("SELECT * FROM clients WHERE id=$1", [req.params.id]);
    if (!r.rows.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(r.rows[0]);
  });

  app.post("/monitoring/clients", authMiddleware, requireSuperadmin, async (req, res) => {
    const { name, document, email, phone, address, city, state, plan, status, telegram_token, telegram_chat_id, alert_email, notes } =
      req.body as Record<string, any>;
    if (!name) {
      res.status(400).json({ error: "Name required" });
      return;
    }
    try {
      const r = await pool.query(
        `
          INSERT INTO clients (name, document, email, phone, address, city, state, plan, status,
            telegram_token, telegram_chat_id, alert_email, notes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *
        `,
        [
          name,
          document || "",
          email || "",
          phone || "",
          address || "",
          city || "",
          state || "",
          plan || "basic",
          status || "active",
          telegram_token || "",
          telegram_chat_id || "",
          alert_email || "",
          notes || "",
        ],
      );
      res.status(201).json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? String(e) });
    }
  });

  app.put("/monitoring/clients/:id", authMiddleware, requireSuperadmin, async (req, res) => {
    const { name, document, email, phone, address, city, state, plan, status, telegram_token, telegram_chat_id, alert_email, notes } =
      req.body as Record<string, any>;
    try {
      const r = await pool.query(
        `
          UPDATE clients SET name=$1, document=$2, email=$3, phone=$4, address=$5,
            city=$6, state=$7, plan=$8, status=$9, telegram_token=$10,
            telegram_chat_id=$11, alert_email=$12, notes=$13
          WHERE id=$14 RETURNING *
        `,
        [
          name,
          document || "",
          email || "",
          phone || "",
          address || "",
          city || "",
          state || "",
          plan || "basic",
          status || "active",
          telegram_token || "",
          telegram_chat_id || "",
          alert_email || "",
          notes || "",
          req.params.id,
        ],
      );
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? String(e) });
    }
  });

  app.delete("/monitoring/clients/:id", authMiddleware, requireSuperadmin, async (req, res) => {
    await pool.query("DELETE FROM clients WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  });

  app.get("/monitoring/clients/:id/stats", authMiddleware, requireSuperadmin, async (req, res) => {
    const cid = req.params.id;
    const devices = await pool.query("SELECT COUNT(*) FROM devices WHERE client_id=$1", [cid]);
    const online = await pool.query("SELECT COUNT(*) FROM devices WHERE client_id=$1 AND status='online'", [cid]);
    const offline = await pool.query("SELECT COUNT(*) FROM devices WHERE client_id=$1 AND status='offline'", [cid]);
    const alerts = await pool.query("SELECT COUNT(*) FROM alerts WHERE client_id=$1 AND fired_at > NOW() - INTERVAL '24 hours'", [cid]);
    res.json({
      devices: Number.parseInt(devices.rows[0].count, 10),
      online: Number.parseInt(online.rows[0].count, 10),
      offline: Number.parseInt(offline.rows[0].count, 10),
      alerts_24h: Number.parseInt(alerts.rows[0].count, 10),
    });
  });

  app.get("/monitoring/devices", authMiddleware, async (req: ReqWithMonitoring, res) => {
    try {
      const enforced = requireClientId(req, res);
      if (enforced === undefined) return;
      const cid = clientFilter(req);
      const { type, tag, status } = req.query as Record<string, string | undefined>;
      let query = `
        SELECT d.*,
          c.name as client_name,
          (SELECT time       FROM metrics WHERE device_id=d.id ORDER BY time DESC LIMIT 1) as last_metric,
          (SELECT cpu        FROM metrics WHERE device_id=d.id ORDER BY time DESC LIMIT 1) as last_cpu,
          (SELECT memory     FROM metrics WHERE device_id=d.id ORDER BY time DESC LIMIT 1) as last_memory,
          (SELECT latency_ms FROM metrics WHERE device_id=d.id ORDER BY time DESC LIMIT 1) as last_latency
        FROM devices d
        LEFT JOIN clients c ON c.id = d.client_id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      if (cid) {
        params.push(cid);
        query += ` AND d.client_id=$${params.length}`;
      }
      if (type) {
        params.push(type);
        query += ` AND d.device_type=$${params.length}`;
      }
      if (tag) {
        params.push(tag);
        query += ` AND $${params.length}=ANY(d.tags)`;
      }
      if (status) {
        params.push(status);
        query += ` AND d.status=$${params.length}`;
      }
      query += " ORDER BY d.created_at DESC";
      const r = await pool.query(query, params);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? String(e) });
    }
  });

  app.post("/monitoring/devices", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const {
      name,
      description,
      location,
      device_type,
      ip_address,
      tags,
      snmp_community,
      snmp_version,
      ssh_user,
      ssh_port,
      monitor_ping,
      monitor_snmp,
      monitor_agent,
      notes,
      client_id,
    } = req.body as Record<string, any>;
    if (!name) {
      res.status(400).json({ error: "Name required" });
      return;
    }

    const identity = req.monitoring!.identity;
    const cid =
      identity.role === "superadmin"
        ? client_id || null
        : identity.clientId;
    if (identity.role === "client" && cid === null) {
      res.status(403).json({ error: "Client not assigned" });
      return;
    }
    const token = crypto.randomBytes(32).toString("hex");
    try {
      const r = await pool.query(
        `
          INSERT INTO devices (name, description, location, token, device_type, ip_address, tags,
            snmp_community, snmp_version, ssh_user, ssh_port, monitor_ping, monitor_snmp,
            monitor_agent, notes, client_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *
        `,
        [
          name,
          description || "",
          location || "",
          token,
          device_type || "other",
          ip_address || null,
          tags || [],
          snmp_community || "public",
          snmp_version || "2c",
          ssh_user || null,
          ssh_port || 22,
          monitor_ping !== false,
          monitor_snmp || false,
          monitor_agent !== false,
          notes || "",
          cid,
        ],
      );
      res.status(201).json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? String(e) });
    }
  });

  app.put("/monitoring/devices/:id", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const {
      name,
      description,
      location,
      device_type,
      ip_address,
      tags,
      snmp_community,
      snmp_version,
      ssh_user,
      ssh_port,
      monitor_ping,
      monitor_snmp,
      monitor_agent,
      notes,
    } = req.body as Record<string, any>;
    try {
      const identity = req.monitoring!.identity;
      const values: unknown[] = [
        name,
        description || "",
        location || "",
        device_type || "other",
        ip_address || null,
        tags || [],
        snmp_community || "public",
        snmp_version || "2c",
        ssh_user || null,
        ssh_port || 22,
        monitor_ping !== false,
        monitor_snmp || false,
        monitor_agent !== false,
        notes || "",
        req.params.id,
      ];

      let where = "WHERE id=$15";
      if (identity.role === "client") {
        if (identity.clientId === null) {
          res.status(403).json({ error: "Client not assigned" });
          return;
        }
        values.push(identity.clientId);
        where = "WHERE id=$15 AND client_id=$16";
      }

      const r = await pool.query(
        `
          UPDATE devices SET name=$1, description=$2, location=$3, device_type=$4,
            ip_address=$5, tags=$6, snmp_community=$7, snmp_version=$8, ssh_user=$9,
            ssh_port=$10, monitor_ping=$11, monitor_snmp=$12, monitor_agent=$13, notes=$14
          ${where} RETURNING *
        `,
        values,
      );
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? String(e) });
    }
  });

  app.delete("/monitoring/devices/:id", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const identity = req.monitoring!.identity;
    if (identity.role === "client") {
      if (identity.clientId === null) {
        res.status(403).json({ error: "Client not assigned" });
        return;
      }
      await pool.query("DELETE FROM devices WHERE id=$1 AND client_id=$2", [req.params.id, identity.clientId]);
      res.json({ ok: true });
      return;
    }
    await pool.query("DELETE FROM devices WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  });

  app.post("/monitoring/devices/:id/regenerate-token", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const identity = req.monitoring!.identity;
    const token = crypto.randomBytes(32).toString("hex");
    if (identity.role === "client") {
      if (identity.clientId === null) {
        res.status(403).json({ error: "Client not assigned" });
        return;
      }
      const r = await pool.query("UPDATE devices SET token=$1 WHERE id=$2 AND client_id=$3 RETURNING token", [
        token,
        req.params.id,
        identity.clientId,
      ]);
      res.json({ token: r.rows[0]?.token });
      return;
    }
    const r = await pool.query("UPDATE devices SET token=$1 WHERE id=$2 RETURNING token", [token, req.params.id]);
    res.json({ token: r.rows[0].token });
  });

  app.get("/monitoring/tags", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const enforced = requireClientId(req, res);
    if (enforced === undefined) return;
    const cid = clientFilter(req);
    let query = "SELECT DISTINCT unnest(tags) as tag FROM devices";
    const params: unknown[] = [];
    if (cid) {
      params.push(cid);
      query += ` WHERE client_id=$1`;
    }
    query += " ORDER BY tag";
    const r = await pool.query(query, params);
    res.json(r.rows.map((row: any) => row.tag));
  });

  app.get("/monitoring/device-types", authMiddleware, (_req, res) => {
    res.json([
      { value: "server", label: "Servidor", icon: "🖥️" },
      { value: "camera", label: "Câmera IP", icon: "📷" },
      { value: "router", label: "Roteador", icon: "🌐" },
      { value: "switch", label: "Switch", icon: "🔀" },
      { value: "routerboard", label: "RouterBoard", icon: "📡" },
      { value: "unifi", label: "UniFi", icon: "📶" },
      { value: "firewall", label: "Firewall", icon: "🛡️" },
      { value: "printer", label: "Impressora", icon: "🖨️" },
      { value: "iot", label: "IoT", icon: "💡" },
      { value: "workstation", label: "Workstation", icon: "💻" },
      { value: "other", label: "Outro", icon: "📦" },
    ]);
  });

  app.get("/monitoring/triggers", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const enforced = requireClientId(req, res);
    if (enforced === undefined) return;
    const cid = clientFilter(req);
    let query = "SELECT * FROM triggers WHERE 1=1";
    const params: unknown[] = [];
    if (cid) {
      params.push(cid);
      query += ` AND client_id=$${params.length}`;
    }
    query += " ORDER BY created_at DESC";
    const r = await pool.query(query, params);
    res.json(r.rows);
  });

  app.post("/monitoring/triggers", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const { name, expression, threshold, enabled, device_type, tags } = req.body as Record<string, any>;
    if (!name || !expression || threshold === undefined) {
      res.status(400).json({ error: "name, expression, threshold required" });
      return;
    }
    const identity = req.monitoring!.identity;
    const cid = identity.role === "superadmin" ? req.body.client_id || null : identity.clientId;
    if (identity.role === "client" && cid === null) {
      res.status(403).json({ error: "Client not assigned" });
      return;
    }
    try {
      const r = await pool.query(
        `
          INSERT INTO triggers (name, expression, threshold, enabled, device_type, tags, client_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
        `,
        [name, expression, threshold, enabled !== false, device_type || null, tags || [], cid],
      );
      res.status(201).json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? String(e) });
    }
  });

  app.put("/monitoring/triggers/:id", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const { name, expression, threshold, enabled, device_type, tags } = req.body as Record<string, any>;
    try {
      const identity = req.monitoring!.identity;
      const values: unknown[] = [name, expression, threshold, enabled, device_type || null, tags || [], req.params.id];
      let where = "WHERE id=$7";
      if (identity.role === "client") {
        if (identity.clientId === null) {
          res.status(403).json({ error: "Client not assigned" });
          return;
        }
        values.push(identity.clientId);
        where = "WHERE id=$7 AND client_id=$8";
      }
      const r = await pool.query(
        `
          UPDATE triggers SET name=$1,expression=$2,threshold=$3,enabled=$4,device_type=$5,tags=$6
          ${where} RETURNING *
        `,
        values,
      );
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? String(e) });
    }
  });

  app.delete("/monitoring/triggers/:id", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const identity = req.monitoring!.identity;
    if (identity.role === "client") {
      if (identity.clientId === null) {
        res.status(403).json({ error: "Client not assigned" });
        return;
      }
      await pool.query("DELETE FROM triggers WHERE id=$1 AND client_id=$2", [req.params.id, identity.clientId]);
      res.json({ ok: true });
      return;
    }
    await pool.query("DELETE FROM triggers WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  });

  const postMetrics = async (req: express.Request, res: express.Response) => {
    const deviceToken = (req.headers["x-device-token"] as string | undefined) || (req.body?.device_token as string | undefined);
    const {
      host,
      cpu,
      memory,
      disk_used,
      disk_total,
      disk_percent,
      net_rx_bytes,
      net_tx_bytes,
      latency_ms,
      uptime_seconds,
      load_avg,
      processes,
      temperature,
    } = req.body as Record<string, any>;

    if (!host || cpu === undefined || memory === undefined) {
      res.status(400).json({ error: "host, cpu, memory required" });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      let deviceId: number | null = null;
      let clientId: number | null = null;
      if (deviceToken) {
        const dr = await client.query("SELECT id, client_id FROM devices WHERE token=$1", [deviceToken]);
        if (dr.rows.length > 0) {
          deviceId = Number(dr.rows[0].id);
          clientId = dr.rows[0].client_id === null ? null : Number(dr.rows[0].client_id);
          await client.query("UPDATE devices SET last_seen=NOW(), hostname=$1, status='online' WHERE id=$2", [host, deviceId]);
        }
      }
      const hr = await client.query(
        "INSERT INTO hosts (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id",
        [host],
      );
      await client.query(
        `
          INSERT INTO metrics (time,host_id,host,device_id,cpu,memory,disk_used,disk_total,
            disk_percent,net_rx_bytes,net_tx_bytes,latency_ms,uptime_seconds,load_avg,processes,temperature)
          VALUES (NOW(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        `,
        [
          hr.rows[0].id,
          host,
          deviceId,
          cpu,
          memory,
          disk_used || 0,
          disk_total || 0,
          disk_percent || 0,
          net_rx_bytes || 0,
          net_tx_bytes || 0,
          latency_ms || 0,
          uptime_seconds || 0,
          load_avg || 0,
          processes || 0,
          temperature || 0,
        ],
      );
      await client.query("COMMIT");

      opts.publishMetric({
        host,
        cpu: Number(cpu),
        memory: Number(memory),
        disk_percent: Number(disk_percent || 0),
        latency_ms: Number(latency_ms || 0),
        device_id: deviceId,
        client_id: clientId,
        time: new Date().toISOString(),
      });

      res.status(201).json({ ok: true });
    } catch (e: any) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: e?.message ?? String(e) });
    } finally {
      client.release();
    }
  };

  app.post("/metrics", metricsLimiter, postMetrics);
  app.post("/monitoring/metrics", metricsLimiter, postMetrics);

  app.get("/monitoring/metrics/:host", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const identity = req.monitoring!.identity;
    if (identity.role === "client") {
      if (identity.clientId === null) {
        res.status(403).json({ error: "Client not assigned" });
        return;
      }
      const allow = await pool.query(
        "SELECT 1 FROM devices WHERE client_id=$1 AND (hostname=$2 OR ip_address=$2) LIMIT 1",
        [identity.clientId, req.params.host],
      );
      if (allow.rows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
    }
    const hours = Math.min(Number.parseInt(String(req.query.hours ?? "1"), 10) || 1, 24);
    const r = await pool.query(
      `
        SELECT time,cpu,memory,disk_percent,net_rx_bytes,net_tx_bytes,
          latency_ms,uptime_seconds,load_avg,processes,temperature
        FROM metrics WHERE host=$1 AND time > NOW()-($2||' hours')::INTERVAL
        ORDER BY time DESC LIMIT 1000
      `,
      [req.params.host, hours],
    );
    res.json(r.rows);
  });

  app.get("/monitoring/alerts", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const enforced = requireClientId(req, res);
    if (enforced === undefined) return;
    const cid = clientFilter(req);
    let query = `
      SELECT a.*, t.name as trigger_name, d.name as device_name, d.device_type,
        c.name as client_name
      FROM alerts a
      LEFT JOIN triggers t ON a.trigger_id=t.id
      LEFT JOIN devices d ON a.device_id=d.id
      LEFT JOIN clients c ON a.client_id=c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    if (cid) {
      params.push(cid);
      query += ` AND a.client_id=$${params.length}`;
    }
    query += " ORDER BY a.fired_at DESC LIMIT 200";
    const r = await pool.query(query, params);
    res.json(r.rows);
  });

  app.get("/monitoring/stats", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const enforced = requireClientId(req, res);
    if (enforced === undefined) return;
    const cid = clientFilter(req);
    const where = cid ? `WHERE client_id=${cid}` : "";
    const identity = req.monitoring!.identity;
    const [total, online, offline, clients_total] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM devices ${where}`),
      pool.query(`SELECT COUNT(*) FROM devices ${where ? where + " AND" : "WHERE"} status='online'`),
      pool.query(`SELECT COUNT(*) FROM devices ${where ? where + " AND" : "WHERE"} status='offline'`),
      identity.role === "superadmin" ? pool.query("SELECT COUNT(*) FROM clients WHERE status='active'") : Promise.resolve({ rows: [{ count: 0 }] }),
    ]);
    res.json({
      devices: Number.parseInt(total.rows[0].count, 10),
      online: Number.parseInt(online.rows[0].count, 10),
      offline: Number.parseInt(offline.rows[0].count, 10),
      clients: Number.parseInt(clients_total.rows[0].count, 10),
    });
  });

  app.get("/monitoring/hosts", authMiddleware, async (req: ReqWithMonitoring, res) => {
    try {
      const enforced = requireClientId(req, res);
      if (enforced === undefined) return;
      const cid = clientFilter(req);
      let query = "SELECT DISTINCT h.* FROM hosts h";
      const params: unknown[] = [];
      if (cid) {
        params.push(cid);
        query += ` JOIN devices d ON d.hostname = h.name OR d.ip_address = h.name WHERE d.client_id = $1`;
      }
      query += " ORDER BY h.name";
      const r = await pool.query(query, params);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? String(e) });
    }
  });

  app.get("/monitoring/solar/brands", authMiddleware, (_req, res) => {
    res.json([
      { value: "growatt", label: "Growatt", icon: "🟠", method: "cloud", fields: ["growatt_user", "growatt_pass", "growatt_plant_id"] },
      { value: "fronius", label: "Fronius", icon: "🔵", method: "local", fields: ["fronius_ip", "fronius_device_id"] },
      { value: "deye", label: "Deye", icon: "🟡", method: "cloud", fields: ["solarman_token", "solarman_app_id", "solarman_logger_sn"] },
      { value: "solis", label: "Solis", icon: "🟤", method: "cloud", fields: ["solarman_token", "solarman_app_id", "solarman_logger_sn"] },
      { value: "sma", label: "SMA", icon: "⚫", method: "local", fields: ["api_url"] },
      { value: "goodwe", label: "GoodWe", icon: "🟢", method: "cloud", fields: ["goodwe_user", "goodwe_pass", "goodwe_station_id"] },
      { value: "huawei", label: "Huawei FusionSolar", icon: "🔴", method: "cloud", fields: ["huawei_user", "huawei_pass", "huawei_station_id"] },
      { value: "canadian", label: "Canadian Solar", icon: "🍁", method: "generic", fields: ["api_url", "api_key"] },
      { value: "risen", label: "Risen Energy", icon: "🌟", method: "generic", fields: ["api_url", "api_key"] },
      { value: "other", label: "Outro (Genérico)", icon: "☀️", method: "generic", fields: ["api_url", "api_key"] },
    ]);
  });

  app.get("/monitoring/solar/inverters", authMiddleware, async (req: ReqWithMonitoring, res) => {
    try {
      const enforced = requireClientId(req, res);
      if (enforced === undefined) return;
      const cid = clientFilter(req);

      let query = `
        SELECT i.*, c.name as client_name,
          (SELECT power_w FROM solar_metrics WHERE inverter_id=i.id ORDER BY time DESC LIMIT 1) as last_power,
          (SELECT energy_today_kwh FROM solar_metrics WHERE inverter_id=i.id ORDER BY time DESC LIMIT 1) as last_energy_today,
          (SELECT revenue_today FROM solar_metrics WHERE inverter_id=i.id ORDER BY time DESC LIMIT 1) as last_revenue_today,
          (SELECT energy_total_kwh FROM solar_metrics WHERE inverter_id=i.id ORDER BY time DESC LIMIT 1) as last_energy_total,
          (SELECT revenue_total FROM solar_metrics WHERE inverter_id=i.id ORDER BY time DESC LIMIT 1) as last_revenue_total,
          (SELECT inverter_status FROM solar_metrics WHERE inverter_id=i.id ORDER BY time DESC LIMIT 1) as last_status,
          (SELECT temperature_c FROM solar_metrics WHERE inverter_id=i.id ORDER BY time DESC LIMIT 1) as last_temp,
          (SELECT time FROM solar_metrics WHERE inverter_id=i.id ORDER BY time DESC LIMIT 1) as last_update
        FROM solar_inverters i
        LEFT JOIN clients c ON c.id = i.client_id
        WHERE i.status='active'
      `;
      const params: unknown[] = [];
      if (cid) {
        params.push(cid);
        query += ` AND i.client_id=$${params.length}`;
      }
      query += " ORDER BY i.created_at DESC";

      const r = await pool.query(query, params);
      const safe = r.rows.map((row: any) => {
        const { growatt_pass, sma_pass, goodwe_pass, huawei_pass, ...rest } = row;
        return rest;
      });
      res.json(safe);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? String(e) });
    }
  });

  app.post("/monitoring/solar/inverters", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const body = req.body as Record<string, any>;
    if (!body.name || !body.brand) {
      res.status(400).json({ error: "name e brand obrigatórios" });
      return;
    }
    const identity = req.monitoring!.identity;
    const cid = identity.role === "superadmin" ? body.client_id || null : identity.clientId;
    if (identity.role === "client" && cid === null) {
      res.status(403).json({ error: "Client not assigned" });
      return;
    }
    try {
      const r = await pool.query(
        `
          INSERT INTO solar_inverters (
            name, brand, model, location, capacity_kwp, tariff_kwh, client_id,
            growatt_user, growatt_pass, growatt_plant_id,
            fronius_ip, fronius_device_id,
            solarman_token, solarman_app_id, solarman_logger_sn,
            sma_user, sma_pass, sma_plant_id,
            goodwe_user, goodwe_pass, goodwe_station_id,
            huawei_user, huawei_pass, huawei_station_id,
            api_url, api_key, api_type, notes
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
          RETURNING id, name, brand, model, location, capacity_kwp, tariff_kwh, client_id, status, created_at
        `,
        [
          body.name,
          body.brand,
          body.model || "",
          body.location || "",
          body.capacity_kwp || 0,
          body.tariff_kwh || 0.85,
          cid,
          body.growatt_user || "",
          body.growatt_pass || "",
          body.growatt_plant_id || "",
          body.fronius_ip || "",
          body.fronius_device_id || 1,
          body.solarman_token || "",
          body.solarman_app_id || "",
          body.solarman_logger_sn || "",
          body.sma_user || "",
          body.sma_pass || "",
          body.sma_plant_id || "",
          body.goodwe_user || "",
          body.goodwe_pass || "",
          body.goodwe_station_id || "",
          body.huawei_user || "",
          body.huawei_pass || "",
          body.huawei_station_id || "",
          body.api_url || "",
          body.api_key || "",
          body.api_type || "",
          body.notes || "",
        ],
      );
      res.status(201).json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? String(e) });
    }
  });

  app.put("/monitoring/solar/inverters/:id", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const body = req.body as Record<string, any>;
    try {
      const identity = req.monitoring!.identity;
      const values: unknown[] = [
        body.name,
        body.brand,
        body.model || "",
        body.location || "",
        body.capacity_kwp || 0,
        body.tariff_kwh || 0.85,
        body.growatt_user || "",
        body.growatt_pass || "",
        body.growatt_plant_id || "",
        body.fronius_ip || "",
        body.fronius_device_id || 1,
        body.solarman_token || "",
        body.solarman_app_id || "",
        body.solarman_logger_sn || "",
        body.sma_user || "",
        body.sma_pass || "",
        body.sma_plant_id || "",
        body.goodwe_user || "",
        body.goodwe_pass || "",
        body.goodwe_station_id || "",
        body.huawei_user || "",
        body.huawei_pass || "",
        body.huawei_station_id || "",
        body.api_url || "",
        body.api_key || "",
        body.api_type || "",
        body.notes || "",
        req.params.id,
      ];

      let where = "WHERE id=$28";
      if (identity.role === "client") {
        if (identity.clientId === null) {
          res.status(403).json({ error: "Client not assigned" });
          return;
        }
        values.push(identity.clientId);
        where = "WHERE id=$28 AND client_id=$29";
      }

      const r = await pool.query(
        `
          UPDATE solar_inverters SET
            name=$1, brand=$2, model=$3, location=$4, capacity_kwp=$5, tariff_kwh=$6,
            growatt_user=$7, growatt_pass=COALESCE(NULLIF($8,''), growatt_pass),
            growatt_plant_id=$9, fronius_ip=$10, fronius_device_id=$11,
            solarman_token=$12, solarman_app_id=$13, solarman_logger_sn=$14,
            sma_user=$15, sma_pass=COALESCE(NULLIF($16,''), sma_pass), sma_plant_id=$17,
            goodwe_user=$18, goodwe_pass=COALESCE(NULLIF($19,''), goodwe_pass), goodwe_station_id=$20,
            huawei_user=$21, huawei_pass=COALESCE(NULLIF($22,''), huawei_pass), huawei_station_id=$23,
            api_url=$24, api_key=$25, api_type=$26, notes=$27
          ${where} RETURNING id, name, brand, location, status
        `,
        values,
      );
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? String(e) });
    }
  });

  app.delete("/monitoring/solar/inverters/:id", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const identity = req.monitoring!.identity;
    if (identity.role === "client") {
      if (identity.clientId === null) {
        res.status(403).json({ error: "Client not assigned" });
        return;
      }
      await pool.query("DELETE FROM solar_inverters WHERE id=$1 AND client_id=$2", [req.params.id, identity.clientId]);
      res.json({ ok: true });
      return;
    }
    await pool.query("DELETE FROM solar_inverters WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  });

  app.get("/monitoring/solar/inverters/:id/metrics", authMiddleware, async (req: ReqWithMonitoring, res) => {
    const identity = req.monitoring!.identity;
    if (identity.role === "client") {
      if (identity.clientId === null) {
        res.status(403).json({ error: "Client not assigned" });
        return;
      }
      const allow = await pool.query("SELECT 1 FROM solar_inverters WHERE id=$1 AND client_id=$2 LIMIT 1", [
        req.params.id,
        identity.clientId,
      ]);
      if (allow.rows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
    }
    const hours = Math.min(Number.parseInt(String(req.query.hours ?? "24"), 10) || 24, 168);
    const r = await pool.query(
      `
        SELECT time, power_w, energy_today_kwh, energy_total_kwh,
          revenue_today, revenue_total, inverter_status, temperature_c
        FROM solar_metrics
        WHERE inverter_id=$1 AND time > NOW() - ($2||' hours')::INTERVAL
        ORDER BY time DESC LIMIT 500
      `,
      [req.params.id, hours],
    );
    res.json(r.rows);
  });

  app.get("/monitoring/solar/summary", authMiddleware, async (req: ReqWithMonitoring, res) => {
    try {
      const enforced = requireClientId(req, res);
      if (enforced === undefined) return;
      const cid = clientFilter(req);
      const where = cid ? `WHERE client_id=${cid}` : "";

      const [total, power, today, revenue] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM solar_inverters ${where} AND status='active'`.replace("WHERE AND", "WHERE")),
        pool.query(
          `SELECT COALESCE(SUM(sm.power_w),0) as total_power FROM solar_inverters i JOIN LATERAL (SELECT power_w FROM solar_metrics WHERE inverter_id=i.id ORDER BY time DESC LIMIT 1) sm ON TRUE ${cid ? `WHERE i.client_id=${cid}` : ""}`,
        ),
        pool.query(
          `SELECT COALESCE(SUM(sm.energy_today_kwh),0) as total_today FROM solar_inverters i JOIN LATERAL (SELECT energy_today_kwh FROM solar_metrics WHERE inverter_id=i.id ORDER BY time DESC LIMIT 1) sm ON TRUE ${cid ? `WHERE i.client_id=${cid}` : ""}`,
        ),
        pool.query(
          `SELECT COALESCE(SUM(sm.revenue_today),0) as total_revenue FROM solar_inverters i JOIN LATERAL (SELECT revenue_today FROM solar_metrics WHERE inverter_id=i.id ORDER BY time DESC LIMIT 1) sm ON TRUE ${cid ? `WHERE i.client_id=${cid}` : ""}`,
        ),
      ]);

      res.json({
        total_inverters: Number.parseInt(total.rows[0].count, 10),
        total_power_w: Number.parseFloat(power.rows[0].total_power),
        energy_today_kwh: Number.parseFloat(today.rows[0].total_today),
        revenue_today: Number.parseFloat(revenue.rows[0].total_revenue),
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? String(e) });
    }
  });
}
