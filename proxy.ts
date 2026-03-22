import { NextResponse, type NextRequest } from "next/server";
import { UserRoleEnum } from "@/types";
import { authErrorHandler, tokenErrorHandler } from "@/response";
import { verifyToken } from "@/utils/verifyToken";

/**
 * 判断当前路径是否属于免鉴权路径
 * @param currentPath 当前请求路径（不含主机名）
 * @returns 是否免鉴权
 */
const isUnauthorizedPath = (currentPath: string): boolean => {
  // 无需 Token 校验的开放接口路径
  const openApiPaths = ["/api/auth/login", "/api/auth/register"];
  return openApiPaths.includes(currentPath);
};

/**
 * 判断当前路径是否需要管理员权限
 * @param currentPath 当前请求路径（不含主机名）
 * @returns 是否需要管理员权限
 */
const isAdminRequiredPath = (currentPath: string): boolean => {
  // 需要管理员权限的接口前缀
  const adminApiPrefixes = ["/api/admin"];
  return adminApiPrefixes.some((prefix) => currentPath.startsWith(prefix));
};

/**
 * 提取请求头中的 Token 信息
 * @param authHeader 请求头中的 Authorization 字段值
 * @returns 纯 Token 字符串（去除 Bearer 前缀）
 */
const extractTokenFromHeader = (authHeader: string | null): string => {
  if (!authHeader) return "";

  // 兼容 Bearer Token 和纯 Token 两种格式
  return authHeader.startsWith("Bearer ")
    ? authHeader.split("Bearer ")[1]?.trim() || ""
    : authHeader.trim();
};

/**
 * Next.js API 鉴权中间件
 * 职责：1. 校验 Token 合法性 2. 校验管理员权限 3. 透传用户ID
 */
export function proxy(request: NextRequest) {
  // 提取当前请求路径（去除主机名，仅保留路径部分）
  const currentPath = request.nextUrl.pathname;

  // 1. 免鉴权路径直接放行
  if (isUnauthorizedPath(currentPath)) {
    return NextResponse.next();
  }

  // 2. 提取并校验 Token
  const token = extractTokenFromHeader(request.headers.get("authorization"));

  // 2.1 Token 不存在 → 返回未登录错误
  if (!token) {
    return tokenErrorHandler(false, "未登录，请先登录");
  }

  // 2.2 校验 Token 合法性（密钥不存在时直接返回 Token 无效）
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET 环境变量未配置");
    return tokenErrorHandler(false, "服务器配置异常，Token 校验失败");
  }

  const tokenVerifyResult = verifyToken(token);

  // 2.3 Token 无效 → 区分过期/其他错误
  if (!tokenVerifyResult.isValid) {
    return tokenVerifyResult.isExpired
      ? tokenErrorHandler(true) // Token 过期
      : tokenErrorHandler(false); // Token 无效（签名错误/格式错误等）
  }

  // 3. 管理员权限校验
  if (isAdminRequiredPath(currentPath)) {
    const userRole = tokenVerifyResult.payload?.role;

    // 角色不存在或非管理员 → 返回权限不足
    if (!userRole || userRole !== UserRoleEnum.Admin) {
      return authErrorHandler("当前账号无管理员权限，无法访问");
    }
  }

  // 4. 透传用户ID到下游（创建新的请求头，避免修改原请求）
  const userId = tokenVerifyResult.payload?.user_id;
  const requestHeaders = new Headers(request.headers);
  if (userId) {
    requestHeaders.set("x-user-id", String(userId));
  }

  // 5. 放行请求，携带透传的请求头
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * 中间件匹配规则：仅拦截 /api 开头的请求
 */
export const config = {
  matcher: "/api/:path*",
};
