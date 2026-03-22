import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import type { BusinessResponse } from "@/types";
import pool from "@/lib/db";
import { verifyToken } from "@/utils/verifyToken";

/**
 * 宠物发布单详情查询接口
 * 请求方式：GET
 * 查询参数：pet_id（必传，宠物主键）
 * 返回：单条宠物完整详情数据
 */
const getPetDetailHandler = async (
  req: NextRequest
): Promise<BusinessResponse<any>> => {
  // 1. Token校验（中间件已处理过期，仅确认登录态）
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      businessCode: BusinessCodeEnum.NotLoggedIn,
      httpCode: HttpCodeEnum.Unauthorized,
      message: "未登录，无法查询宠物详情",
      data: null,
    };
  }
  const token = authHeader.replace("Bearer ", "");
  const userInfo = verifyToken(token);

  if (!userInfo.payload?.user_id) {
    return {
      businessCode: BusinessCodeEnum.NotLoggedIn,
      httpCode: HttpCodeEnum.Unauthorized,
      message: "登录状态失效，请重新登录",
      data: null,
    };
  }

  // 2. 解析URL查询参数（pet_id必传）
  const searchParams = req.nextUrl.searchParams;
  const petIdStr = searchParams.get("pet_id");

  // 3. 参数校验（pet_id必须为正整数）
  if (!petIdStr) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "宠物ID（pet_id）为必传参数",
      data: null,
    };
  }

  const petId = Number(petIdStr);
  if (isNaN(petId) || petId < 1 || !Number.isInteger(petId)) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "宠物ID（pet_id）必须为正整数",
      data: null,
    };
  }

  // 4. 查询数据库（匹配pet表所有字段）
  try {
    const [result] = await pool.query(
      "SELECT * FROM pet WHERE pet_id = ? LIMIT 1",
      [petId]
    );

    // 5. 数据不存在处理
    if (!result || (result as unknown[])?.length === 0) {
      return {
        businessCode: BusinessCodeEnum.DataNotExist,
        httpCode: HttpCodeEnum.NotFound,
        message: `未找到pet_id为${petId}的宠物发布单`,
        data: null,
      };
    }

    // 6. 成功返回详情数据
    const petDetail = (result as any)?.[0] || {};
    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "宠物详情查询成功",
      data: petDetail, // 返回完整的宠物详情
    };
  } catch (error) {
    console.error("查询宠物详情失败：", error);
    return {
      businessCode: BusinessCodeEnum.InternalServerError,
      httpCode: HttpCodeEnum.ServerError,
      message: "查询宠物详情失败，请重试",
      data: null,
    };
  }
};

// 导出GET方法，使用核心高阶函数包装
export const GET = withApiHandler(getPetDetailHandler);
