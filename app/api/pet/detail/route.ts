import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum, PetStatusEnum, UserRoleEnum } from "@/types";
import type { BusinessResponse } from "@/types";
import pool from "@/lib/db";
import { resolveAuth } from "@/lib/auth";

/**
 * 宠物详情：主人 / 管理员可看；普通用户可看「待领养」公开宠物
 */
const getPetDetailHandler = async (
  req: NextRequest
): Promise<BusinessResponse<Record<string, unknown> | null>> => {
  const auth = resolveAuth(req);
  if (!auth.ok) return { ...auth.error, data: null };

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
    const [result] = await pool.query(
      "SELECT * FROM pet WHERE pet_id = ? LIMIT 1",
      [petId]
    );
    if (!result || !(result as unknown[]).length) {
      return {
        businessCode: BusinessCodeEnum.DataNotExist,
        httpCode: HttpCodeEnum.NotFound,
        message: "宠物不存在",
        data: null,
      };
    }
    const row = (result as Record<string, unknown>[])[0];
    const ownerId = Number(row.user_id);
    const isAdmin = auth.user.role === UserRoleEnum.Admin;
    const canView =
      isAdmin ||
      ownerId === auth.user.userId ||
      Number(row.status) === PetStatusEnum.ForAdoption;

    if (!canView) {
      return {
        businessCode: BusinessCodeEnum.DataPermissionDenied,
        httpCode: HttpCodeEnum.Forbidden,
        message: "无权查看该宠物",
        data: null,
      };
    }

    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "查询成功",
      data: row,
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
