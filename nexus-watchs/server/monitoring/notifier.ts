import type { Pool } from "pg";

export type AlertPayload = {
  level: "warning" | "critical" | "recovery";
  device: string;
  client: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
  deviceId: number;
  message?: string;
};

export async function sendToN8n(pool: Pool, payload: AlertPayload) {
  const url = process.env.N8N_WEBHOOK_URL || "";
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-nexus-secret": process.env.N8N_WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify({
        source: "nexus-watch",
        ...payload,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`n8n HTTP ${res.status} ${body}`.trim());
    }
  } catch (err) {
    await enqueueFailedAlert(pool, payload, String(err));
  }
}

export async function enqueueFailedAlert(pool: Pool, payload: AlertPayload, lastError: string) {
  await pool.query(
    `
      INSERT INTO alert_queue(payload,status,retry_count,last_error,created_at,updated_at)
      VALUES($1,'pending',0,$2,NOW(),NOW())
    `,
    [payload, lastError.slice(0, 2000)],
  );
}

export async function processAlertQueue(pool: Pool) {
  const { rows } = await pool.query(`
    SELECT id, payload, retry_count
    FROM alert_queue
    WHERE status='pending' AND retry_count < 3
    ORDER BY created_at ASC
    LIMIT 10
  `);

  const url = process.env.N8N_WEBHOOK_URL || "";
  if (!url) return;

  for (const row of rows as any[]) {
    const id = Number(row.id);
    const payload = row.payload as AlertPayload;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-nexus-secret": process.env.N8N_WEBHOOK_SECRET ?? "",
        },
        body: JSON.stringify({
          source: "nexus-watch",
          ...payload,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`n8n HTTP ${res.status} ${body}`.trim());
      }
      await pool.query("UPDATE alert_queue SET status='sent', updated_at=NOW() WHERE id=$1", [id]);
    } catch (err) {
      await pool.query(
        `
          UPDATE alert_queue
          SET retry_count = retry_count + 1,
              last_error = $2,
              status = CASE WHEN retry_count >= 2 THEN 'failed' ELSE 'pending' END,
              updated_at = NOW()
          WHERE id = $1
        `,
        [id, String(err).slice(0, 2000)],
      );
    }
  }
}
