import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withAdminApiHandler } from "@/utils/response/hoc";
import { wrapBusinessResponse } from "@/utils/response/core";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import pool from "@/lib/db";

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
    const [rows] = await pool.query(
      `SELECT user_id, username, email, phone, avatar, real_name, id_card, address, role, status, create_time, update_time
       FROM user WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    const list = rows as Record<string, unknown>[];
    if (!list?.length) {
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
      data: list[0],
    };
  })(req);
}
