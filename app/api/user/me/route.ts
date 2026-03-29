import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import pool from "@/lib/db";
import { resolveAuth } from "@/lib/auth";

/**
 * 个人中心：当前登录用户资料（不含密码）
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const auth = resolveAuth(req);
  if (!auth.ok) return auth.error;

  const [rows] = await pool.query(
    `SELECT user_id, username, email, phone, avatar, real_name, id_card, address, role, status, create_time, update_time
     FROM user WHERE user_id = ? LIMIT 1`,
    [auth.user.userId]
  );
  const list = rows as Record<string, unknown>[];
  if (!list?.length) {
    return {
      businessCode: BusinessCodeEnum.UserNotExist,
      httpCode: HttpCodeEnum.NotFound,
      message: "用户不存在",
    };
  }
  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Success,
    message: "查询成功",
    data: list[0],
  };
});

/**
 * 更新个人资料
 */
export const PATCH = withApiHandler(async (req: NextRequest) => {
  const auth = resolveAuth(req);
  if (!auth.ok) return auth.error;

  const body = await req.json();
  const { avatar, username, email, address, real_name } = body;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (avatar !== undefined) {
    fields.push("avatar = ?");
    values.push(avatar);
  }
  if (username !== undefined) {
    fields.push("username = ?");
    values.push(username);
  }
  if (email !== undefined) {
    fields.push("email = ?");
    values.push(email);
  }
  if (address !== undefined) {
    fields.push("address = ?");
    values.push(address);
  }
  if (real_name !== undefined) {
    fields.push("real_name = ?");
    values.push(real_name);
  }

  if (fields.length === 0) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请提供要更新的字段",
    };
  }

  values.push(auth.user.userId);

  await pool.query(
    `UPDATE user SET ${fields.join(", ")}, update_time = CURRENT_TIMESTAMP WHERE user_id = ?`,
    values
  );

  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Success,
    message: "资料更新成功",
  };
});
