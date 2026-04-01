import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { withPaginationApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import type { BusinessPaginationResponse } from "@/types";
import prisma from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import { serializePetForApi } from "@/lib/petSerialize";

const empty = (pageNum: number, pageSize: number) => ({
  list: [] as unknown[],
  total: 0,
  pageNum,
  pageSize,
});

/**
 * 宠物分页列表（仅看自己发布的记录）
 */
const getPetListHandler = async (
  req: NextRequest
): Promise<BusinessPaginationResponse<unknown>> => {
  const auth = resolveAuth(req);
  if (!auth.ok) {
    return { ...auth.error, data: empty(1, 10) };
  }

  let requestData: Record<string, unknown>;
  try {
    requestData = await req.json();
  } catch {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请求体须为 JSON",
      data: empty(1, 10),
    };
  }

  const pageNum = Number(requestData.pageNum ?? requestData.page ?? 1);
  const pageSizeNum = Number(requestData.pageSize ?? 10);

  const where: Prisma.PetWhereInput = {
    user_id: auth.user.userId,
  };

  const numericFields = [
    "pet_id",
    "species",
    "age",
    "gender",
    "vaccine_status",
    "neutered",
    "status",
  ] as const;
  for (const field of numericFields) {
    const value = requestData[field];
    if (value !== undefined && value !== null && value !== "") {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) {
        return {
          businessCode: BusinessCodeEnum.ParameterValidationFailed,
          httpCode: HttpCodeEnum.BadRequest,
          message: `${field}必须为非负数字`,
          data: empty(pageNum, pageSizeNum),
        };
      }
      const valid: Record<string, number[]> = {
        species: [1, 2, 3],
        gender: [0, 1],
        vaccine_status: [0, 1, 2],
        neutered: [0, 1, 2],
        status: [0, 1, 2],
      };
      if (valid[field] && !valid[field].includes(numValue)) {
        return {
          businessCode: BusinessCodeEnum.ParameterValidationFailed,
          httpCode: HttpCodeEnum.BadRequest,
          message: `${field}取值非法`,
          data: empty(pageNum, pageSizeNum),
        };
      }
      if (["pet_id", "age"].includes(field) && !Number.isInteger(numValue)) {
        return {
          businessCode: BusinessCodeEnum.ParameterValidationFailed,
          httpCode: HttpCodeEnum.BadRequest,
          message: `${field}须为非负整数`,
          data: empty(pageNum, pageSizeNum),
        };
      }
      (where as Record<string, number>)[field] = numValue;
    }
  }

  if (
    requestData.weight !== undefined &&
    requestData.weight !== null &&
    requestData.weight !== ""
  ) {
    const weightNum = Number(requestData.weight);
    if (isNaN(weightNum) || weightNum < 0 || weightNum > 999.99) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "weight范围非法",
        data: empty(pageNum, pageSizeNum),
      };
    }
    where.weight = weightNum;
  }

  for (const field of ["name", "breed"] as const) {
    const value = requestData[field];
    if (value !== undefined && value !== null) {
      const strValue = String(value).trim();
      if (strValue) {
        (where as Record<string, Prisma.StringFilter>)[field] = {
          contains: strValue,
        };
      }
    }
  }

  if (isNaN(pageNum) || pageNum < 1 || !Number.isInteger(pageNum)) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "pageNum须为正整数",
      data: empty(1, pageSizeNum),
    };
  }
  if (
    isNaN(pageSizeNum) ||
    pageSizeNum < 1 ||
    pageSizeNum > 100 ||
    !Number.isInteger(pageSizeNum)
  ) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "pageSize须为1-100的正整数",
      data: empty(pageNum, 10),
    };
  }

  const offset = (pageNum - 1) * pageSizeNum;

  try {
    const [total, listResult] = await Promise.all([
      prisma.pet.count({ where }),
      prisma.pet.findMany({
        where,
        orderBy: { update_time: "desc" },
        skip: offset,
        take: pageSizeNum,
      }),
    ]);

    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "查询成功",
      data: {
        list: listResult.map((r) =>
          serializePetForApi(r as unknown as Record<string, unknown>)
        ),
        pageNum,
        pageSize: pageSizeNum,
        total,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      businessCode: BusinessCodeEnum.InternalServerError,
      httpCode: HttpCodeEnum.ServerError,
      message: "查询失败",
      data: empty(pageNum, pageSizeNum),
    };
  }
};

export const POST = withPaginationApiHandler(getPetListHandler);
