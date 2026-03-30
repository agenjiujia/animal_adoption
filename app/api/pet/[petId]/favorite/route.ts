import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import prisma from "@/lib/db";
import { resolveAuth } from "@/lib/auth";

/**
 * 切换收藏状态（收藏/取消收藏）
 * POST /api/pet/[petId]/favorite
 */
export const POST = withApiHandler(async (req: NextRequest) => {
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

  const existsPet = await prisma.pet.findUnique({
    where: { pet_id: petId },
    select: { pet_id: true },
  });
  if (!existsPet) {
    return {
      businessCode: BusinessCodeEnum.DataNotExist,
      httpCode: HttpCodeEnum.NotFound,
      message: "宠物不存在",
    };
  }

  const fav = await prisma.petFavorite.findUnique({
    where: {
      user_id_pet_id: { user_id: userId, pet_id: petId },
    },
  });

  if (fav) {
    await prisma.petFavorite.delete({
      where: { favorite_id: fav.favorite_id },
    });
    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "取消收藏成功",
      data: { is_favorited: false },
    };
  }

  await prisma.petFavorite.create({
    data: { user_id: userId, pet_id: petId },
  });
  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Success,
    message: "收藏成功",
    data: { is_favorited: true },
  };
});
