import { describe, expect, it } from "vitest";
import { getPetCoverImage, getPetImageList } from "@/lib/petImage";

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
});
