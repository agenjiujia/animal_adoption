/**
 * 连接性自检：读取项目根目录 .env，用与 API 相同的规则解析库地址并连库。
 * 运行: npm run test:db
 */
import { readFileSync } from "fs";
import { join } from "path";

function loadDotenv(file: string) {
  try {
    const text = readFileSync(file, "utf8");
    for (let line of text.split("\n")) {
      line = line.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      const inlineComment = val.search(/\s+#/);
      if (inlineComment !== -1 && !val.startsWith('"')) {
        val = val.slice(0, inlineComment).trim();
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    console.warn("未读取到 .env，将仅使用已有环境变量");
  }
}

async function main() {
  loadDotenv(join(process.cwd(), ".env"));
  const { prisma, resolveDatabaseUrl } = await import("../lib/prisma");
  const safe = resolveDatabaseUrl().replace(/:([^:@/]+)@/, ":****@");
  console.log("DATABASE_URL(脱敏):", safe);

  await prisma.$connect();
  const n = await prisma.user.count();
  console.log("OK: 已连接 MySQL，`user` 表可读，当前用户数:", n);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
