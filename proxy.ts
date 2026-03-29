import { NextResponse, type NextRequest } from "next/server";
import { UserRoleEnum } from "@/types";
import { authErrorHandler, tokenErrorHandler } from "@/response";
import { verifyJwtEdge } from "@/lib/jwt-edge";
import { AUTH_COOKIE_NAME } from "@/lib/constants/auth";

const openApiPaths = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
];

function isOpenApi(path: string) {
  return openApiPaths.includes(path);
}

function isAdminApi(path: string) {
  return path.startsWith("/api/admin");
}

/** 从 Authorization 或 HttpOnly Cookie 取 Token */
function extractToken(request: NextRequest): string {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return request.cookies.get(AUTH_COOKIE_NAME)?.value?.trim() ?? "";
}

/**
 * API 层鉴权（运行于 Edge Middleware）
 * - 开放接口放行
 * - 其余接口校验 JWT
 * - /api/admin/* 额外要求 role=1
 */
export async function proxy(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;

  if (isOpenApi(currentPath)) {
    return NextResponse.next();
  }

  const token = extractToken(request);
  if (!token) {
    return tokenErrorHandler(false, "未登录，请先登录");
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET 环境变量未配置");
    return tokenErrorHandler(false, "服务器配置异常，Token 校验失败");
  }

  const tokenVerifyResult = await verifyJwtEdge(token);

  if (!tokenVerifyResult.isValid) {
    return tokenVerifyResult.isExpired
      ? tokenErrorHandler(true)
      : tokenErrorHandler(false, tokenVerifyResult.message);
  }

  if (isAdminApi(currentPath)) {
    const userRole = tokenVerifyResult.payload?.role;
    if (userRole !== UserRoleEnum.Admin) {
      return authErrorHandler("当前账号无管理员权限，无法访问");
    }
  }

  const userId = tokenVerifyResult.payload?.user_id;
  const requestHeaders = new Headers(request.headers);
  if (userId !== undefined && userId !== null) {
    requestHeaders.set("x-user-id", String(userId));
  }
  if (!requestHeaders.get("authorization") && token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/** 仅对 API 路径执行鉴权（与 Next 16 proxy 约定一致，勿再保留 middleware.ts） */
export const config = {
  matcher: "/api/:path*",
};
