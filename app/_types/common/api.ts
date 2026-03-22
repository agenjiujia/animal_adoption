import { HttpCodeEnum, BusinessCodeEnum } from "@/types";

/**
 * 开发人员需要返回的纯业务响应对象（极简版）
 * 无需关心 requestId、timestamp 等通用字段，只需返回业务相关内容
 */
export interface BusinessResponse<T = unknown> {
  /** 业务状态码 */
  businessCode: BusinessCodeEnum;
  /** HTTP 状态码（可选，成功默认 200，失败默认 400/500） */
  httpCode?: HttpCodeEnum;
  /** 提示信息（可选，默认根据业务码生成） */
  message?: string;
  /** 业务数据（可选） */
  data?: T;
}

/**
 * 分页业务响应对象（专用）
 */
export interface BusinessPaginationResponse<T = unknown>
  extends Omit<BusinessResponse, "data"> {
  /** 分页数据 */
  data: {
    list: T[];
    total: number;
    pageNum: number;
    pageSize: number;
  };
}

/**
 * 最终返回给前端的标准响应类型（由高阶函数自动生成）
 */
export interface ApiResponse<T = unknown> {
  httpCode: HttpCodeEnum;
  businessCode: BusinessCodeEnum;
  message: string;
  data?: T;
  requestId: string;
  timestamp: number;
}

/**
 * 分页标准响应类型
 */
export interface ApiPaginationResponse<T = unknown>
  extends Omit<ApiResponse, "data"> {
  data: {
    list: T[];
    total: number;
    pageNum: number;
    pageSize: number;
  };
}
