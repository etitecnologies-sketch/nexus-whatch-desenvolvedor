import { spawn } from "child_process";
import type { Pool } from "pg";
import nodemailer from "nodemailer";
import { MONITORING_ENV } from "./env";
import { processAlertQueue, sendToN8n, type AlertPayload } from "./notifier";

type ClientConfig = {
  telegram_token: string;
  telegram_chat_id: string;
  alert_email: string;
  name: string;
};

const deviceOnlineState = new Map<number, boolean>();
const alertCooldownMap = new Map<string, number>();
const pingDownState = new Map<number, boolean>();
let lastSummarySentAt = 0;

const getUnit = (expr: string) => {
  if (expr === "latency_ms") return "ms";
  if (expr === "temperature") return "°C";
  return "%";
};

const nowStr = () => new Date().toISOString().replace("T", " ").slice(0, 19);

const n8nEnabled = Boolean(process.env.N8N_WEBHOOK_URL);

const severityFromValue = (value: number, threshold: number): AlertPayload["level"] => {
  if (threshold <= 0) return "warning";
  if (value >= threshold * 1.5) return "critical";
  return "warning";
};

const cooldownKey = (host: string, expr: string) => `${host}::${expr}`;
const inCooldown = (host: string, expr: string) => {
  const last = alertCooldownMap.get(cooldownKey(host, expr)) ?? 0;
  return (Date.now() - last) / 1000 < MONITORING_ENV.alertCooldownSeconds;
};
const setCooldown = (host: string, expr: string) => {
  alertCooldownMap.set(cooldownKey(host, expr), Date.now());
};

async function getClientConfig(pool: Pool, clientId: number | null): Promise<ClientConfig | null> {
  if (!clientId) return null;
  try {
    const r = await pool.query("SELECT telegram_token, telegram_chat_id, alert_email, name FROM clients WHERE id=$1", [clientId]);
    if (!r.rows.length) return null;
    return {
      telegram_token: String(r.rows[0].telegram_token || ""),
      telegram_chat_id: String(r.rows[0].telegram_chat_id || ""),
      alert_email: String(r.rows[0].alert_email || ""),
      name: String(r.rows[0].name || ""),
    };
  } catch {
    return null;
  }
}

async function sendTelegram(message: string, clientCfg?: ClientConfig | null) {
  const targets: Array<{ token: string; chatId: string }> = [];
  const clientToken = clientCfg?.telegram_token || "";
  const clientChat = clientCfg?.telegram_chat_id || "";
  if (clientToken && clientChat) targets.push({ token: clientToken, chatId: clientChat });
  if (MONITORING_ENV.telegramToken && MONITORING_ENV.telegramChatId) {
    targets.push({ token: MONITORING_ENV.telegramToken, chatId: MONITORING_ENV.telegramChatId });
  }
  if (targets.length === 0) return;

  await Promise.all(
    targets.map(async (t) => {
      try {
        await fetch(`https://api.telegram.org/bot${t.token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: t.chatId, text: message, parse_mode: "HTML" }),
        });
      } catch {
      }
    }),
  );
}

async function sendEmail(subject: string, body: string, clientCfg?: ClientConfig | null) {
  const emails = Array.from(new Set([clientCfg?.alert_email || "", MONITORING_ENV.alertEmail || ""].filter(Boolean)));
  if (!MONITORING_ENV.smtpHost || !MONITORING_ENV.smtpUser || !MONITORING_ENV.smtpPass || emails.length === 0) return;

  const transporter = nodemailer.createTransport({
    host: MONITORING_ENV.smtpHost,
    port: MONITORING_ENV.smtpPort,
    secure: MONITORING_ENV.smtpPort === 465,
    auth: { user: MONITORING_ENV.smtpUser, pass: MONITORING_ENV.smtpPass },
  });

  await Promise.all(
    emails.map(async (to) => {
      try {
        await transporter.sendMail({
          from: MONITORING_ENV.smtpUser,
          to,
          subject,
          text: body,
        });
      } catch {
      }
    }),
  );
}

async function pingHost(ip: string): Promise<{ ok: boolean; latencyMs: number }> {
  if (!ip) return { ok: false, latencyMs: 0 };
  const timeoutMs = Math.max(1, MONITORING_ENV.pingTimeoutSeconds) * 1000;
  const count = Math.max(1, MONITORING_ENV.pingCount);

  const args = process.platform === "win32"
    ? ["-n", String(count), "-w", String(timeoutMs), ip]
    : ["-c", String(count), "-W", String(MONITORING_ENV.pingTimeoutSeconds), ip];

  const start = Date.now();

  return new Promise((resolve) => {
    const child = spawn("ping", args, { stdio: "ignore" });
    child.on("close", (code) => {
      const latencyMs = Date.now() - start;
      resolve({ ok: code === 0, latencyMs: code === 0 ? latencyMs : 0 });
    });
    child.on("error", () => resolve({ ok: false, latencyMs: 0 }));
  });
}

async function insertAlert(pool: Pool, row: {
  trigger_id?: number | null;
  device_id?: number | null;
  host: string;
  expression: string;
  value: number;
  threshold: number;
  alert_type: string;
  client_id?: number | null;
}) {
  await pool.query(
    "INSERT INTO alerts(trigger_id,device_id,host,expression,value,threshold,alert_type,client_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
    [
      row.trigger_id ?? null,
      row.device_id ?? null,
      row.host,
      row.expression,
      row.value,
      row.threshold,
      row.alert_type,
      row.client_id ?? null,
    ],
  );
}

async function checkPingDevices(pool: Pool) {
  const r = await pool.query(
    `
      SELECT id,name,ip_address,device_type,tags,status,snmp_community,snmp_version,monitor_snmp,hostname,client_id
      FROM devices
      WHERE ip_address IS NOT NULL AND ip_address!='' AND monitor_ping=TRUE
    `,
  );

  const jobs = r.rows.map(async (d: any) => {
    const devId = Number(d.id);
    const ip = String(d.ip_address || "");
    const name = String(d.name || "");
    const wasDown = pingDownState.get(devId) ?? false;
    const clientId = d.client_id === null ? null : Number(d.client_id);
    const clientCfg = await getClientConfig(pool, clientId);

    const result = await pingHost(ip);
    if (result.ok) {
      pingDownState.set(devId, false);
      await pool.query("UPDATE devices SET last_seen=NOW(),status='online' WHERE id=$1", [devId]);

      const hostLabel = String(d.hostname || ip || name);
      await pool.query("INSERT INTO hosts(name) VALUES($1) ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name", [hostLabel]);
      await pool.query(
        `
          INSERT INTO metrics(time,host_id,host,device_id,cpu,memory,disk_used,disk_total,disk_percent,net_rx_bytes,net_tx_bytes,latency_ms,uptime_seconds,load_avg,processes,temperature)
          VALUES(NOW(),(SELECT id FROM hosts WHERE name=$1),$1,$2,0,0,0,0,0,0,0,$3,0,0,0,0)
        `,
        [hostLabel, devId, result.latencyMs],
      );

      if (wasDown) {
        const payload: AlertPayload = {
          level: "recovery",
          device: name,
          client: clientCfg?.name || "N/A",
          metric: "ping",
          value: result.latencyMs,
          threshold: 0,
          timestamp: new Date().toISOString(),
          deviceId: devId,
          message: `IP ${ip} voltou a responder`,
        };
        const jobs: Promise<unknown>[] = [sendToN8n(pool, payload)];
        if (!n8nEnabled) {
          jobs.push(
            sendTelegram(`✅ ${name}\nNormalizado: IP ${ip} está respondendo ao ping\nData: ${nowStr()}`, clientCfg),
            sendEmail(
              `[NexusWatch] ONLINE: ${name}`,
              `Device '${name}' voltou ONLINE.\nIP: ${ip}\nPing: ${result.latencyMs}ms\nCliente: ${clientCfg?.name || "N/A"}\nHorário: ${nowStr()}`,
              clientCfg,
            ),
          );
        }
        await Promise.allSettled(jobs);
      }

      return;
    }

    pingDownState.set(devId, true);
    if (!wasDown) {
      await insertAlert(pool, {
        device_id: devId,
        host: ip || name,
        expression: "ping_offline",
        value: 1,
        threshold: 0,
        alert_type: "offline",
        client_id: clientId,
      });
      await pool.query("UPDATE devices SET status='offline' WHERE id=$1", [devId]);

      const payload: AlertPayload = {
        level: "critical",
        device: name,
        client: clientCfg?.name || "N/A",
        metric: "ping_offline",
        value: 1,
        threshold: 0,
        timestamp: new Date().toISOString(),
        deviceId: devId,
        message: `IP ${ip} indisponível via ping`,
      };
      const jobs: Promise<unknown>[] = [sendToN8n(pool, payload)];
      if (!n8nEnabled) {
        jobs.push(
          sendTelegram(`❌ ${name}\nProblema: IP ${ip} está indisponível via ping\nData: ${nowStr()}`, clientCfg),
          sendEmail(
            `[NexusWatch] OFFLINE: ${name}`,
            `Device '${name}' ficou OFFLINE.\nIP: ${ip}\nCliente: ${clientCfg?.name || "N/A"}\nHorário: ${nowStr()}`,
            clientCfg,
          ),
        );
      }
      await Promise.allSettled(jobs);
    }
  });

  await Promise.all(jobs);
}

async function checkOfflineDevices(pool: Pool) {
  const r = await pool.query(
    "SELECT id,name,hostname,last_seen,status,device_type,tags,client_id FROM devices WHERE monitor_agent=TRUE",
  );

  const now = Date.now();
  for (const row of r.rows as any[]) {
    const devId = Number(row.id);
    const name = String(row.name || "");
    const hostname = String(row.hostname || "");
    const lastSeen = row.last_seen ? new Date(row.last_seen).getTime() : null;
    if (!lastSeen) continue;

    const isOffline = (now - lastSeen) / 1000 > MONITORING_ENV.offlineTimeoutSeconds;
    const wasOffline = deviceOnlineState.get(devId) ?? false;
    const clientId = row.client_id === null ? null : Number(row.client_id);
    const clientCfg = await getClientConfig(pool, clientId);

    if (isOffline && !wasOffline) {
      deviceOnlineState.set(devId, true);
      await insertAlert(pool, {
        device_id: devId,
        host: hostname || name,
        expression: "offline",
        value: 1,
        threshold: 0,
        alert_type: "offline",
        client_id: clientId,
      });
      await pool.query("UPDATE devices SET status='offline' WHERE id=$1", [devId]);
      const downtime = Math.floor((now - lastSeen) / 1000);
      const payload: AlertPayload = {
        level: "critical",
        device: name,
        client: clientCfg?.name || "N/A",
        metric: "offline",
        value: downtime,
        threshold: MONITORING_ENV.offlineTimeoutSeconds,
        timestamp: new Date().toISOString(),
        deviceId: devId,
        message: `Agente sem comunicação`,
      };
      const jobs: Promise<unknown>[] = [sendToN8n(pool, payload)];
      if (!n8nEnabled) {
        jobs.push(
          sendTelegram(
            `❌ ${name}\nProblema: Agente sem comunicação por ${downtime}s\nÚltimo contato: ${new Date(lastSeen).toISOString()}\nData: ${nowStr()}`,
            clientCfg,
          ),
          sendEmail(
            `[NexusWatch] OFFLINE: ${name}`,
            `Device '${name}' parou de enviar dados.\nCliente: ${clientCfg?.name || "N/A"}\nHost: ${hostname}\nÚltimo contato: ${new Date(lastSeen).toISOString()}\nHorário: ${nowStr()}`,
            clientCfg,
          ),
        );
      }
      await Promise.allSettled(jobs);
    }

    if (!isOffline && wasOffline) {
      deviceOnlineState.set(devId, false);
      await pool.query("UPDATE devices SET status='online' WHERE id=$1", [devId]);
      const payload: AlertPayload = {
        level: "recovery",
        device: name,
        client: clientCfg?.name || "N/A",
        metric: "offline",
        value: 0,
        threshold: MONITORING_ENV.offlineTimeoutSeconds,
        timestamp: new Date().toISOString(),
        deviceId: devId,
        message: `Agente voltou a comunicar`,
      };
      const jobs: Promise<unknown>[] = [sendToN8n(pool, payload)];
      if (!n8nEnabled) {
        jobs.push(
          sendTelegram(`✅ ${name}\nNormalizado: Agente voltou a enviar dados\nData: ${nowStr()}`, clientCfg),
          sendEmail(
            `[NexusWatch] ONLINE: ${name}`,
            `Device '${name}' voltou.\nCliente: ${clientCfg?.name || "N/A"}\nHorário: ${nowStr()}`,
            clientCfg,
          ),
        );
      }
      await Promise.allSettled(jobs);
    }
  }
}

async function sendStatusSummary(pool: Pool) {
  if (n8nEnabled) return;
  if ((Date.now() - lastSummarySentAt) / 1000 < 3600) return;
  lastSummarySentAt = Date.now();

  const [online, offline, clients] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM devices WHERE status='online'"),
    pool.query("SELECT COUNT(*) FROM devices WHERE status='offline'"),
    pool.query("SELECT COUNT(*) FROM clients WHERE status='active'"),
  ]);

  const msg = [
    `📊 <b>STATUS REPORT — NexusWatch</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🏢 Clientes ativos: <b>${Number.parseInt(clients.rows[0].count, 10)}</b>`,
    `🟢 Devices online: <b>${Number.parseInt(online.rows[0].count, 10)}</b>  🔴 Offline: <b>${Number.parseInt(offline.rows[0].count, 10)}</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🕐 ${nowStr()}`,
  ].join("\n");

  await sendTelegram(msg, null);
}

async function evaluateTriggers(pool: Pool) {
  const tr = await pool.query("SELECT id,name,expression,threshold,client_id FROM triggers WHERE enabled=TRUE");
  if (!tr.rows.length) return;

  const mr = await pool.query(`
    SELECT DISTINCT ON(m.host)
      m.host, m.cpu, m.memory, m.disk_percent, m.latency_ms, m.load_avg, m.temperature,
      m.device_id, d.client_id
    FROM metrics m
    LEFT JOIN devices d ON d.id = m.device_id
    WHERE m.time > NOW() - INTERVAL '1 minute'
    ORDER BY m.host, m.time DESC
  `);
  if (!mr.rows.length) return;

  for (const t of tr.rows as any[]) {
    const triggerId = Number(t.id);
    const name = String(t.name);
    const expr = String(t.expression);
    const threshold = Number(t.threshold);
    const triggerClientId = t.client_id === null ? null : Number(t.client_id);

    for (const m of mr.rows as any[]) {
      const host = String(m.host);
      const deviceId = m.device_id === null ? null : Number(m.device_id);
      const deviceClientId = m.client_id === null ? null : Number(m.client_id);

      if (triggerClientId && deviceClientId && triggerClientId !== deviceClientId) continue;
      const targetClientId = deviceClientId ?? triggerClientId ?? null;

      const value =
        expr === "cpu"
          ? Number(m.cpu)
          : expr === "memory"
            ? Number(m.memory)
            : expr === "disk_percent"
              ? Number(m.disk_percent)
              : expr === "latency_ms"
                ? Number(m.latency_ms)
                : expr === "load_avg"
                  ? Number(m.load_avg)
                  : expr === "temperature"
                    ? Number(m.temperature)
                    : null;

      if (value === null) continue;
      if (Number.isFinite(value) && value > threshold) {
        if (inCooldown(host, expr)) continue;
        await insertAlert(pool, {
          trigger_id: triggerId,
          device_id: deviceId,
          host,
          expression: expr,
          value,
          threshold,
          alert_type: "threshold",
          client_id: targetClientId,
        });
        setCooldown(host, expr);

        const unit = getUnit(expr);
        const clientCfg = await getClientConfig(pool, targetClientId);
        const level = severityFromValue(value, threshold);
        const payload: AlertPayload = {
          level,
          device: host,
          client: clientCfg?.name || "N/A",
          metric: expr,
          value,
          threshold,
          timestamp: new Date().toISOString(),
          deviceId: deviceId ?? 0,
          message: `Trigger: ${name}`,
        };
        const jobs: Promise<unknown>[] = [sendToN8n(pool, payload)];
        if (!n8nEnabled) {
          jobs.push(
            sendTelegram(
              `⚠️ ${host}\nTrigger: ${name}\nMétrica: ${expr} = ${value.toFixed(1)}${unit} (limite ${threshold}${unit})\nData: ${nowStr()}`,
              clientCfg,
            ),
            sendEmail(
              `[NexusWatch] ALERTA: ${name} em ${host}`,
              `ALERTA\n\nTrigger: ${name}\nHost: ${host}\nMétrica: ${expr} = ${value.toFixed(1)}${unit}\nLimite: ${threshold}${unit}\nCliente: ${clientCfg?.name || "N/A"}\nHorário: ${nowStr()}`,
              clientCfg,
            ),
          );
        }
        await Promise.allSettled(jobs);
      }
    }
  }
}

export function startMonitoringProcessor(pool: Pool) {
  if (!MONITORING_ENV.enableProcessor) return () => {};

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      if (MONITORING_ENV.pingEnabled) {
        await checkPingDevices(pool);
      }
      await checkOfflineDevices(pool);
      await sendStatusSummary(pool);
      await evaluateTriggers(pool);
    } catch {
    } finally {
      running = false;
    }
  };

  void tick();
  const intervalMs = Math.max(1, MONITORING_ENV.evalIntervalSeconds) * 1000;
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();

  const retryTimer = setInterval(() => void processAlertQueue(pool), 2 * 60 * 1000);
  retryTimer.unref();

  return () => {
    clearInterval(timer);
    clearInterval(retryTimer);
  };
}
