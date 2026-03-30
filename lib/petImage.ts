/** 无实拍图时的占位（按物种区分） */
export const PET_DEFAULT_COVER = {
  cat: "https://img1.baidu.com/it/u=2374394341,3989655181&fm=253&app=138&f=JPEG?w=800&h=1200",
  dog: "https://lmg.jj20.com/up/allimg/tp09/2105211124442R9-0-lp.jpg",
  /** 其他 / 未识别 — 动物剪影合影风格 */
  other:
    "https://pics5.baidu.com/feed/a71ea8d3fd1f4134a9c50d1345f34cdad3c85eed.jpeg@f_auto?token=fdeccf1f99667d955e2dff91ed7f08d6",
} as const;

/** 外链失败时的本地兜底图 */
export const PET_DEFAULT_COVER_LOCAL = {
  cat: "/images/pet-defaults/cat.svg",
  dog: "/images/pet-defaults/dog.svg",
  other: "/images/pet-defaults/other.svg",
} as const;

/**
 * 根据 pet.species 文案（如「猫」「狗」「其他」）选择默认封面路径
 */
export function getDefaultPetCoverBySpecies(species?: string | null): string {
  const s = String(species ?? "").trim().toLowerCase();
  if (!s) return PET_DEFAULT_COVER.other;
  if (s.includes("猫") || s === "cat") return PET_DEFAULT_COVER.cat;
  if (s.includes("狗") || s === "dog") return PET_DEFAULT_COVER.dog;
  return PET_DEFAULT_COVER.other;
}

export function getLocalDefaultPetCoverBySpecies(
  species?: string | null
): string {
  const s = String(species ?? "").trim().toLowerCase();
  if (!s) return PET_DEFAULT_COVER_LOCAL.other;
  if (s.includes("猫") || s === "cat") return PET_DEFAULT_COVER_LOCAL.cat;
  if (s.includes("狗") || s === "dog") return PET_DEFAULT_COVER_LOCAL.dog;
  return PET_DEFAULT_COVER_LOCAL.other;
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
  species?: string | null
): string {
  const first = getPetImageList(image_urls)[0];
  if (first) return first;
  return getDefaultPetCoverBySpecies(species);
}
