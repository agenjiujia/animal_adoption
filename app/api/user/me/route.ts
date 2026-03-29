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
