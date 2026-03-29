import { message } from "antd";
import type { ApiResponse, ApiPaginationResponse } from "@/types";
import { HttpCodeEnum, BusinessCodeEnum, isPaginationResponse } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const TIMEOUT = 10000;

const requestInterceptor = (
  url: string,
  options: RequestInit
): { fullUrl: string; config: RequestInit } => {
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;

  const headers = new Headers(options.headers || {});
  if (!headers.get("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

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
      credentials: "include",
      signal: AbortSignal.timeout(TIMEOUT),
    },
  };
};

const responseInterceptor = async <T = unknown>(
  response: Response
): Promise<ApiResponse<T>> => {
  const defaultResponse: ApiResponse<T> = {
    httpCode: response.status as HttpCodeEnum,
    businessCode: BusinessCodeEnum.ServerBusinessError,
    message: "响应解析失败",
    data: undefined,
    requestId: "",
    timestamp: Date.now(),
  };

  let responseData: Partial<ApiResponse<T>>;
  try {
    responseData = await response.json();
  } catch {
    message.error("响应格式错误，请稍后重试");
    return defaultResponse;
  }

  const formattedResponse: ApiResponse<T> = {
    ...defaultResponse,
    ...responseData,
    httpCode: (responseData.httpCode || response.status) as HttpCodeEnum,
    businessCode: (responseData.businessCode ||
      BusinessCodeEnum.ServerBusinessError) as BusinessCodeEnum,
  };

  if (!response.ok) {
    const errMsg = formattedResponse.message || `请求失败 [${response.status}]`;

    if (formattedResponse.httpCode === HttpCodeEnum.Unauthorized) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("userInfo");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    if (formattedResponse.httpCode === HttpCodeEnum.Forbidden) {
      message.error(errMsg || "暂无权限访问该资源");
    }

    const error = new Error(errMsg) as Error & { response: ApiResponse<T> };
    error.response = formattedResponse;
    throw error;
  }

  return formattedResponse;
};

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
    throw error;
  }
};

export const request = {
  get: <T = unknown>(
    url: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> => {
    return customFetch<T>(url, { ...options, method: "GET" });
  },

  post: <T = unknown>(
    url: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> => {
    return customFetch<T>(url, { ...options, method: "POST", body: data as BodyInit });
  },

  put: <T = unknown>(
    url: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> => {
    return customFetch<T>(url, { ...options, method: "PUT", body: data as BodyInit });
  },

  patch: <T = unknown>(
    url: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> => {
    return customFetch<T>(url, { ...options, method: "PATCH", body: data as BodyInit });
  },

  delete: <T = unknown>(
    url: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> => {
    return customFetch<T>(url, { ...options, method: "DELETE" });
  },

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

  postPagination: <T = unknown>(
    url: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<ApiPaginationResponse<T>> => {
    return customFetch<T>(url, {
      ...options,
      method: "POST",
      body: data as BodyInit,
    }).then(
      (res) => {
        if (!isPaginationResponse(res)) {
          throw new Error("该接口返回的不是分页响应格式");
        }
        return res as ApiPaginationResponse<T>;
      }
    );
  },
};
