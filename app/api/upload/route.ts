import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import { resolveAuth } from "@/lib/auth";

// 强制为 Node.js 运行时
export const runtime = "nodejs";

/**
 * 通用图片上传接口
 */
export async function POST(req: NextRequest) {
  // 优先尝试校验登录态
  const auth = resolveAuth(req);

  // 如果未登录，则检查是否为注册页面的上传
  if (!auth.ok) {
    const referer = req.headers.get("referer") || "";
    const isRegister = referer.includes("/register");

    if (!isRegister) {
      return NextResponse.json(auth.error, { status: 401 });
    }
  }

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

    // 校验文件类型
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

    // 读取文件内容
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 确保上传目录存在
    const uploadDir = join(process.cwd(), "public", "uploads");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // 目录已存在
    }

    // 生成唯一文件名 (时间戳 + 随机数)
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}.${ext}`;
    const filePath = join(uploadDir, fileName);

    // 写入文件
    await writeFile(filePath, buffer);

    // 返回文件可访问的 URL
    const fileUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "上传成功",
      data: {
        url: fileUrl,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
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
