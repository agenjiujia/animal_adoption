import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { withAdminApiHandler } from "@/utils/response/hoc";
import {
  BusinessCodeEnum,
  HttpCodeEnum,
  PetOperateTypeEnum,
} from "@/types";
import prisma, { withTransaction } from "@/lib/db";

/**
 * 管理员审核领养申请
 * PATCH /api/admin/adoption/[applyId]/review
 */
export const PATCH = withAdminApiHandler(async (req: NextRequest, authUser) => {
  const url = new URL(req.url);
  const applyIdStr = url.pathname.split("/")[4];
  const applyId = Number(applyIdStr);

  if (!applyId) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "无效的申请ID",
    };
  }

  let body: { status: number; message?: string } = { status: 0 };
  try {
    body = await req.json();
  } catch (e) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请求体须为 JSON",
    };
  }

  const { status, message } = body;
  if (status !== 1 && status !== 2) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "无效的审核状态",
    };
  }

  const reviewMessage = message != null ? String(message).trim() : "";
  if (!reviewMessage) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请填写审核意见 review_message",
    };
  }

  const apply = await prisma.adoptionApply.findUnique({
    where: { apply_id: applyId },
    select: { apply_id: true, pet_id: true, status: true },
  });

  if (!apply) {
    return {
      businessCode: BusinessCodeEnum.DataNotExist,
      httpCode: HttpCodeEnum.NotFound,
      message: "申请记录不存在",
    };
  }

  if (apply.status !== 0) {
    return {
      businessCode: BusinessCodeEnum.PermissionDenied,
      httpCode: HttpCodeEnum.Forbidden,
      message: "该申请已审核过",
    };
  }

  try {
    await withTransaction(async (tx) => {
      await tx.adoptionApply.update({
        where: { apply_id: applyId },
        data: {
          status,
          review_admin_id: authUser.userId,
          review_message: reviewMessage,
          review_time: new Date(),
        },
      });

      if (status === 1) {
        const oldPet = await tx.pet.findUnique({
          where: { pet_id: apply.pet_id },
        });
        if (!oldPet) throw new Error("NF");
        await tx.pet.update({
          where: { pet_id: apply.pet_id },
          data: { status: 1 },
        });
        await tx.petHistory.create({
          data: {
            pet_id: apply.pet_id,
            old_data: JSON.parse(JSON.stringify(oldPet)) as Prisma.InputJsonValue,
            new_data: { status: 1 },
            operator_id: authUser.userId,
            operate_type: PetOperateTypeEnum.STATUS_CHANGE,
          },
        });
      }
    });

    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message:
        status === 1
          ? "审核已通过，宠物状态已更新为已领养"
          : "已拒绝该领养申请",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "NF") {
      return {
        businessCode: BusinessCodeEnum.DataNotExist,
        httpCode: HttpCodeEnum.NotFound,
        message: "宠物不存在",
      };
    }
    console.error("Admin review apply error:", error);
    return {
      businessCode: BusinessCodeEnum.InternalServerError,
      httpCode: HttpCodeEnum.ServerError,
      message: "系统内部错误，审核失败",
    };
  }
});
