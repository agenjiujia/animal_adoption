import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import prisma from "@/lib/db";
import { resolveAuth } from "@/lib/auth";

/**
 * 提交领养申请
 * POST /api/pet/[petId]/apply
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

  let body: { message?: string } = {};
  try {
    body = await req.json();
  } catch (e) {
    /* ignore */
  }

  const userId = auth.user.userId;

  const pet = await prisma.pet.findUnique({
    where: { pet_id: petId },
    select: { pet_id: true, user_id: true, status: true },
  });

  if (!pet) {
    return {
      businessCode: BusinessCodeEnum.DataNotExist,
      httpCode: HttpCodeEnum.NotFound,
      message: "宠物不存在",
    };
  }

  if (pet.status !== 0) {
    return {
      businessCode: BusinessCodeEnum.PermissionDenied,
      httpCode: HttpCodeEnum.Forbidden,
      message: "该宠物目前不可领养",
    };
  }

  if (pet.user_id === userId) {
    return {
      businessCode: BusinessCodeEnum.PermissionDenied,
      httpCode: HttpCodeEnum.Forbidden,
      message: "您不能领养自己发布的宠物",
    };
  }

  const existing = await prisma.adoptionApply.findUnique({
    where: {
      pet_id_apply_user_id: { pet_id: petId, apply_user_id: userId },
    },
    select: { apply_id: true },
  });

  if (existing) {
    return {
      businessCode: BusinessCodeEnum.DataAlreadyExist,
      httpCode: HttpCodeEnum.Conflict,
      message: "您已提交过该宠物的领养申请，请勿重复操作",
    };
  }

  await prisma.adoptionApply.create({
    data: {
      pet_id: petId,
      apply_user_id: userId,
      pet_user_id: pet.user_id,
      apply_message: body.message || "",
      status: 0,
    },
  });

  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Success,
    message: "申请提交成功，请等待审核",
  };
});
