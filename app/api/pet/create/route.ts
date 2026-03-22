import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import {
  BusinessCodeEnum,
  HttpCodeEnum,
  PetStatusEnum,
  PetVaccineStatusEnum,
  PetNeuteredEnum,
  PetGenderEnum,
} from "@/types";
import { PetVaccineStatusMap, PetNeuteredMap, PetGenderMap } from "@/constant";
import pool from "@/lib/db";

import { verifyToken } from "@/utils/verifyToken";

/**
 * 发布宠物领养接口（管理员专属）
 */
const createPetHandler = async (req: NextRequest) => {
  // 1. 解析Token，校验管理员权限
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      businessCode: BusinessCodeEnum.NotLoggedIn,
      httpCode: HttpCodeEnum.Unauthorized,
      message: "未登录，无法发布宠物信息",
    };
  }
  const token = authHeader.replace("Bearer ", "");
  const userInfo = verifyToken(token);

  // 2. 解析请求参数
  const {
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
  } = await req.json();

  // 3. 核心字段校验（新增宠物性别枚举校验）
  if (!name || !species || gender === undefined) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "宠物名称、种类、性别为必填项",
    };
  }

  if (name.length > 50) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "宠物名称长度不能超过50字",
    };
  }

  // 宠物性别枚举校验
  const validGender = Object.keys(PetGenderMap).map(Number);
  if (!validGender.includes(Number(gender))) {
    const validLabels = validGender
      .map((v) => PetGenderMap[v as PetGenderEnum].label)
      .join("、");
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: `性别只能为：${validLabels}`,
    };
  }

  // 疫苗状态校验
  const validVaccineStatus = Object.keys(PetVaccineStatusMap).map(Number);
  if (
    vaccine_status !== undefined &&
    !validVaccineStatus.includes(Number(vaccine_status))
  ) {
    const validLabels = validVaccineStatus
      .map((v) => PetVaccineStatusMap[v as PetVaccineStatusEnum].label)
      .join("、");
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: `疫苗状态只能为：${validLabels}`,
    };
  }

  // 绝育状态校验
  const validNeutered = Object.keys(PetNeuteredMap).map(Number);
  if (neutered !== undefined && !validNeutered.includes(Number(neutered))) {
    const validLabels = validNeutered
      .map((v) => PetNeuteredMap[v as PetNeuteredEnum].label)
      .join("、");
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: `绝育状态只能为：${validLabels}`,
    };
  }

  // 体重格式校验
  if (
    weight &&
    (isNaN(Number(weight)) || Number(weight) < 0 || Number(weight) > 999.99)
  ) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "体重需为0-999.99之间的数字",
    };
  }

  // 年龄格式校验
  if (age && (isNaN(Number(age)) || Number(age) < 0)) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "宠物年龄需为非负整数（单位：月）",
    };
  }

  // 4. 处理图片URL
  let finalImageUrls = "";
  if (image_urls && image_urls.trim()) {
    finalImageUrls = Array.isArray(image_urls)
      ? image_urls.join(",")
      : image_urls.replace(/，/g, ",");
  }

  // 5. 插入数据库
  try {
    await pool.query(
      `INSERT INTO pet (
        name, species, breed, age, gender, weight, health_status,
        vaccine_status, neutered, description, image_urls, status, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        species,
        breed || null,
        age ? Number(age) : null,
        Number(gender), // 宠物性别（PetGenderEnum值）
        weight ? Number(weight) : null,
        health_status || null,
        Number(vaccine_status) || PetVaccineStatusEnum.Unvaccinated,
        Number(neutered) || PetNeuteredEnum.Unknown,
        description || null,
        finalImageUrls,
        PetStatusEnum.Pending,
        userInfo.payload?.user_id,
      ]
    );
  } catch (error) {
    return {
      businessCode: BusinessCodeEnum.InternalServerError,
      httpCode: HttpCodeEnum.ServerError,
      message: "发布宠物信息失败，请重试",
    };
  }

  // 6. 返回成功响应
  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Created,
    message: "宠物领养信息发布成功（待审核）",
    data: null,
  };
};

export const POST = withApiHandler(createPetHandler);
