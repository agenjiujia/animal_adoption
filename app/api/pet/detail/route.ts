import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import {
  BusinessCodeEnum,
  HttpCodeEnum,
  PetStatusEnum,
  UserRoleEnum,
} from "@/types";
import type { BusinessResponse } from "@/types";
import prisma from "@/lib/db";
import { resolveAuthOptional } from "@/lib/auth";
import { serializePetForApi } from "@/lib/petSerialize";

/**
 * 宠物详情：未登录仅可看待领养；登录用户按角色/归属扩展可见范围
 */
const getPetDetailHandler = async (
  req: NextRequest
): Promise<BusinessResponse<Record<string, unknown> | null>> => {
  const authUser = resolveAuthOptional(req);

  const petIdStr = req.nextUrl.searchParams.get("pet_id");
  if (!petIdStr) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "缺少 pet_id",
      data: null,
    };
  }
  const petId = Number(petIdStr);
  if (!Number.isInteger(petId) || petId < 1) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "pet_id 非法",
      data: null,
    };
  }

  try {
    const row = await prisma.pet.findFirst({
      where: { pet_id: petId },
      include: {
        publisher: {
          select: { username: true, avatar: true, user_id: true },
        },
      },
    });
    if (!row) {
      return {
        businessCode: BusinessCodeEnum.DataNotExist,
        httpCode: HttpCodeEnum.NotFound,
        message: "宠物不存在",
        data: null,
      };
    }

    const ownerId = row.user_id;
    const isAdmin = authUser?.role === UserRoleEnum.Admin;
    const canView =
      Number(row.status) === PetStatusEnum.ForAdoption ||
      (!!authUser && (isAdmin || ownerId === authUser.userId));

    if (!canView) {
      return {
        businessCode: BusinessCodeEnum.DataPermissionDenied,
        httpCode: HttpCodeEnum.Forbidden,
        message: "无权查看该宠物",
        data: null,
      };
    }

    const { publisher, ...petRest } = row;
    const out = serializePetForApi({
      ...petRest,
      owner_name: publisher?.username,
      owner_avatar: publisher?.avatar,
    } as Record<string, unknown>);

    if (authUser) {
      out.is_favorited = 0;
      out.is_applied = 0;
      try {
        const fav = await prisma.petFavorite.findFirst({
          where: { user_id: authUser.userId, pet_id: petId },
          select: { favorite_id: true },
        });
        out.is_favorited = fav ? 1 : 0;
      } catch (e) {
        console.error("pet/detail: skip favorite status", e);
      }
      try {
        // 仅「待审核」算已申请；已拒绝/已通过仍有一条记录，但不应禁用再次申请或显示为审核中
        const app = await prisma.adoptionApply.findFirst({
          where: {
            apply_user_id: authUser.userId,
            pet_id: petId,
            status: 0,
          },
          select: { apply_id: true },
        });
        out.is_applied = app ? 1 : 0;
      } catch (e) {
        console.error("pet/detail: skip apply status", e);
      }
    }

    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "查询成功",
      data: out,
    };
  } catch (e) {
    console.error(e);
    return {
      businessCode: BusinessCodeEnum.InternalServerError,
      httpCode: HttpCodeEnum.ServerError,
      message: "查询失败",
      data: null,
    };
  }
};

export const GET = withApiHandler(getPetDetailHandler);
