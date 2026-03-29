import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withAdminApiHandler } from "@/utils/response/hoc";
import { wrapBusinessResponse } from "@/utils/response/core";
import { BusinessCodeEnum, HttpCodeEnum, UserRoleEnum } from "@/types";
import pool from "@/lib/db";
import { resolveAuth } from "@/lib/auth"; // ✅ 新增：引入当前用户解析

export async function PATCH(
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

  return withAdminApiHandler(async (r) => {
    // ✅ 核心改动1：解析当前登录的管理员信息
    const auth = resolveAuth(r);
    if (!auth.ok) return auth.error;

    let body: { status?: number };
    try {
      body = await r.json();
    } catch {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "JSON 无效",
      };
    }
    const st = Number(body.status);
    if (![0, 1].includes(st)) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "status 须为 0 禁用 / 1 正常",
      };
    }

    // ✅ 核心改动2：禁止管理员禁用自己的账号
    if (
      auth.user?.role === UserRoleEnum.Admin &&
      userId === auth.user?.userId
    ) {
      return {
        businessCode: BusinessCodeEnum.PermissionDenied,
        httpCode: HttpCodeEnum.Forbidden,
        message: "管理员不能禁用自己的账号",
      };
    }

    const [result] = await pool.query(
      "UPDATE user SET status = ? WHERE user_id = ?",
      [st, userId]
    );
    const n = (result as { affectedRows?: number }).affectedRows ?? 0;
    if (n === 0) {
      return {
        businessCode: BusinessCodeEnum.UserNotExist,
        httpCode: HttpCodeEnum.NotFound,
        message: "用户不存在",
      };
    }
    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: st === 1 ? "已启用" : "已禁用",
      data: { user_id: userId, status: st },
    };
  })(req);
}
