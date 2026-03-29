import { NextResponse } from "next/server";
import { wrapBusinessResponse } from "@/utils/response/core";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import { AUTH_COOKIE_NAME } from "@/lib/constants/auth";

/**
 * 退出登录：清除 HttpOnly Cookie（无需登录，以便清理脏 Cookie）
 */
export async function POST() {
  const apiRes = wrapBusinessResponse({
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Success,
    message: "已退出登录",
    data: null,
  });
  const res = NextResponse.json(apiRes, { status: Number(apiRes.httpCode) });
  res.cookies.delete(AUTH_COOKIE_NAME);
  return res;
}
