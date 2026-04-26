import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const from = path.resolve("src", "schema.sql");
const toDir = path.resolve("dist");
const to = path.join(toDir, "schema.sql");

await mkdir(toDir, { recursive: true });
await copyFile(from, to);

