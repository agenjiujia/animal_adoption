import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import { wrapBusinessResponse } from "@/utils/response/core";
import { BusinessCodeEnum, HttpCodeEnum, UserRoleEnum } from "@/types";
import pool from "@/lib/db";
import { resolveAuth } from "@/lib/auth";

/**
 * 删除宠物发布单：发布者可删自己的单；管理员可删任意单
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ petId: string }> }
) {
  const { petId: idStr } = await ctx.params;
  const petId = Number(idStr);
  if (!petId || petId < 1 || !Number.isInteger(petId)) {
    const apiRes = wrapBusinessResponse({
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "无效的宠物 ID",
    });
    return NextResponse.json(apiRes, { status: Number(apiRes.httpCode) });
  }

  const run = withApiHandler(async (r: NextRequest) => {
    const auth = resolveAuth(r);
    if (!auth.ok) return auth.error;

    const [rows] = await pool.query(
      "SELECT pet_id, user_id FROM pet WHERE pet_id = ? LIMIT 1",
      [petId]
    );
    const list = rows as { pet_id: number; user_id: number }[];
    if (!list?.length) {
      return {
        businessCode: BusinessCodeEnum.DataNotExist,
        httpCode: HttpCodeEnum.NotFound,
        message: "宠物不存在",
      };
    }
    const ownerId = list[0].user_id;
    const isAdmin = auth.user.role === UserRoleEnum.Admin;
    if (!isAdmin && ownerId !== auth.user.userId) {
      return {
        businessCode: BusinessCodeEnum.DataPermissionDenied,
        httpCode: HttpCodeEnum.Forbidden,
        message: "仅可删除自己发布的宠物",
      };
    }

    const [result] = await pool.query("DELETE FROM pet WHERE pet_id = ?", [
      petId,
    ]);
    const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
    if (affected === 0) {
      return {
        businessCode: BusinessCodeEnum.DataDeleteFailed,
        httpCode: HttpCodeEnum.ServerError,
        message: "删除失败",
      };
    }
    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "已删除",
      data: { pet_id: petId },
    };
  });

  return run(req);
}
