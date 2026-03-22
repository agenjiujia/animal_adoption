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

/**
 * API 处理高阶函数（核心）
 * @param handler 开发人员编写的业务处理函数（返回纯业务对象）
 * @returns NextResponse（自动包装）
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
      // 全局异常捕获（统一返回服务器错误）
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

/**
 * 分页 API 专用高阶函数（简化分页响应）
 */
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
      // 全局异常捕获（统一返回服务器错误）
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

// ========== 快捷高阶函数（针对常见错误场景） ==========
/**
 * 权限校验失败的快捷响应（直接返回，无需业务函数）
 */
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

/**
 * Token 错误快捷响应
 */
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
