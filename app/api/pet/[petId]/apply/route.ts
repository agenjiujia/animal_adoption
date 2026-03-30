import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import prisma from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import { mapAdoptionApplyPrismaError } from "@/lib/prisma-errors";

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

  try {
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
      select: { apply_id: true, status: true },
    });

    if (existing) {
      if (existing.status === 0) {
        return {
          businessCode: BusinessCodeEnum.DataAlreadyExist,
          httpCode: HttpCodeEnum.Conflict,
          message: "您已提交过该宠物的领养申请，请耐心等待审核",
        };
      }
      if (existing.status === 1) {
        return {
          businessCode: BusinessCodeEnum.DataAlreadyExist,
          httpCode: HttpCodeEnum.Conflict,
          message: "该宠物对您的领养申请已通过，无需重复提交",
        };
      }
      // status === 2 管理员已拒绝：宠物仍待领养时可重新发起申请（复用同一行避免唯一约束冲突）
      await prisma.adoptionApply.update({
        where: { apply_id: existing.apply_id },
        data: {
          status: 0,
          pet_user_id: pet.user_id,
          apply_message: body.message || "",
          review_admin_id: null,
          review_message: null,
          review_time: null,
          is_read: 0,
          is_admin_read: 0,
        },
      });
      return {
        businessCode: BusinessCodeEnum.Success,
        httpCode: HttpCodeEnum.Success,
        message: "申请提交成功，请等待审核",
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
  } catch (e) {
    return mapAdoptionApplyPrismaError(e, "POST /api/pet/[petId]/apply");
  }
});
