import { join } from "path";

/**
 * 持久上传目录（绝对路径）。未设置时使用 `public/uploads`。
 * 阿里云多实例/函数计算请挂载云盘并设置此变量，否则磁盘不持久。
 */
export function resolveUploadDir(): string {
  const custom = process.env.UPLOAD_ROOT?.trim();
  if (custom) return custom;
  return join(process.cwd(), "public", "uploads");
}

/** 与上传时生成的文件名一致 */
const PET_FILE = /^[0-9]+-[a-z0-9]+\.[a-zA-Z0-9]+$/;
const AVATAR_FILE = /^avatar-[0-9]+-[0-9]+\.[a-zA-Z0-9]+$/;

export function isAllowedUploadBasename(name: string): boolean {
  if (!name || name.length > 220) return false;
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    return false;
  }
  return PET_FILE.test(name) || AVATAR_FILE.test(name);
}

export function contentTypeFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpeg") || lower.endsWith(".jpg")) return "image/jpeg";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

/**
 * 新上传接口返回的地址：统一走 Node 读盘，避免 Nginx 未配置 /uploads 静态、或 standalone 下静态异常。
 */
export function publicUrlForSavedFile(fileName: string): string {
  return `/api/upload/file/${encodeURIComponent(fileName)}`;
}

/**
 * 将历史库里的 `/uploads/xxx` 转为 `/api/upload/file/xxx`，列表/详情图片与网关配置解耦。
 */
export function rewriteLocalUploadUrlForApi(url: string): string {
  const t = url.trim();
  if (t.startsWith("/api/upload/file/")) return t;
  if (!t.startsWith("/uploads/")) return url;
  const base = t.slice("/uploads/".length);
  if (!isAllowedUploadBasename(base)) return url;
  return `/api/upload/file/${encodeURIComponent(base)}`;
}

export function rewritePetImageUrlListForApi(urls: string[]): string[] {
  return urls.map(rewriteLocalUploadUrlForApi);
}
