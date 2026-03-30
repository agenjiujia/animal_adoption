import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { withAdminPaginationApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import type { BusinessPaginationResponse } from "@/types";
import prisma from "@/lib/db";

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

  const where: Prisma.UserWhereInput = {};

  if (body.username && String(body.username).trim()) {
    where.username = { contains: String(body.username).trim() };
  }
  if (body.phone && String(body.phone).trim()) {
    where.phone = { contains: String(body.phone).trim() };
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
    where.role = r;
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
    where.status = s;
  }

  const offset = (pageNum - 1) * pageSizeNum;

  try {
    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          user_id: true,
          username: true,
          email: true,
          phone: true,
          avatar: true,
          real_name: true,
          id_card: true,
          address: true,
          role: true,
          status: true,
          create_time: true,
          update_time: true,
        },
        orderBy: { create_time: "desc" },
        skip: offset,
        take: pageSizeNum,
      }),
    ]);
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
