import { PrismaClient } from "@prisma/client";

/**
 * 去掉 .env 行尾注释（Next/dotenv 常把 `pass # 说明` 整块读进变量，导致连库失败）
 */
export function cleanEnvValue(v: string | undefined): string {
  if (v == null) return "";
  let s = String(v).trim();
  const cut = s.search(/\s+#/);
  if (cut !== -1) s = s.slice(0, cut).trim();
  return s;
}

/** Prisma 只认 DATABASE_URL；与存量 .env（仅有 MYSQL_*）兼容 */
export function resolveDatabaseUrl(): string {
  const direct = cleanEnvValue(process.env.DATABASE_URL);
  if (direct.startsWith("mysql://")) return direct;

  let host = cleanEnvValue(process.env.MYSQL_HOST) || "127.0.0.1";
  if (host === "localhost") host = "127.0.0.1";

  const port = cleanEnvValue(process.env.MYSQL_PORT) || "3306";
  const user = cleanEnvValue(process.env.MYSQL_USER) || "root";
  const password = cleanEnvValue(process.env.MYSQL_PASSWORD);
  const database = cleanEnvValue(process.env.MYSQL_DATABASE) || "mysql";

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  return `mysql://${u}:${p}@${host}:${port}/${database}`;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: resolveDatabaseUrl() },
    },
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
