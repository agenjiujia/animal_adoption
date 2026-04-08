import { describe, it, expect, afterEach } from "vitest";
import {
  contentTypeFromFileName,
  isAllowedUploadBasename,
  publicUrlForSavedFile,
  rewriteLocalUploadUrlForApi,
} from "@/lib/uploadStorage";

describe("uploadStorage", () => {
  const prev = process.env.UPLOAD_ROOT;

  afterEach(() => {
    if (prev === undefined) delete process.env.UPLOAD_ROOT;
    else process.env.UPLOAD_ROOT = prev;
  });

  it("publicUrlForSavedFile uses API path", () => {
    expect(publicUrlForSavedFile("123-abc9def12.jpg")).toBe(
      "/api/upload/file/123-abc9def12.jpg"
    );
  });

  it("rewriteLocalUploadUrlForApi maps /uploads to API", () => {
    expect(rewriteLocalUploadUrlForApi("/uploads/1712000000000-x7k2m9p1q.jpeg")).toBe(
      "/api/upload/file/1712000000000-x7k2m9p1q.jpeg"
    );
    expect(rewriteLocalUploadUrlForApi("/api/upload/file/x.jpg")).toBe(
      "/api/upload/file/x.jpg"
    );
  });

  it("isAllowedUploadBasename", () => {
    expect(isAllowedUploadBasename("1712000000000-x7k2m9p1q.jpeg")).toBe(true);
    expect(isAllowedUploadBasename("avatar-42-1712000000000.png")).toBe(true);
    expect(isAllowedUploadBasename("../etc/passwd")).toBe(false);
  });

  it("contentTypeFromFileName", () => {
    expect(contentTypeFromFileName("x.png")).toBe("image/png");
    expect(contentTypeFromFileName("x.JPG")).toBe("image/jpeg");
  });
});
