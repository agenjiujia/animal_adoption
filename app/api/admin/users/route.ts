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
      message: "JSON 无效",
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
      message: "pageSize 非法",
      data: empty(pageNum, 10),
    };
  }

  const params: unknown[] = [];
  const where: string[] = [];

  if (body.username && String(body.username).trim()) {
    where.push("username LIKE ?");
    params.push(`%${String(body.username).trim()}%`);
  }
  if (body.phone && String(body.phone).trim()) {
    where.push("phone LIKE ?");
    params.push(`%${String(body.phone).trim()}%`);
  }
  if (body.role !== undefined && body.role !== null && body.role !== "") {
    const r = Number(body.role);
    if (![0, 1].includes(r)) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "role 只能 0/1",
        data: empty(pageNum, pageSizeNum),
      };
    }
    where.push("role = ?");
    params.push(r);
  }
  if (body.status !== undefined && body.status !== null && body.status !== "") {
    const s = Number(body.status);
    if (![0, 1].includes(s)) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "status 只能 0/1",
        data: empty(pageNum, pageSizeNum),
      };
    }
    where.push("status = ?");
    params.push(s);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const offset = (pageNum - 1) * pageSizeNum;

  try {
    const [cnt] = await pool.query(
      `SELECT COUNT(*) as total FROM user ${whereSql}`,
      params
    );
    const total = (cnt as { total: number }[])[0]?.total ?? 0;
    const [rows] = await pool.query(
      `SELECT user_id, username, email, phone, avatar, real_name, id_card, address, role, status, create_time, update_time
       FROM user ${whereSql} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...params, pageSizeNum, offset]
    );
    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "ok",
      data: {
        list: rows as unknown[],
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
