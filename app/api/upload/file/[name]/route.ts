import { readFile } from "fs/promises";
import { join, relative, resolve } from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  contentTypeFromFileName,
  isAllowedUploadBasename,
  resolveUploadDir,
} from "@/lib/uploadStorage";

export const runtime = "nodejs";

/**
 * 读取上传目录中的图片（宠物图、头像等），匿名可访问。
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ name: string }> }
) {
  const { name: raw } = await ctx.params;
  const decoded = decodeURIComponent(raw);

  if (!isAllowedUploadBasename(decoded)) {
    return new NextResponse(null, { status: 400 });
  }

  const base = resolve(resolveUploadDir());
  const filePath = resolve(join(base, decoded));
  const rel = relative(base, filePath);
  if (rel.startsWith("..") || rel === "") {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentTypeFromFileName(decoded),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
