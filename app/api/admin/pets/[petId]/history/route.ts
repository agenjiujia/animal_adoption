import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withAdminApiHandler } from "@/utils/response/hoc";
import { wrapBusinessResponse } from "@/utils/response/core";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import pool from "@/lib/db";

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
      const [cnt] = await pool.query(
        "SELECT COUNT(*) as total FROM pet_history WHERE pet_id = ?",
        [petId]
      );
      const total = (cnt as { total: number }[])[0]?.total ?? 0;
      const offset = (pageNum - 1) * pageSize;
      const [list] = await pool.query(
        `SELECT id, pet_id, old_data, new_data, operator_id, operate_type, operate_time
         FROM pet_history WHERE pet_id = ? ORDER BY operate_time DESC, id DESC LIMIT ? OFFSET ?`,
        [petId, pageSize, offset]
      );
      const parsed = (list as Record<string, unknown>[]).map((row) => ({
        ...row,
        old_data: parseJsonField(row.old_data),
        new_data: parseJsonField(row.new_data),
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

function parseJsonField(v: unknown) {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}
