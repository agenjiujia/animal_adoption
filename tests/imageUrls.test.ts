import { describe, expect, it } from "vitest";
import { imageUrlsToApiField, normalizeImageUrlsInput } from "@/lib/imageUrls";
import { Prisma } from "@prisma/client";

describe("imageUrls", () => {
  it("normalizes array input to JSON value", () => {
    const v = normalizeImageUrlsInput([" a ", "b"]);
    expect(v).toEqual(["a", "b"]);
    expect(v).not.toBe(Prisma.DbNull);
  });

  it("normalizes comma string", () => {
    const v = normalizeImageUrlsInput("x，y");
    expect(v).toEqual(["x", "y"]);
  });

  it("returns DbNull for empty", () => {
    expect(normalizeImageUrlsInput("")).toBe(Prisma.DbNull);
    expect(normalizeImageUrlsInput(null)).toBe(Prisma.DbNull);
  });

  it("imageUrlsToApiField parses JSON array string", () => {
    expect(imageUrlsToApiField('["a","b"]')).toEqual(["a", "b"]);
  });

  it("imageUrlsToApiField splits legacy comma string", () => {
    expect(imageUrlsToApiField("a,b")).toEqual(["a", "b"]);
  });
});
