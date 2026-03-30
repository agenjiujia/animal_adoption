import { Prisma } from "@prisma/client";

/** 写入库：统一为 JSON 数组或 DbNull */
export function normalizeImageUrlsInput(
  input: unknown
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (input == null) return Prisma.DbNull;
  const arr = Array.isArray(input)
    ? input.map((x) => String(x).trim()).filter(Boolean)
    : String(input)
        .replace(/，/g, ",")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  if (!arr.length) return Prisma.DbNull;
  return arr;
}

/** 接口输出：一律转为 string[] */
export function imageUrlsToApiField(val: unknown): string[] {
  if (val == null) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return val.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}
