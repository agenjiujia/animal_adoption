import { imageUrlsToApiField } from "@/lib/imageUrls";

/** API 输出：decimal / JSON 等转为前端友好结构 */
export function serializePetForApi<T extends Record<string, unknown>>(row: T) {
  const out = { ...row } as Record<string, unknown>;
  if (out.weight != null) out.weight = Number(out.weight);
  out.image_urls = imageUrlsToApiField(out.image_urls);
  return out as T;
}
