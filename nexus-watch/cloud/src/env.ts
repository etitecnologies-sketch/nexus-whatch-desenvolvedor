import "dotenv/config";

const must = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
};

export const ENV = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? "3000"),
  databaseUrl: must("DATABASE_URL"),
  jwtSecret: must("JWT_SECRET"),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  authMode: (process.env.AUTH_MODE ?? "local") as "local" | "supabase",
  localUser: process.env.LOCAL_AUTH_USER ?? "",
  localPassword: process.env.LOCAL_AUTH_PASSWORD ?? "",
};

