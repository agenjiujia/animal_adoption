import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import { wrapBusinessResponse } from "@/utils/response/core";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import prisma from "@/lib/db";
import { resolveAuth } from "@/lib/auth";

/**
 * 删除宠物发布单：仅发布者；存在未结案申请(status=0)时禁止删除
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

    const pet = await prisma.pet.findUnique({
      where: { pet_id: petId },
      select: { pet_id: true, user_id: true },
    });
    if (!pet) {
      return {
        businessCode: BusinessCodeEnum.DataNotExist,
        httpCode: HttpCodeEnum.NotFound,
        message: "宠物不存在",
      };
    }
    if (pet.user_id !== auth.user.userId) {
      return {
        businessCode: BusinessCodeEnum.DataPermissionDenied,
        httpCode: HttpCodeEnum.Forbidden,
        message: "仅可删除本人发布的宠物",
      };
    }

    const pending = await prisma.adoptionApply.count({
      where: { pet_id: petId, status: 0 },
    });
    if (pending > 0) {
      return {
        businessCode: BusinessCodeEnum.PermissionDenied,
        httpCode: HttpCodeEnum.Forbidden,
        message: "该宠物存在待审核的领养申请，暂不可删除",
      };
    }

    try {
      await prisma.pet.delete({ where: { pet_id: petId } });
    } catch (e) {
      console.error(e);
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
