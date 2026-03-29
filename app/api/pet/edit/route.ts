import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum, PetOperateTypeEnum } from "@/types"; // ✅ 已删除 UserRoleEnum 导入
import pool, { withTransaction } from "@/lib/db";
import { resolveAuth } from "@/lib/auth";

/**
 * 发布者修改宠物内容（不含 status）。所有用户（包括管理员）仅能编辑自己发布的记录。
 */
const editPetHandler = async (req: NextRequest) => {
  const auth = resolveAuth(req);
  if (!auth.ok) return auth.error;

  // ✅ 核心改动：删除「管理员不能使用此接口」的权限拦截

  let requestData: Record<string, unknown>;
  try {
    requestData = await req.json();
  } catch {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请求体须为合法 JSON",
    };
  }

  const {
    pet_id,
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
    status,
  } = requestData;

  // ✅ 保留：所有用户都不能通过此接口修改 status
  if (status !== undefined) {
    return {
      businessCode: BusinessCodeEnum.PermissionDenied,
      httpCode: HttpCodeEnum.Forbidden,
      message: "不能修改 status",
    };
  }

  const petId = Number(pet_id);
  if (!petId || petId < 1) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "pet_id 非法",
    };
  }

  const [rows] = await pool.query(
    "SELECT * FROM pet WHERE pet_id = ? LIMIT 1",
    [petId]
  );
  if (!Array.isArray(rows) || !rows.length) {
    return {
      businessCode: BusinessCodeEnum.DataNotExist,
      httpCode: HttpCodeEnum.NotFound,
      message: "宠物不存在",
    };
  }
  const petInfo = rows[0] as Record<string, unknown>;
  const oldPetData = { ...petInfo };

  // ✅ 保留：所有用户统一仅能编辑本人发布的宠物
  if (Number(petInfo.user_id) !== auth.user.userId) {
    return {
      businessCode: BusinessCodeEnum.DataPermissionDenied,
      httpCode: HttpCodeEnum.Forbidden,
      message: "仅可编辑本人发布的宠物",
    };
  }

  const updateFields: Record<string, unknown> = {};

  if (name !== undefined) {
    if (!String(name).trim() || String(name).length > 50) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "名称不能为空且不超过50字",
      };
    }
    updateFields.name = String(name).trim();
  }

  if (species !== undefined) {
    const s = String(species).trim();
    if (!s || s.length > 30) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "种类长度1-30",
      };
    }
    updateFields.species = s;
  }

  if (gender !== undefined) {
    const g = Number(gender);
    if (![0, 1].includes(g)) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "gender 只能为 0 或 1",
      };
    }
    updateFields.gender = g;
  }

  if (vaccine_status !== undefined) {
    const v = Number(vaccine_status);
    if (![0, 1, 2].includes(v)) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "vaccine_status 非法",
      };
    }
    updateFields.vaccine_status = v;
  }

  if (neutered !== undefined) {
    const n = Number(neutered);
    if (![0, 1, 2].includes(n)) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "neutered 非法",
      };
    }
    updateFields.neutered = n;
  }

  if (weight !== undefined) {
    const w = Number(weight);
    if (isNaN(w) || w < 0 || w > 999.99) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "体重非法",
      };
    }
    updateFields.weight = w;
  }

  if (age !== undefined) {
    const a = Number(age);
    if (isNaN(a) || a < 0 || !Number.isInteger(a)) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "年龄须为非负整数",
      };
    }
    updateFields.age = a;
  }

  if (breed !== undefined)
    updateFields.breed = breed ? String(breed).trim() : null;
  if (health_status !== undefined)
    updateFields.health_status = health_status || null;
  if (description !== undefined) updateFields.description = description || null;

  if (image_urls !== undefined) {
    let urls = "";
    if (image_urls && String(image_urls).trim()) {
      urls = Array.isArray(image_urls)
        ? image_urls.join(",")
        : String(image_urls).replace(/，/g, ",");
    }
    updateFields.image_urls = urls || null;
  }

  if (Object.keys(updateFields).length === 0) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "没有可更新字段",
    };
  }

  try {
    await withTransaction(async (conn) => {
      const keys = Object.keys(updateFields);
      const sql = `UPDATE pet SET ${keys
        .map((k) => `${k} = ?`)
        .join(", ")} WHERE pet_id = ?`;
      await conn.query(sql, [...Object.values(updateFields), petId]);
      await conn.query(
        `INSERT INTO pet_history (pet_id, old_data, new_data, operator_id, operate_type, operate_time)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          petId,
          JSON.stringify(oldPetData),
          JSON.stringify(updateFields),
          auth.user.userId,
          PetOperateTypeEnum.CONTENT_EDIT,
        ]
      );
    });
  } catch (e) {
    console.error(e);
    return {
      businessCode: BusinessCodeEnum.DataUpdateFailed,
      httpCode: HttpCodeEnum.ServerError,
      message: "更新失败",
    };
  }

  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Success,
    message: "保存成功",
    data: { pet_id: petId },
  };
};

export const PUT = withApiHandler(editPetHandler);
