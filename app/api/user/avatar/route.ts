import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import { resolveAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  publicUrlForSavedFile,
  resolveUploadDir,
} from "@/lib/uploadStorage";

export const runtime = "nodejs";

/**
 * 用户头像上传接口
 * POST /api/user/avatar
 */
export async function POST(req: NextRequest) {
  const auth = resolveAuth(req);
  if (!auth.ok) {
    return NextResponse.json(auth.error, { status: 401 });
  }

  const userId = auth.user.userId;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        {
          businessCode: BusinessCodeEnum.ParameterValidationFailed,
          httpCode: HttpCodeEnum.BadRequest,
          message: "未检测到文件",
        },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        {
          businessCode: BusinessCodeEnum.ParameterValidationFailed,
          httpCode: HttpCodeEnum.BadRequest,
          message: "仅支持上传图片文件",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = resolveUploadDir();
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      /* dir exists */
    }

    const ext = file.name.split(".").pop();
    const fileName = `avatar-${userId}-${Date.now()}.${ext}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, buffer);
    const fileUrl = publicUrlForSavedFile(fileName);

    await prisma.user.update({
      where: { user_id: userId },
      data: { avatar: fileUrl },
    });

    return NextResponse.json({
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "头像上传并更新成功",
      data: { url: fileUrl },
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      {
        businessCode: BusinessCodeEnum.InternalServerError,
        httpCode: HttpCodeEnum.ServerError,
        message: "上传失败，系统内部错误",
      },
      { status: 500 }
    );
  }
}
