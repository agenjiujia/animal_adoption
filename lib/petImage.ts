/** 无实拍图时的占位（按物种区分，统一使用本地静态图） */
export const PET_DEFAULT_COVER = {
  cat: "/images/pet-defaults/cat.jpeg",
  dog: "/images/pet-defaults/dog.jpg",
  other: "/images/pet-defaults/other.webp",
} as const;

/** 与默认占位保持同源，避免外链防盗链导致闪烁/裂图 */
export const PET_DEFAULT_COVER_LOCAL = {
  cat: "/images/pet-defaults/cat.jpeg",
  dog: "/images/pet-defaults/dog.jpg",
  other: "/images/pet-defaults/other.webp",
} as const;

function resolveSpeciesKey(species?: string | number | null): "cat" | "dog" | "other" {
  const s = String(species ?? "").trim().toLowerCase();
  if (!s) return "other";
  // 兼容枚举值与文案：1=猫，2=狗，3=其他
  if (s === "1" || s.includes("猫") || s === "cat") return "cat";
  if (s === "2" || s.includes("狗") || s === "dog") return "dog";
  return "other";
}

/**
 * 根据 pet.species（枚举值或文案）选择默认封面路径
 */
export function getDefaultPetCoverBySpecies(
  species?: string | number | null
): string {
  const key = resolveSpeciesKey(species);
  return PET_DEFAULT_COVER[key];
}

export function getLocalDefaultPetCoverBySpecies(
  species?: string | number | null
): string {
  const key = resolveSpeciesKey(species);
  return PET_DEFAULT_COVER_LOCAL[key];
}

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

/**
 * @param species 可选；无有效图片时用于选择猫/狗/其他占位图
 */
export function getPetCoverImage(
  image_urls: unknown,
  species?: string | number | null
): string {
  const first = getPetImageList(image_urls)[0];
  if (first) return first;
  return getDefaultPetCoverBySpecies(species);
}
