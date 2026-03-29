import { NextRequest, NextResponse } from "next/server";
import { BusinessCodeEnum, HttpCodeEnum, UserRoleEnum } from "@/types";
import pool from "@/lib/db";
import { resolveAuth } from "@/lib/auth";

/**
 * 管理员将新申请通知标记为已读
 */
export async function POST(req: NextRequest) {
  const auth = resolveAuth(req);
  if (!auth.ok || auth.user.role !== UserRoleEnum.Admin) {
    return NextResponse.json(
      {
        businessCode: BusinessCodeEnum.AdminPermissionDenied,
        httpCode: HttpCodeEnum.Forbidden,
        message: "无权访问",
      },
      { status: 403 }
    );
  }

  let body: { app_ids: number[] };
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "请求体须为 JSON",
      },
      { status: 400 }
    );
  }

  const { app_ids } = body;
  if (!app_ids || !Array.isArray(app_ids) || app_ids.length === 0) {
    return NextResponse.json({
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "无需处理",
    });
  }

  try {
    await pool.query(
      "UPDATE adoption_application SET is_admin_read = 1 WHERE app_id IN (?)",
      [app_ids]
    );

    return NextResponse.json({
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "标记已读成功",
    });
  } catch (error) {
    console.error("Admin mark read error:", error);
    return NextResponse.json(
      {
        businessCode: BusinessCodeEnum.InternalServerError,
        httpCode: HttpCodeEnum.ServerError,
        message: "系统内部错误",
      },
      { status: 500 }
    );
  }
}
