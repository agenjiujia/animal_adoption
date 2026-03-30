import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withAdminApiHandler } from "@/utils/response/hoc";
import { wrapBusinessResponse } from "@/utils/response/core";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> }
) {
  const { userId: raw } = await ctx.params;
  const userId = Number(raw);
  if (!Number.isInteger(userId) || userId < 1) {
    const api = wrapBusinessResponse({
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "userId 非法",
    });
    return NextResponse.json(api, { status: Number(api.httpCode) });
  }

  return withAdminApiHandler(async () => {
    const row = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        username: true,
        email: true,
        phone: true,
        avatar: true,
        real_name: true,
        id_card: true,
        address: true,
        role: true,
        status: true,
        create_time: true,
        update_time: true,
      },
    });
    if (!row) {
      return {
        businessCode: BusinessCodeEnum.UserNotExist,
        httpCode: HttpCodeEnum.NotFound,
        message: "用户不存在",
      };
    }
    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "ok",
      data: row,
    };
  })(req);
}
