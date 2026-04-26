import { Pool } from "pg";
import { ENV } from "./env";

export const pool = new Pool({
  connectionString: ENV.databaseUrl,
  max: 10,
});

export async function withClient<T>(fn: (client: import("pg").PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

