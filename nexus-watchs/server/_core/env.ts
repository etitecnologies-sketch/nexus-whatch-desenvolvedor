let rawDbUrl = 
  process.env.DATABASE_URL || 
  process.env.MYSQL_URL || 
  process.env.MYSQL_PRIVATE_URL || 
  process.env.MYSQL_PUBLIC_URL ||
  (process.env.MYSQLHOST ? `mysql://${process.env.MYSQLUSER}:${process.env.MYSQLPASSWORD}@${process.env.MYSQLHOST}:${process.env.MYSQLPORT}/${process.env.MYSQLDATABASE}` : "");

// Limpeza caso o usuário tenha colado "DATABASE_URL=mysql://..." por engano
if (rawDbUrl.startsWith("DATABASE_URL=")) {
  rawDbUrl = rawDbUrl.replace("DATABASE_URL=", "");
}

// Garante SSL para TiDB/Cloud se necessário
const dbUrl = (rawDbUrl && !rawDbUrl.includes("ssl=") && (rawDbUrl.includes("tidbcloud.com") || rawDbUrl.includes("aws")))
  ? (rawDbUrl.includes("?") ? `${rawDbUrl}&ssl={"rejectUnauthorized":true}` : `${rawDbUrl}?ssl={"rejectUnauthorized":true}`)
  : rawDbUrl;

export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "default_secret_for_dev",
  databaseUrl: dbUrl,
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  authMode:
    process.env.AUTH_MODE === "local" ||
    (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
      ? ("local" as const)
      : ("supabase" as const),
  localAuthUser:
    process.env.LOCAL_AUTH_USER ?? (process.env.NODE_ENV === "production" ? "" : "admin"),
  localAuthPassword:
    process.env.LOCAL_AUTH_PASSWORD ??
    (process.env.NODE_ENV === "production" ? "" : "admin"),
};

// Validação simples para ajudar no deploy
if (ENV.isProduction) {
  const missing = [];
  if (!ENV.databaseUrl) missing.push("DATABASE_URL");
  if (!ENV.cookieSecret) missing.push("JWT_SECRET");
  if (!ENV.supabaseUrl) missing.push("SUPABASE_URL");
  if (!ENV.supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  
  if (missing.length > 0) {
    console.error(`⚠️  AVISO: Variáveis de ambiente faltando: ${missing.join(", ")}`);
  }
}
