import { ApiResponse, ApiPaginationResponse } from "@/types";

// 类型守卫：判断是否为分页响应（修复 null/undefined 问题）
export const isPaginationResponse = <T>(
  res: ApiResponse<T> | ApiPaginationResponse<T>
): res is ApiPaginationResponse<T> => {
  // 先确保 res.data 是「非 null/undefined 的对象」，再判断字段
  return (
    res.data != null && // 同时排除 null 和 undefined
    typeof res.data === "object" &&
    !Array.isArray(res.data) &&
    "list" in res.data &&
    "total" in res.data &&
    "pageNum" in res.data &&
    "pageSize" in res.data
  );
};
