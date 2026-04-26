import { defineConfig } from "drizzle-kit";

// Tenta encontrar a URL de conexão em várias fontes comuns do Railway
let connectionString = 
  process.env.DATABASE_URL || 
  process.env.MYSQL_URL || 
  process.env.MYSQL_PRIVATE_URL || 
  process.env.MYSQL_PUBLIC_URL ||
  (process.env.MYSQLHOST ? `mysql://${process.env.MYSQLUSER}:${process.env.MYSQLPASSWORD}@${process.env.MYSQLHOST}:${process.env.MYSQLPORT}/${process.env.MYSQLDATABASE}` : null);

if (!connectionString) {
  console.error("❌ Erro: Nenhuma variável de banco de dados encontrada.");
  process.exit(1);
}

// Limpeza caso o usuário tenha colado "DATABASE_URL=mysql://..." por engano
if (connectionString.startsWith("DATABASE_URL=")) {
  connectionString = connectionString.replace("DATABASE_URL=", "");
}

// Se for TiDB/Cloud ou AWS, garante que o SSL esteja habilitado se não estiver na URL
const dbUrl = (connectionString.includes("tidbcloud.com") || connectionString.includes("aws")) && !connectionString.includes("ssl=") 
  ? connectionString.includes("?") 
    ? `${connectionString}&ssl={"rejectUnauthorized":true}`
    : `${connectionString}?ssl={"rejectUnauthorized":true}`
  : connectionString;

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: dbUrl,
  },
});
