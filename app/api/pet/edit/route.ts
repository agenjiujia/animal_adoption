import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum, UserRoleEnum } from "@/types";
import {
  PetVaccineStatusMap,
  PetNeuteredMap,
  PetGenderMap,
  PetStatusMap,
} from "@/constant";
import pool from "@/lib/db";
import { verifyToken } from "@/utils/verifyToken";

/**
 * 编辑宠物领养发布单接口（严格匹配数据库表结构）
 * 权限规则：
 * - 发布者：仅改内容字段（禁改status）+ 仅改自己的发布单
 * - 管理员：仅改status字段（禁改其他）+ 可改所有发布单
 * 数据库匹配：pet表主键pet_id，字段类型严格对齐TINYINT/DECIMAL等
 */
const editPetHandler = async (req: NextRequest) => {
  // 1. 解析Token（仅提取用户信息，过期/有效性由中间件校验）
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      businessCode: BusinessCodeEnum.NotLoggedIn,
      httpCode: HttpCodeEnum.Unauthorized,
      message: "未登录，无法编辑宠物信息",
    };
  }
  const token = authHeader.replace("Bearer ", "");
  const userInfo = verifyToken(token);

  // 仅校验用户核心信息（中间件已保证Token有效）
  if (!userInfo.payload?.user_id || userInfo.payload?.role === undefined) {
    return {
      businessCode: BusinessCodeEnum.NotLoggedIn,
      httpCode: HttpCodeEnum.Unauthorized,
      message: "用户信息异常，请重新登录",
    };
  }
  const currentUserId = userInfo.payload.user_id; // 操作人ID（对应history的operator_id）
  const currentUserRole = userInfo.payload.role;

  // 2. 解析请求参数（匹配数据库字段名：pet_id为主键）
  let requestData: any;
  try {
    requestData = await req.json();
  } catch (error) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请求参数格式错误，请传入合法JSON",
    };
  }

  const {
    pet_id, // 宠物主键（必传，对应数据库pet_id）
    name,
    species,
    breed,
    age,
    gender,
    weight,
    health_status,
    vaccine_status,
    neutered,
    description,
    image_urls,
    status, // 仅管理员可修改
  } = requestData;

  // 3. 核心参数校验（pet_id必传+正整数）
  if (!pet_id || isNaN(Number(pet_id)) || Number(pet_id) <= 0) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "宠物ID（pet_id）必须为正整数",
    };
  }
  const petId = Number(pet_id); // 转数字（匹配数据库INT类型）

  // 4. 查询宠物基础信息（验证存在性 + 发布者ID + 旧数据）
  let petInfo: any;
  let oldPetData: any;
  try {
    // 查询完整旧数据（用于history的old_data），匹配pet表所有字段
    const [rows] = await pool.query(
      "SELECT * FROM pet WHERE pet_id = ? LIMIT 1",
      [petId]
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        businessCode: BusinessCodeEnum.DataNotExist,
        httpCode: HttpCodeEnum.NotFound,
        message: "该宠物发布单不存在",
      };
    }
    petInfo = rows[0]; // 宠物基础信息（含发布者user_id）
    oldPetData = { ...rows[0] }; // 深拷贝旧数据，避免引用修改
  } catch (error) {
    console.error("查询宠物信息失败：", error);
    return {
      businessCode: BusinessCodeEnum.InternalServerError,
      httpCode: HttpCodeEnum.ServerError,
      message: "查询宠物信息失败，请重试",
    };
  }

  // 5. 权限核心校验（发布者=pet表的user_id，管理员=role=Admin）
  const isAdmin = currentUserRole === UserRoleEnum.Admin;
  const isCreator = currentUserId === petInfo.user_id; // 发布者=宠物的user_id

  // 5.1 非发布者+非管理员：无权限
  if (!isAdmin && !isCreator) {
    return {
      businessCode: BusinessCodeEnum.AdminPermissionDenied,
      httpCode: HttpCodeEnum.Forbidden,
      message: "仅发布者本人或管理员可编辑该发布单",
    };
  }

  // 5.2 发布者：禁止修改status字段
  if (isCreator && !isAdmin && status !== undefined) {
    return {
      businessCode: BusinessCodeEnum.AdminPermissionDenied,
      httpCode: HttpCodeEnum.Forbidden,
      message: "发布者禁止修改发布单状态（status），仅管理员可操作",
    };
  }

  // 5.3 管理员：仅允许修改status字段，禁止修改其他内容
  if (isAdmin) {
    // 检查是否传了非status字段
    const nonStatusFields = [
      name,
      species,
      breed,
      age,
      gender,
      weight,
      health_status,
      vaccine_status,
      neutered,
      description,
      image_urls,
    ].filter((field) => field !== undefined);

    if (nonStatusFields.length > 0) {
      return {
        businessCode: BusinessCodeEnum.AdminPermissionDenied,
        httpCode: HttpCodeEnum.Forbidden,
        message: "管理员仅可修改发布单状态（status），禁止修改其他内容",
      };
    }

    // 管理员必须传status，且校验合法性（匹配数据库status枚举：0-待领养/1-已领养/2-下架）
    if (status === undefined) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "管理员编辑时必须传入状态（status）字段",
      };
    }
    const statusNum = Number(status);
    const validStatus = [0, 1, 2]; // 匹配数据库status的TINYINT取值
    if (!validStatus.includes(statusNum)) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: `状态（status）只能为：0-待领养、1-已领养、2-下架`,
      };
    }
  }

  // 6. 发布者修改内容：字段合法性校验（严格匹配数据库字段类型）
  let updateFields: Record<string, any> = {};
  let operateType = ""; // 对应history的operate_type

  if (isCreator && !isAdmin) {
    // 6.1 名称校验（VARCHAR(50) NOT NULL）
    if (name !== undefined) {
      if (!name || name.trim() === "" || name.length > 50) {
        return {
          businessCode: BusinessCodeEnum.ParameterValidationFailed,
          httpCode: HttpCodeEnum.BadRequest,
          message: "宠物名称不能为空，且长度不能超过50字",
        };
      }
      updateFields.name = name.trim();
    }

    // 6.2 种类校验（VARCHAR(30) NOT NULL）
    if (species !== undefined) {
      updateFields.species = species;
    }

    // 6.3 性别校验（TINYINT：0-母/1-公）
    if (gender !== undefined) {
      const genderNum = Number(gender);
      if (![0, 1].includes(genderNum)) {
        return {
          businessCode: BusinessCodeEnum.ParameterValidationFailed,
          httpCode: HttpCodeEnum.BadRequest,
          message: "性别（gender）只能为：0-母、1-公",
        };
      }
      updateFields.gender = genderNum; // 转TINYINT
    }

    // 6.4 疫苗状态校验（TINYINT：0-未知/1-已打/2-未打）
    if (vaccine_status !== undefined) {
      const vaccineNum = Number(vaccine_status);
      if (![0, 1, 2].includes(vaccineNum)) {
        return {
          businessCode: BusinessCodeEnum.ParameterValidationFailed,
          httpCode: HttpCodeEnum.BadRequest,
          message: "疫苗状态（vaccine_status）只能为：0-未知、1-已打、2-未打",
        };
      }
      updateFields.vaccine_status = vaccineNum; // 转TINYINT
    }

    // 6.5 绝育状态校验（TINYINT：0-未知/1-已绝育/2-未绝育）
    if (neutered !== undefined) {
      const neuteredNum = Number(neutered);
      if (![0, 1, 2].includes(neuteredNum)) {
        return {
          businessCode: BusinessCodeEnum.ParameterValidationFailed,
          httpCode: HttpCodeEnum.BadRequest,
          message: "绝育状态（neutered）只能为：0-未知、1-已绝育、2-未绝育",
        };
      }
      updateFields.neutered = neuteredNum; // 转TINYINT
    }

    // 6.6 体重校验（DECIMAL(5,2)：0-999.99）
    if (weight !== undefined) {
      const weightNum = Number(weight);
      if (isNaN(weightNum) || weightNum < 0 || weightNum > 999.99) {
        return {
          businessCode: BusinessCodeEnum.ParameterValidationFailed,
          httpCode: HttpCodeEnum.BadRequest,
          message: "体重（weight）需为0-999.99之间的数字（单位：kg）",
        };
      }
      updateFields.weight = weightNum; // 转DECIMAL
    }

    // 6.7 年龄校验（INT：非负整数）
    if (age !== undefined) {
      const ageNum = Number(age);
      if (isNaN(ageNum) || ageNum < 0 || !Number.isInteger(ageNum)) {
        return {
          businessCode: BusinessCodeEnum.ParameterValidationFailed,
          httpCode: HttpCodeEnum.BadRequest,
          message: "年龄（age）需为非负整数（单位：月）",
        };
      }
      updateFields.age = ageNum; // 转INT
    }

    // 6.8 可选字段处理（匹配数据库默认值）
    if (breed !== undefined) updateFields.breed = breed?.trim() || null; // VARCHAR(50)
    if (health_status !== undefined)
      updateFields.health_status = health_status || null; // TEXT
    if (description !== undefined)
      updateFields.description = description || null; // TEXT

    // 6.9 图片URL处理（TEXT：逗号分隔）
    if (image_urls !== undefined) {
      let finalImageUrls = "";
      if (image_urls && image_urls.toString().trim()) {
        finalImageUrls = Array.isArray(image_urls)
          ? image_urls.join(",")
          : image_urls.toString().replace(/，/g, ",");
      }
      updateFields.image_urls = finalImageUrls || null;
    }

    // 发布者操作类型
    operateType = "CONTENT_EDIT";
  }

  // 7. 管理员修改状态：仅更新status（TINYINT：0-待领养/1-已领养/2-下架）
  if (isAdmin) {
    const statusNum = Number(status);
    updateFields.status = statusNum;
    operateType = "STATUS_CHANGE";
  }

  // 8. 无更新字段校验
  if (Object.keys(updateFields).length === 0) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "未传入任何可修改的字段",
    };
  }

  // 9. 事务处理：更新pet表 + 插入pet_history表（保证原子性）
  try {
    // 开启数据库事务
    await pool.query("START TRANSACTION");

    // 9.1 更新pet主表（匹配数据库字段名，pet_id为条件）
    const updateKeys = Object.keys(updateFields);
    const updateSql = `UPDATE pet SET ${updateKeys
      .map((key) => `${key} = ?`)
      .join(", ")} WHERE pet_id = ?`;
    const updateValues = [...Object.values(updateFields), petId];
    await pool.query(updateSql, updateValues);

    // 9.2 插入pet_history表（严格匹配你的建表结构）
    await pool.query(
      `INSERT INTO pet_history (
        pet_id, old_data, new_data, operator_id, operate_type
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        petId, // 关联宠物ID
        JSON.stringify(oldPetData), // 修改前完整数据（JSON）
        JSON.stringify(updateFields), // 仅修改的字段（JSON）
        currentUserId, // 操作人ID（INT UNSIGNED）
        operateType, // 操作类型：CONTENT_EDIT/STATUS_CHANGE
      ]
    );

    // 提交事务
    await pool.query("COMMIT");
  } catch (error) {
    // 异常回滚
    await pool.query("ROLLBACK");
    console.error("编辑宠物发布单失败（事务回滚）：", error);
    return {
      businessCode: BusinessCodeEnum.InternalServerError,
      httpCode: HttpCodeEnum.ServerError,
      message: "编辑宠物信息失败，请重试",
    };
  }

  // 10. 成功响应（语义化提示）
  const successMsg = isAdmin
    ? `发布单状态已修改为：${
        status === 0 ? "待领养" : status === 1 ? "已领养" : "下架"
      }`
    : "宠物发布单内容编辑成功（状态不变）";

  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Success,
    message: successMsg,
    data: {
      pet_id: petId,
      operate_type: operateType,
      update_fields: updateFields,
    },
  };
};

// 导出PUT方法，沿用你的withApiHandler封装
export const PUT = withApiHandler(editPetHandler);
