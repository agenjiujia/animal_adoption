import { NextRequest } from "next/server";
import { withPaginationApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import type { BusinessPaginationResponse } from "@/types";
import pool from "@/lib/db";
import { resolveAuth } from "@/lib/auth";

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

  const sqlParams: unknown[] = [];
  const whereConditions: string[] = [];

  // ✅ 核心改动：所有用户统一只看自己的记录，删除管理员逻辑
  whereConditions.push("user_id = ?");
  sqlParams.push(auth.user.userId);

  // ✅ 已删除：管理员专属的 user_id 筛选逻辑

  const numericFields = [
    "pet_id",
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
      whereConditions.push(`${field} = ?`);
      sqlParams.push(numValue);
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
    whereConditions.push("weight = ?");
    sqlParams.push(weightNum);
  }

  for (const field of ["name", "species", "breed"] as const) {
    const value = requestData[field];
    if (value !== undefined && value !== null) {
      const strValue = String(value).trim();
      if (strValue) {
        whereConditions.push(`${field} LIKE ?`);
        sqlParams.push(`%${strValue}%`);
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
    let countSql = "SELECT COUNT(*) as total FROM pet";
    if (whereConditions.length > 0) {
      countSql += ` WHERE ${whereConditions.join(" AND ")}`;
    }
    const [countResult] = await pool.query(countSql, sqlParams);
    const total = (countResult as { total: number }[])[0]?.total || 0;

    let listSql = "SELECT * FROM pet";
    if (whereConditions.length > 0) {
      listSql += ` WHERE ${whereConditions.join(" AND ")}`;
    }
    listSql += " ORDER BY update_time DESC LIMIT ? OFFSET ?";
    const [listResult] = await pool.query(listSql, [
      ...sqlParams,
      pageSizeNum,
      offset,
    ]);

    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "查询成功",
      data: {
        list: listResult as unknown[],
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
