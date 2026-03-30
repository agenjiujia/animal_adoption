/**
 * 兼容 API 返回的 JSON 数组与历史逗号分隔字符串
 */
export function getPetImageList(image_urls: unknown): string[] {
  if (image_urls == null || image_urls === "") return [];
  if (Array.isArray(image_urls)) {
    return image_urls.map(String).filter(Boolean);
  }
  if (typeof image_urls === "string") {
    return image_urls
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function getPetCoverImage(image_urls: unknown): string {
  return getPetImageList(image_urls)[0] ?? "";
}
