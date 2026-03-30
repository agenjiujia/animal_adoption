import { NextRequest, NextResponse } from "next/server";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import prisma from "@/lib/db";
import { resolveAuth } from "@/lib/auth";

/**
 * 发布者标记“待审批通知”为已读
 * POST /api/adoption/owner/mark-read
 */
export async function POST(req: NextRequest) {
  const auth = resolveAuth(req);
  if (!auth.ok) return NextResponse.json(auth.error, { status: 401 });

  let body: { app_ids?: number[] } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const appIds = Array.isArray(body.app_ids)
    ? body.app_ids.map((n) => Number(n)).filter(Boolean)
    : [];

  if (appIds.length === 0) {
    return NextResponse.json(
      {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "app_ids 不能为空",
      },
      { status: 400 }
    );
  }

  try {
    await prisma.adoptionApply.updateMany({
      where: {
        apply_id: { in: appIds },
        pet_user_id: auth.user.userId,
      },
      data: {
        is_admin_read: 1,
      },
    });

    return NextResponse.json({
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "标记已读成功",
    });
  } catch (error) {
    console.error("Owner mark-read error:", error);
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

