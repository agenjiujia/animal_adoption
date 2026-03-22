import { NextRequest } from "next/server";
import { withPaginationApiHandler } from "@/utils/response/hoc"; // 替换为分页高阶函数
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import type { BusinessPaginationResponse } from "@/types"; // 引入分页响应类型
import pool from "@/lib/db";
import { verifyToken } from "@/utils/verifyToken";

/**
 * 宠物发布单列表查询接口（POST + 分页高阶函数封装）
 * 支持查询参数：pet_id、user_id、name、species、breed、age、gender、weight、vaccine_status、neutered、status
 * 内置分页：page（默认1）、pageSize（默认10）
 * 响应适配：BusinessPaginationResponse 类型（匹配withPaginationApiHandler）
 */
const getPetListHandler = async (
  req: NextRequest
): Promise<BusinessPaginationResponse<any>> => {
  // 1. 解析Token（登录态校验，中间件已处理过期）
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      businessCode: BusinessCodeEnum.NotLoggedIn,
      httpCode: HttpCodeEnum.Unauthorized,
      message: "未登录，无法查询宠物列表",
      data: {
        list: [], // 分页响应必须返回list字段
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
    };
  }
  const token = authHeader.replace("Bearer ", "");
  const userInfo = verifyToken(token);

  if (!userInfo.payload?.user_id) {
    return {
      businessCode: BusinessCodeEnum.NotLoggedIn,
      httpCode: HttpCodeEnum.Unauthorized,
      message: "登录状态失效，请重新登录",
      data: {
        list: [], // 分页响应必须返回list字段
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
    };
  }

  // 2. 解析POST请求体参数
  let requestData: any;
  try {
    requestData = await req.json();
  } catch (error) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请求参数格式错误，请传入合法JSON",
      data: {
        list: [], // 分页响应必须返回list字段
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
    };
  }

  // 2.1 提取所有查询参数 + 分页参数（默认值兜底）
  const {
    // 核心查询参数（匹配数据库字段）
    pet_id,
    user_id,
    name,
    species,
    breed,
    age,
    gender,
    weight,
    vaccine_status,
    neutered,
    status,
    // 分页参数（默认值）
    page = 1,
    pageSize = 10,
  } = requestData || {};

  // 3. 参数类型校验 + 格式化
  const formattedParams: Record<string, any> = {};
  const sqlParams: any[] = []; // 参数化查询数组（防SQL注入）
  const whereConditions: string[] = [];

  // 3.1 数字类型参数校验（精确查询：pet_id/user_id/age/gender等）
  const numericFields = [
    "pet_id",
    "user_id",
    "age",
    "gender",
    "vaccine_status",
    "neutered",
    "status",
  ];
  for (const field of numericFields) {
    const value = requestData[field];
    if (value !== undefined && value !== null) {
      const numValue = Number(value);
      // 基础数字校验：非负
      if (isNaN(numValue) || numValue < 0) {
        return {
          businessCode: BusinessCodeEnum.ParameterValidationFailed,
          httpCode: HttpCodeEnum.BadRequest,
          message: `${field}必须为非负数字`,
          data: {
            list: [], // 分页响应必须返回list字段
            pageNum: 1,
            pageSize: 10,
            total: 0,
          },
        };
      }
      // 枚举值范围校验（匹配数据库TINYINT约束）
      const validValueMap = {
        gender: [0, 1], // 0-母/1-公
        vaccine_status: [0, 1, 2], // 0-未知/1-已打/2-未打
        neutered: [0, 1, 2], // 0-未知/1-已绝育/2-未绝育
        status: [0, 1, 2], // 0-待领养/1-已领养/2-下架
      };
      if (validValueMap[field as keyof typeof validValueMap]) {
        if (
          !validValueMap[field as keyof typeof validValueMap].includes(numValue)
        ) {
          return {
            businessCode: BusinessCodeEnum.ParameterValidationFailed,
            httpCode: HttpCodeEnum.BadRequest,
            message: `${field}取值非法，仅支持：${validValueMap[
              field as keyof typeof validValueMap
            ].join("、")}`,
            data: {
              list: [], // 分页响应必须返回list字段
              pageNum: 1,
              pageSize: 10,
              total: 0,
            },
          };
        }
      }
      // 整数校验（pet_id/user_id/age为INT，必须是整数）
      if (
        ["pet_id", "user_id", "age"].includes(field) &&
        !Number.isInteger(numValue)
      ) {
        return {
          businessCode: BusinessCodeEnum.ParameterValidationFailed,
          httpCode: HttpCodeEnum.BadRequest,
          message: `${field}必须为非负整数`,
          data: {
            list: [], // 分页响应必须返回list字段
            pageNum: 1,
            pageSize: 10,
            total: 0,
          },
        };
      }
      formattedParams[field] = numValue;
      whereConditions.push(`${field} = ?`);
      sqlParams.push(numValue);
    }
  }

  // 3.2 体重参数校验（DECIMAL(5,2)：0-999.99）
  if (weight !== undefined && weight !== null) {
    const weightNum = Number(weight);
    if (isNaN(weightNum) || weightNum < 0 || weightNum > 999.99) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "weight需为0-999.99之间的数字（单位：kg）",
        data: {
          list: [], // 分页响应必须返回list字段
          pageNum: 1,
          pageSize: 10,
          total: 0,
        },
      };
    }
    formattedParams.weight = weightNum;
    whereConditions.push("weight = ?");
    sqlParams.push(weightNum);
  }

  // 3.3 字符串参数校验（模糊查询：name/species/breed）
  const stringFields = ["name", "species", "breed"];
  for (const field of stringFields) {
    const value = requestData[field];
    if (value !== undefined && value !== null) {
      const strValue = value.toString().trim();
      if (strValue) {
        formattedParams[field] = strValue;
        whereConditions.push(`${field} LIKE ?`);
        sqlParams.push(`%${strValue}%`); // 模糊匹配（包含关键词）
      }
    }
  }

  // 3.4 分页参数校验
  const pageNum = Number(page);
  const pageSizeNum = Number(pageSize);
  if (isNaN(pageNum) || pageNum < 1 || !Number.isInteger(pageNum)) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "page必须为正整数",
      data: {
        list: [], // 分页响应必须返回list字段
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
    };
  }
  if (
    isNaN(pageSizeNum) ||
    pageSizeNum < 1 ||
    pageSizeNum > 100 ||
    !Number.isInteger(pageSizeNum)
  ) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "pageSize必须为1-100之间的正整数",
      data: {
        list: [], // 分页响应必须返回list字段
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
    };
  }
  const offset = (pageNum - 1) * pageSizeNum; // 计算分页偏移量

  // 4. 动态拼接SQL（参数化查询，防注入）
  try {
    // 4.1 查询总数（用于分页）
    let countSql = "SELECT COUNT(*) as total FROM pet";
    if (whereConditions.length > 0) {
      countSql += ` WHERE ${whereConditions.join(" AND ")}`;
    }
    const [countResult] = await pool.query(countSql, sqlParams);
    const total = (countResult as any)?.[0]?.total || 0;

    // 4.2 查询列表数据（匹配pet表所有字段，按更新时间降序）
    let listSql = "SELECT * FROM pet";
    if (whereConditions.length > 0) {
      listSql += ` WHERE ${whereConditions.join(" AND ")}`;
    }
    listSql += " ORDER BY update_time DESC LIMIT ? OFFSET ?";
    // 拼接分页参数到SQL参数数组
    const listSqlParams = [...sqlParams, pageSizeNum, offset];
    const [listResult] = await pool.query(listSql, listSqlParams);

    // 5. 构造分页响应（严格匹配BusinessPaginationResponse类型）
    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "宠物列表查询成功",
      data: {
        list: listResult as unknown[], // 列表数据
        pageNum: pageNum,
        pageSize: pageSizeNum,
        total, // 总条数
      },
    };
  } catch (error) {
    console.error("查询宠物列表失败：", error);
    return {
      businessCode: BusinessCodeEnum.InternalServerError,
      httpCode: HttpCodeEnum.ServerError,
      message: "查询宠物列表失败，请重试",
      data: {
        list: [],
        pageNum: 1,
        pageSize: 10,
        total: 0,
      },
    };
  }
};

// 核心修改：使用分页高阶函数包装
export const POST = withPaginationApiHandler(getPetListHandler);
