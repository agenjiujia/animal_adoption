import type { NextRequest } from "next/server";
import { verifyToken } from "@/utils/verifyToken";
import {
  BusinessCodeEnum,
  HttpCodeEnum,
  UserRoleEnum,
} from "@/types/common/enum";
import type { BusinessResponse } from "@/types";
import { AUTH_COOKIE_NAME } from "@/lib/constants/auth";

export type AuthUser = {
  userId: number;
  role: UserRoleEnum;
  username?: string;
  phone?: string;
};

export function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (h?.startsWith("Bearer ")) {
    const t = h.slice(7).trim();
    if (t) return t;
  }
  const fromCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  return fromCookie?.trim() || null;
}

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: BusinessResponse<null> };

/**
 * 解析当前请求的用户（Authorization 优先，其次 access_token Cookie）
 */
export function resolveAuth(req: NextRequest): AuthResult {
  const token = getBearerToken(req);
  if (!token) {
    return {
      ok: false,
      error: {
        businessCode: BusinessCodeEnum.NotLoggedIn,
        httpCode: HttpCodeEnum.Unauthorized,
        message: "未登录，请先登录",
        data: null,
      },
    };
  }

  const v = verifyToken(token);
  if (!v.isValid) {
    return {
      ok: false,
      error: {
        businessCode: v.isExpired
          ? BusinessCodeEnum.TokenExpired
          : BusinessCodeEnum.TokenInvalid,
        httpCode: HttpCodeEnum.Unauthorized,
        message: v.message,
        data: null,
      },
    };
  }

  const uid = v.payload?.user_id;
  if (uid === undefined || uid === null) {
    return {
      ok: false,
      error: {
        businessCode: BusinessCodeEnum.TokenInvalid,
        httpCode: HttpCodeEnum.Unauthorized,
        message: "登录态无效，请重新登录",
        data: null,
      },
    };
  }

  return {
    ok: true,
    user: {
      userId: Number(uid),
      role: v.payload!.role as UserRoleEnum,
      username: v.payload!.username as string | undefined,
      phone: v.payload!.phone as string | undefined,
    },
  };
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === UserRoleEnum.Admin;
}
