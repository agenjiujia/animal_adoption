import type { NextRequest } from "next/server";
import { withAdminPaginationApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import type { BusinessPaginationResponse } from "@/types";
import pool from "@/lib/db";

const empty = (pageNum: number, pageSize: number) => ({
  list: [] as unknown[],
  total: 0,
  pageNum,
  pageSize,
});

async function handler(
  req: NextRequest
): Promise<BusinessPaginationResponse<unknown>> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请求体须为 JSON",
      data: empty(1, 10),
    };
  }

  const pageNum = Number(body.pageNum ?? body.page ?? 1);
  const pageSizeNum = Number(body.pageSize ?? 10);

  if (!Number.isInteger(pageNum) || pageNum < 1) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "pageNum 非法",
      data: empty(1, pageSizeNum),
    };
  }
  if (
    !Number.isInteger(pageSizeNum) ||
    pageSizeNum < 1 ||
    pageSizeNum > 100
  ) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "pageSize 须为 1-100",
      data: empty(pageNum, 10),
    };
  }

  const params: unknown[] = [];
  const where: string[] = [];

  if (body.pet_id !== undefined && body.pet_id !== null && body.pet_id !== "") {
    const id = Number(body.pet_id);
    if (id < 1) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "pet_id 非法",
        data: empty(pageNum, pageSizeNum),
      };
    }
    where.push("pet_id = ?");
    params.push(id);
  }
  if (body.user_id !== undefined && body.user_id !== null && body.user_id !== "") {
    const uid = Number(body.user_id);
    if (uid < 1) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "user_id 非法",
        data: empty(pageNum, pageSizeNum),
      };
    }
    where.push("user_id = ?");
    params.push(uid);
  }
  if (body.name && String(body.name).trim()) {
    where.push("name LIKE ?");
    params.push(`%${String(body.name).trim()}%`);
  }
  if (body.species && String(body.species).trim()) {
    where.push("species LIKE ?");
    params.push(`%${String(body.species).trim()}%`);
  }
  if (body.status !== undefined && body.status !== null && body.status !== "") {
    const st = Number(body.status);
    if (![0, 1, 2].includes(st)) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "status 只能 0/1/2",
        data: empty(pageNum, pageSizeNum),
      };
    }
    where.push("status = ?");
    params.push(st);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const offset = (pageNum - 1) * pageSizeNum;

  try {
    const [cnt] = await pool.query(
      `SELECT COUNT(*) as total FROM pet ${whereSql}`,
      params
    );
    const total = (cnt as { total: number }[])[0]?.total ?? 0;
    const [list] = await pool.query(
      `SELECT * FROM pet ${whereSql} ORDER BY update_time DESC LIMIT ? OFFSET ?`,
      [...params, pageSizeNum, offset]
    );
    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "ok",
      data: {
        list: list as unknown[],
        total,
        pageNum,
        pageSize: pageSizeNum,
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
}

export const POST = withAdminPaginationApiHandler(async (req) => handler(req));
