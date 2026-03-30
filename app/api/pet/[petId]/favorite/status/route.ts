import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import prisma from "@/lib/db";
import { resolveAuth } from "@/lib/auth";

/**
 * 查询收藏状态
 * GET /api/pet/[petId]/favorite/status
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const auth = resolveAuth(req);
  if (!auth.ok) return auth.error;

  const url = new URL(req.url);
  const petIdStr = url.pathname.split("/")[3];
  const petId = Number(petIdStr);

  if (!petId) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "无效的宠物ID",
    };
  }

  const userId = auth.user.userId;

  const fav = await prisma.petFavorite.findUnique({
    where: {
      user_id_pet_id: { user_id: userId, pet_id: petId },
    },
    select: { favorite_id: true },
  });

  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Success,
    message: "查询成功",
    data: { is_favorited: !!fav },
  };
});
