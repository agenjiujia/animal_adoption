import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { HttpCodeEnum, BusinessCodeEnum } from "@/types";
import type {
  BusinessResponse,
  BusinessPaginationResponse,
  ApiResponse,
} from "@/types";
import {
  wrapBusinessResponse,
  generateRequestId,
  wrapBusinessPaginationResponse,
} from "./core";
import { resolveAuth, isAdmin, type AuthUser } from "@/lib/auth";

/**
 * 通用 API：业务函数返回纯业务对象，自动包装 JSON、捕获未处理异常
 */
export const withApiHandler = <T = unknown>(
  handler: (
    req: NextRequest
  ) => Promise<BusinessResponse<T>> | BusinessResponse<T>
) => {
  return async (req: NextRequest) => {
    try {
      const businessRes = await handler(req);
      const apiRes = wrapBusinessResponse(businessRes);
      return NextResponse.json(apiRes, { status: Number(apiRes.httpCode) });
    } catch (error) {
      console.error("API 处理异常：", error);
      const errorRes: ApiResponse<null> = {
        httpCode: HttpCodeEnum.ServerError,
        businessCode: BusinessCodeEnum.ServerBusinessError,
        message: "服务器内部错误，请稍后重试",
        data: null,
        requestId: generateRequestId(),
        timestamp: Date.now(),
      };
      return NextResponse.json(errorRes, { status: 500 });
    }
  };
};

/** 分页列表 API */
export const withPaginationApiHandler = <T = unknown>(
  handler: (
    req: NextRequest
  ) => Promise<BusinessPaginationResponse<T>> | BusinessPaginationResponse<T>
) => {
  return async (req: NextRequest) => {
    try {
      const businessRes = await handler(req);
      const apiRes = wrapBusinessPaginationResponse(businessRes);
      return NextResponse.json(apiRes, { status: Number(apiRes.httpCode) });
    } catch (error) {
      console.error("分页 API 处理异常：", error);
      const errorRes: ApiResponse<null> = {
        httpCode: HttpCodeEnum.ServerError,
        businessCode: BusinessCodeEnum.ServerBusinessError,
        message: "服务器内部错误，请稍后重试",
        data: null,
        requestId: generateRequestId(),
        timestamp: Date.now(),
      };
      return NextResponse.json(errorRes, { status: 500 });
    }
  };
};

/** 管理员接口：必须已登录且 role=1 */
export const withAdminApiHandler = <T = unknown>(
  handler: (
    req: NextRequest,
    auth: AuthUser
  ) => Promise<BusinessResponse<T>> | BusinessResponse<T>
) => {
  return withApiHandler(async (req) => {
    const r = resolveAuth(req);
    if (!r.ok) return { ...r.error, data: r.error.data };
    if (!isAdmin(r.user)) {
      return {
        businessCode: BusinessCodeEnum.AdminPermissionDenied,
        httpCode: HttpCodeEnum.Forbidden,
        message: "需要管理员权限",
        data: null as T | undefined,
      };
    }
    return handler(req, r.user);
  });
};

/** 管理员分页接口 */
export const withAdminPaginationApiHandler = <T = unknown>(
  handler: (
    req: NextRequest,
    auth: AuthUser
  ) =>
    | Promise<BusinessPaginationResponse<T>>
    | BusinessPaginationResponse<T>
) => {
  return withPaginationApiHandler(async (req) => {
    const r = resolveAuth(req);
    if (!r.ok) {
      return {
        ...r.error,
        data: { list: [], total: 0, pageNum: 1, pageSize: 10 },
      };
    }
    if (!isAdmin(r.user)) {
      return {
        businessCode: BusinessCodeEnum.AdminPermissionDenied,
        httpCode: HttpCodeEnum.Forbidden,
        message: "需要管理员权限",
        data: { list: [], total: 0, pageNum: 1, pageSize: 10 },
      };
    }
    return handler(req, r.user);
  });
};

/** 403 JSON（中间件等使用） */
export const authErrorHandler = (message = "权限不足，无法访问") => {
  const res: ApiResponse<null> = {
    httpCode: HttpCodeEnum.Forbidden,
    businessCode: BusinessCodeEnum.PermissionDenied,
    message,
    data: null,
    requestId: generateRequestId(),
    timestamp: Date.now(),
  };
  return NextResponse.json(res, { status: 403 });
};

/** 401 JSON */
export const tokenErrorHandler = (isExpired = false, message?: string) => {
  const businessCode = isExpired
    ? BusinessCodeEnum.TokenExpired
    : BusinessCodeEnum.TokenInvalid;
  const defaultMsg = isExpired
    ? "Token 已过期，请重新登录"
    : "登录已失效，请重新登录";

  const res: ApiResponse<null> = {
    httpCode: HttpCodeEnum.Unauthorized,
    businessCode,
    message: message ?? defaultMsg,
    data: null,
    requestId: generateRequestId(),
    timestamp: Date.now(),
  };
  return NextResponse.json(res, { status: 401 });
};
