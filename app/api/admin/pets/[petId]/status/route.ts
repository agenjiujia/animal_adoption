import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withAdminApiHandler } from "@/utils/response/hoc";
import { wrapBusinessResponse } from "@/utils/response/core";
import { BusinessCodeEnum, HttpCodeEnum, PetOperateTypeEnum } from "@/types";
import { withTransaction } from "@/lib/db";
import type { AuthUser } from "@/lib/auth";

export async function PATCH(
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

  const logic = async (r: NextRequest, auth: AuthUser) => {
    let body: { status?: number };
    try {
      body = await r.json();
    } catch {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "JSON 无效",
      };
    }
    const st = Number(body.status);
    if (![0, 1, 2].includes(st)) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "status 须为 0 待领养 / 1 已领养 / 2 下架",
      };
    }

    try {
      await withTransaction(async (conn) => {
        const [rows] = await conn.query(
          "SELECT * FROM pet WHERE pet_id = ? LIMIT 1",
          [petId]
        );
        if (!Array.isArray(rows) || !rows.length) {
          throw new Error("NF");
        }
        const oldRow = { ...(rows as Record<string, unknown>[])[0] };
        await conn.query("UPDATE pet SET status = ? WHERE pet_id = ?", [
          st,
          petId,
        ]);
        await conn.query(
          `INSERT INTO pet_history (pet_id, old_data, new_data, operator_id, operate_type, operate_time)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [
            petId,
            JSON.stringify(oldRow),
            JSON.stringify({ status: st }),
            auth.userId,
            PetOperateTypeEnum.STATUS_CHANGE,
          ]
        );
      });
    } catch (e) {
      if (e instanceof Error && e.message === "NF") {
        return {
          businessCode: BusinessCodeEnum.DataNotExist,
          httpCode: HttpCodeEnum.NotFound,
          message: "宠物不存在",
        };
      }
      console.error(e);
      return {
        businessCode: BusinessCodeEnum.DataUpdateFailed,
        httpCode: HttpCodeEnum.ServerError,
        message: "更新失败",
      };
    }

    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "状态已更新",
      data: { pet_id: petId, status: st },
    };
  };

  return withAdminApiHandler(logic)(req);
}
