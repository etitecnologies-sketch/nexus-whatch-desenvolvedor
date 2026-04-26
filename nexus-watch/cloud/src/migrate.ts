import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withClient } from "./db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const schemaPath = path.resolve(__dirname, "schema.sql");
  const sql = await readFile(schemaPath, "utf-8");
  await withClient(async client => {
    await client.query(sql);
  });
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  migrate()
    .then(() => {
      process.stdout.write("OK\n");
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

