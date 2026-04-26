import { Pool } from "pg";
import { MONITORING_ENV } from "./env";

let pool: Pool | null = null;

export function getMonitoringPool() {
  if (pool) return pool;
  if (!MONITORING_ENV.databaseUrl) {
    throw new Error("MONITORING_DATABASE_URL is required");
  }
  pool = new Pool({
    connectionString: MONITORING_ENV.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
  });
  return pool;
}

