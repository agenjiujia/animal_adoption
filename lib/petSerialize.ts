import { imageUrlsToApiField } from "@/lib/imageUrls";
import {
  rewriteLocalUploadUrlForApi,
  rewritePetImageUrlListForApi,
} from "@/lib/uploadStorage";

/** API 输出：decimal / JSON 等转为前端友好结构 */
export function serializePetForApi<T extends Record<string, unknown>>(row: T) {
  const out = { ...row } as Record<string, unknown>;
  if (out.weight != null) out.weight = Number(out.weight);
  out.image_urls = rewritePetImageUrlListForApi(
    imageUrlsToApiField(out.image_urls)
  );
  if (typeof out.owner_avatar === "string") {
    out.owner_avatar = rewriteLocalUploadUrlForApi(out.owner_avatar);
  }
  return out as T;
}
