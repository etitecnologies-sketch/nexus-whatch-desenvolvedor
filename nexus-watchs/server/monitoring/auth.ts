import type { Request } from "express";
import type { Pool } from "pg";
import type { User as NexusUser } from "../../drizzle/schema";
import { sdk } from "../_core/sdk";

export type MonitoringIdentity = {
  supabaseId: string;
  role: "superadmin" | "client";
  clientId: number | null;
};

export async function authenticateMonitoringRequest(pool: Pool, req: Request): Promise<{
  nexusUser: NexusUser;
  identity: MonitoringIdentity;
}> {
  const nexusUser = await sdk.authenticateRequest(req);

  const role: MonitoringIdentity["role"] = nexusUser.role === "admin" ? "superadmin" : "client";

  const existing = await pool.query(
    "SELECT supabase_id, role, client_id FROM monitoring_identities WHERE supabase_id=$1 LIMIT 1",
    [nexusUser.supabaseId],
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as any;
    return {
      nexusUser,
      identity: {
        supabaseId: String(row.supabase_id),
        role: (row.role === "superadmin" ? "superadmin" : "client") as MonitoringIdentity["role"],
        clientId: row.client_id === null ? null : Number(row.client_id),
      },
    };
  }

  let clientId: number | null = null;
  if (role === "client") {
    const cr = await pool.query("SELECT id FROM clients ORDER BY id ASC LIMIT 1");
    clientId = cr.rows.length > 0 ? Number(cr.rows[0].id) : null;
  }

  await pool.query(
    "INSERT INTO monitoring_identities (supabase_id, role, client_id) VALUES ($1,$2,$3)",
    [nexusUser.supabaseId, role, clientId],
  );

  return {
    nexusUser,
    identity: {
      supabaseId: nexusUser.supabaseId,
      role,
      clientId,
    },
  };
}

