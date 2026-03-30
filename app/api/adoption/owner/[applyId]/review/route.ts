import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import {
  BusinessCodeEnum,
  HttpCodeEnum,
  PetOperateTypeEnum,
} from "@/types";
import prisma, { withTransaction } from "@/lib/db";
import { resolveAuth } from "@/lib/auth";

const AUTO_REJECT_MESSAGE =
  "该宠物宝宝已经被其他人领养啦，所以很抱歉你的申请被拒绝。";

/**
 * 发布者审核领养申请（仅允许发布者处理自己的待审核申请）
 * PATCH /api/adoption/owner/[applyId]/review
 */
export const PATCH = withApiHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  // /api/adoption/owner/[applyId]/review
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
  } catch {
    /* ignore */
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

  const auth = resolveAuth(req);
  if (!auth.ok) return auth.error;

  const apply = await prisma.adoptionApply.findUnique({
    where: { apply_id: applyId },
    select: { apply_id: true, pet_id: true, pet_user_id: true, status: true },
  });

  if (!apply) {
    return {
      businessCode: BusinessCodeEnum.DataNotExist,
      httpCode: HttpCodeEnum.NotFound,
      message: "申请记录不存在",
    };
  }

  if (apply.pet_user_id !== auth.user.userId) {
    return {
      businessCode: BusinessCodeEnum.PermissionDenied,
      httpCode: HttpCodeEnum.Forbidden,
      message: "无权审核该申请",
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
      const now = new Date();

      await tx.adoptionApply.update({
        where: { apply_id: applyId },
        data: {
          status,
          review_admin_id: auth.user.userId, // 复用字段：记录“审核人”
          review_message: reviewMessage,
          review_time: now,
          is_admin_read: 1, // 视为发布者已读/已处理
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
            operator_id: auth.user.userId,
            operate_type: PetOperateTypeEnum.STATUS_CHANGE,
          },
        });

        // 同一只宠物：如果发布者已通过其中一份申请，其它待审核申请全部拒绝
        await tx.adoptionApply.updateMany({
          where: {
            pet_id: apply.pet_id,
            status: 0,
            apply_id: { not: applyId },
          },
          data: {
            status: 2,
            review_admin_id: auth.user.userId,
            review_message: AUTO_REJECT_MESSAGE,
            review_time: now,
            is_admin_read: 1,
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

    console.error("Owner review apply error:", error);
    return {
      businessCode: BusinessCodeEnum.InternalServerError,
      httpCode: HttpCodeEnum.ServerError,
      message: "系统内部错误，审核失败",
    };
  }
});

