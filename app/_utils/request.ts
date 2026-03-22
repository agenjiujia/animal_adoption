import { message } from "antd";
import type { ApiResponse, ApiPaginationResponse } from "@/types";
import { HttpCodeEnum, BusinessCodeEnum, isPaginationResponse } from "@/types";

// 基础配置
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const TIMEOUT = 10000;

/**
 * 请求拦截器：统一处理请求头、Token、请求体
 */
const requestInterceptor = (
  url: string,
  options: RequestInit
): { fullUrl: string; config: RequestInit } => {
  // 拼接完整URL
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;

  // 处理请求头
  const headers = new Headers(options.headers || {});
  if (!headers.get("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  // 添加认证Token（客户端环境）
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // 处理请求体（JSON自动序列化）
  let body = options.body;
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    body = JSON.stringify(body);
  }

  return {
    fullUrl,
    config: {
      ...options,
      method: options.method || "GET",
      headers,
      body,
      signal: AbortSignal.timeout(TIMEOUT), // 超时控制
    },
  };
};

/**
 * 响应拦截器：统一处理响应格式、错误、类型转换
 */
const responseInterceptor = async <T = unknown>(
  response: Response
): Promise<ApiResponse<T>> => {
  // 初始化默认响应（保证结构完整性）
  const defaultResponse: ApiResponse<T> = {
    httpCode: response.status as HttpCodeEnum,
    businessCode: BusinessCodeEnum.ServerBusinessError,
    message: "响应解析失败",
    data: undefined,
    requestId: "",
    timestamp: Date.now(),
  };

  // 解析响应数据
  let responseData: Partial<ApiResponse<T>>;
  try {
    responseData = await response.json();
  } catch (e) {
    message.error("响应格式错误，请稍后重试");
    return defaultResponse;
  }

  // 补全响应字段（保证类型完整性）
  const formattedResponse: ApiResponse<T> = {
    ...defaultResponse,
    ...responseData,
    httpCode: (responseData.httpCode || response.status) as HttpCodeEnum,
    businessCode: (responseData.businessCode ||
      BusinessCodeEnum.ServerBusinessError) as BusinessCodeEnum,
  };

  // 统一错误处理
  if (!response.ok) {
    const errMsg = formattedResponse.message || `请求失败 [${response.status}]`;

    // 401 未授权：清除Token并跳转登录
    if (formattedResponse.httpCode === HttpCodeEnum.Unauthorized) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    // 403 权限不足
    if (formattedResponse.httpCode === HttpCodeEnum.Forbidden) {
      message.error(errMsg || "暂无权限访问该资源");
    }

    // 抛出带完整响应的错误
    const error = new Error(errMsg) as Error & { response: ApiResponse<T> };
    error.response = formattedResponse;
    throw error;
  }

  return formattedResponse;
};

/**
 * 核心请求函数：基础请求能力，返回通用响应类型
 */
export const customFetch = async <T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const { fullUrl, config } = requestInterceptor(url, options);
    const response = await fetch(fullUrl, config);
    return await responseInterceptor<T>(response);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "请求发生未知错误";
    message.error(errMsg);
    console.error("Fetch 请求失败：", errMsg);
    throw error; // 抛出错误，让业务层处理
  }
};

/**
 * 快捷请求方法：区分通用/分页响应，完美适配泛型
 */
export const request = {
  // 通用 GET 请求：返回 ApiResponse<T>
  get: <T = unknown>(
    url: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> => {
    return customFetch<T>(url, { ...options, method: "GET" });
  },

  // 通用 POST 请求：返回 ApiResponse<T>
  post: <T = unknown>(
    url: string,
    data?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> => {
    return customFetch<T>(url, { ...options, method: "POST", body: data });
  },

  // 通用 PUT 请求：返回 ApiResponse<T>
  put: <T = unknown>(
    url: string,
    data?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> => {
    return customFetch<T>(url, { ...options, method: "PUT", body: data });
  },

  // 通用 DELETE 请求：返回 ApiResponse<T>
  delete: <T = unknown>(
    url: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> => {
    return customFetch<T>(url, { ...options, method: "DELETE" });
  },

  // 分页 GET 请求：返回 ApiPaginationResponse<T>（列表专用）
  getPagination: <T = unknown>(
    url: string,
    options?: RequestInit
  ): Promise<ApiPaginationResponse<T>> => {
    return customFetch<T>(url, { ...options, method: "GET" }).then((res) => {
      if (!isPaginationResponse(res)) {
        throw new Error("该接口返回的不是分页响应格式");
      }
      return res as ApiPaginationResponse<T>;
    });
  },

  // 分页 POST 请求：返回 ApiPaginationResponse<T>（列表专用）
  postPagination: <T = unknown>(
    url: string,
    data?: any,
    options?: RequestInit
  ): Promise<ApiPaginationResponse<T>> => {
    return customFetch<T>(url, { ...options, method: "POST", body: data }).then(
      (res) => {
        if (!isPaginationResponse(res)) {
          throw new Error("该接口返回的不是分页响应格式");
        }
        return res as ApiPaginationResponse<T>;
      }
    );
  },
};
