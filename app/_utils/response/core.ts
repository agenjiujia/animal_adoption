import { HttpCodeEnum, BusinessCodeEnum } from "@/types";
import type {
  ApiResponse,
  BusinessResponse,
  ApiPaginationResponse,
  BusinessPaginationResponse,
} from "@/types";
import { BusinessCodeMsgMap } from "@/constant/business-code-map";

/**
 * 生成唯一请求 ID
 */
export const generateRequestId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

/**
 * 基础包装核心逻辑（抽离所有通用逻辑，无类型约束）
 * @param businessRes 任意业务响应对象（仅约定包含基础字段）
 * @returns 标准响应的通用字段（不含 data 的类型约束）
 */
const baseWrap = <T = unknown>(businessRes: {
  businessCode: BusinessCodeEnum;
  httpCode?: HttpCodeEnum;
  message?: string;
  data?: T;
}) => {
  // 1. 通用默认值计算（唯一的核心逻辑，只写一次）
  const defaultHttpCode =
    businessRes.businessCode === BusinessCodeEnum.Success
      ? HttpCodeEnum.Success
      : HttpCodeEnum.BadRequest;

  // 2. 组装通用字段（所有响应都包含的字段）
  return {
    httpCode: businessRes.httpCode ?? defaultHttpCode,
    businessCode: businessRes.businessCode,
    message:
      businessRes.message ??
      BusinessCodeMsgMap[businessRes.businessCode] ??
      "操作失败",
    data: businessRes.data,
    requestId: generateRequestId(),
    timestamp: Date.now(),
  };
};

/**
 * 普通业务对象 → 标准响应对象（仅做类型约束，核心复用 baseWrap）
 */
export const wrapBusinessResponse = <T = unknown>(
  businessRes: BusinessResponse<T>
): ApiResponse<T> => baseWrap(businessRes) as ApiResponse<T>;

/**
 * 分页业务对象 → 标准分页响应对象（仅做类型约束，核心复用 baseWrap）
 */
export const wrapBusinessPaginationResponse = <T = unknown>(
  businessRes: BusinessPaginationResponse<T>
): ApiPaginationResponse<T> =>
  baseWrap(businessRes) as ApiPaginationResponse<T>;
