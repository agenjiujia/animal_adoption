import { describe, expect, it } from "vitest";
import {
  getPetCoverImage,
  getPetImageList,
  getDefaultPetCoverBySpecies,
  PET_DEFAULT_COVER,
} from "@/lib/petImage";

describe("getPetImageList", () => {
  it("handles string comma list", () => {
    expect(getPetImageList("a,b")).toEqual(["a", "b"]);
  });
  it("handles array from API", () => {
    expect(getPetImageList(["https://x/1.png", "https://x/2.png"])).toEqual([
      "https://x/1.png",
      "https://x/2.png",
    ]);
  });
  it("cover picks first", () => {
    expect(getPetCoverImage(["/a", "/b"])).toBe("/a");
  });
  it("cover falls back by species", () => {
    expect(getPetCoverImage([], "猫")).toBe(PET_DEFAULT_COVER.cat);
    expect(getPetCoverImage([], "狗")).toBe(PET_DEFAULT_COVER.dog);
    expect(getPetCoverImage([], "兔子")).toBe(PET_DEFAULT_COVER.other);
    expect(getDefaultPetCoverBySpecies(null)).toBe(PET_DEFAULT_COVER.other);
  });
});
