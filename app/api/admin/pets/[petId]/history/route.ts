import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withAdminApiHandler } from "@/utils/response/hoc";
import { wrapBusinessResponse } from "@/utils/response/core";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ petId: string }> }
) {
  const { petId: raw } = await ctx.params;
  const petId = Number(raw);
  if (!Number.isInteger(petId) || petId < 1) {
    const api = wrapBusinessResponse({
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "petId 非法",
    });
    return NextResponse.json(api, { status: Number(api.httpCode) });
  }

  const pageNum = Number(req.nextUrl.searchParams.get("pageNum") ?? 1);
  const pageSize = Number(req.nextUrl.searchParams.get("pageSize") ?? 20);

  return withAdminApiHandler(async () => {
    try {
      const total = await prisma.petHistory.count({ where: { pet_id: petId } });
      const offset = (pageNum - 1) * pageSize;
      const list = await prisma.petHistory.findMany({
        where: { pet_id: petId },
        orderBy: [{ operate_time: "desc" }, { id: "desc" }],
        skip: offset,
        take: pageSize,
      });
      const parsed = list.map((row) => ({
        ...row,
        old_data: normalizeJson(row.old_data),
        new_data: normalizeJson(row.new_data),
      }));
      return {
        businessCode: BusinessCodeEnum.Success,
        httpCode: HttpCodeEnum.Success,
        message: "ok",
        data: {
          list: parsed,
          total,
          pageNum,
          pageSize,
        },
      };
    } catch (e) {
      console.error(e);
      return {
        businessCode: BusinessCodeEnum.InternalServerError,
        httpCode: HttpCodeEnum.ServerError,
        message: "查询失败",
        data: { list: [], total: 0, pageNum, pageSize },
      };
    }
  })(req);
}

function normalizeJson(v: unknown) {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}
