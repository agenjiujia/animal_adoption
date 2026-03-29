import { HttpCodeEnum, BusinessCodeEnum } from "@/types";
import type {
  ApiResponse,
  BusinessResponse,
  ApiPaginationResponse,
  BusinessPaginationResponse,
} from "@/types";
import { BusinessCodeMsgMap } from "@/constant/business-code-map";

/** 生成唯一请求 ID */
export const generateRequestId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

const baseWrap = <T = unknown>(businessRes: {
  businessCode: BusinessCodeEnum;
  httpCode?: HttpCodeEnum;
  message?: string;
  data?: T;
}) => {
  const defaultHttpCode =
    businessRes.businessCode === BusinessCodeEnum.Success
      ? HttpCodeEnum.Success
      : HttpCodeEnum.BadRequest;

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

export const wrapBusinessResponse = <T = unknown>(
  businessRes: BusinessResponse<T>
): ApiResponse<T> => baseWrap(businessRes) as ApiResponse<T>;

export const wrapBusinessPaginationResponse = <T = unknown>(
  businessRes: BusinessPaginationResponse<T>
): ApiPaginationResponse<T> =>
  baseWrap(businessRes) as ApiPaginationResponse<T>;
