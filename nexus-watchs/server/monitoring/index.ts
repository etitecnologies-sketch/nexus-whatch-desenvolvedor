import type { Express } from "express";
import type { Server as HttpServer } from "http";
import { ensureMonitoringSchema } from "./schema";
import { getMonitoringPool } from "./pool";
import { createMonitoringSocket } from "./socket";
import { registerMonitoringRest } from "./rest";
import { startMonitoringProcessor } from "./processor";
import { MONITORING_ENV } from "./env";

export async function registerMonitoring(app: Express, server: HttpServer) {
  if (!MONITORING_ENV.databaseUrl) {
    return;
  }

  const pool = getMonitoringPool();
  await ensureMonitoringSchema(pool);

  const socket = createMonitoringSocket(server, pool);
  socket.registerPublishEndpoint(app);

  registerMonitoringRest(app, pool, {
    publishMetric: socket.publish,
  });

  startMonitoringProcessor(pool);
}
