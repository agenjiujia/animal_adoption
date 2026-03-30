/**
 * 读取 .env（含 MYSQL_*），执行 scripts/fix_adoption_apply.sql
 * 运行: npx tsx scripts/run-fix-adoption-apply.ts
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import { resolveDatabaseUrl } from "../lib/prisma";

function loadDotenv(file: string) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (let line of text.split("\n")) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    const ic = val.search(/\s+#/);
    if (ic !== -1 && !val.startsWith('"')) val = val.slice(0, ic).trim();
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotenv(join(process.cwd(), ".env"));
process.env.DATABASE_URL = resolveDatabaseUrl();

const raw = process.env.DATABASE_URL;
if (!raw.startsWith("mysql://")) {
  console.error("DATABASE_URL 需为 mysql:// 连接串");
  process.exit(1);
}

const withoutProto = raw.slice("mysql://".length);
const at = withoutProto.lastIndexOf("@");
if (at === -1) {
  console.error("DATABASE_URL 格式无效");
  process.exit(1);
}
const auth = withoutProto.slice(0, at);
const rest = withoutProto.slice(at + 1);
const colonAuth = auth.indexOf(":");
const user = decodeURIComponent(
  colonAuth === -1 ? auth : auth.slice(0, colonAuth)
);
const password = decodeURIComponent(
  colonAuth === -1 ? "" : auth.slice(colonAuth + 1)
);

const slash = rest.indexOf("/");
const hostPort = slash === -1 ? rest : rest.slice(0, slash);
const dbName =
  slash === -1 ? "" : decodeURIComponent(rest.slice(slash + 1).split("?")[0]);

const colonHp = hostPort.indexOf(":");
const host = colonHp === -1 ? hostPort : hostPort.slice(0, colonHp);
const port = colonHp === -1 ? "3306" : hostPort.slice(colonHp + 1);

const sqlPath = join(process.cwd(), "scripts/fix_adoption_apply.sql");
const sql = readFileSync(sqlPath, "utf8");

const r = spawnSync(
  "mysql",
  [`-h${host}`, `-P${port}`, `-u${user}`, `-p${password}`, dbName],
  {
    input: sql,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }
);

if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);

if (r.status !== 0) {
  console.error(`\nmysql 退出码 ${r.status}。请检查账号权限与库名是否正确。`);
  process.exit(r.status ?? 1);
}

console.log("\n完成。请再试 POST /api/pet/:id/apply");
