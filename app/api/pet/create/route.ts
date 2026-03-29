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
import { resolveAuth } from "@/lib/auth";

/** 登录用户发布宠物，默认 status=待领养 */
const createPetHandler = async (req: NextRequest) => {
  const auth = resolveAuth(req);
  if (!auth.ok) return auth.error;

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

  if (!name || species === undefined || species === null || gender === undefined) {
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

  const speciesStr = String(species).trim();
  if (!speciesStr || speciesStr.length > 30) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "种类长度需在1-30字符内",
    };
  }

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

  const validVaccineStatus = Object.keys(PetVaccineStatusMap).map(Number);
  if (
    vaccine_status !== undefined &&
    !validVaccineStatus.includes(Number(vaccine_status))
  ) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "疫苗状态取值非法",
    };
  }

  const validNeutered = Object.keys(PetNeuteredMap).map(Number);
  if (neutered !== undefined && !validNeutered.includes(Number(neutered))) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "绝育状态取值非法",
    };
  }

  if (
    weight !== undefined &&
    weight !== null &&
    weight !== "" &&
    (isNaN(Number(weight)) || Number(weight) < 0 || Number(weight) > 999.99)
  ) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "体重需为0-999.99之间的数字",
    };
  }

  if (
    age !== undefined &&
    age !== null &&
    age !== "" &&
    (isNaN(Number(age)) || Number(age) < 0 || !Number.isInteger(Number(age)))
  ) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "年龄需为非负整数（月）",
    };
  }

  let finalImageUrls = "";
  if (image_urls && String(image_urls).trim()) {
    finalImageUrls = Array.isArray(image_urls)
      ? image_urls.join(",")
      : String(image_urls).replace(/，/g, ",");
  }

  try {
    await pool.query(
      `INSERT INTO pet (
        name, species, breed, age, gender, weight, health_status,
        vaccine_status, neutered, description, image_urls, status, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        speciesStr,
        breed ? String(breed).trim() : null,
        age !== undefined && age !== null && age !== ""
          ? Number(age)
          : null,
        Number(gender),
        weight !== undefined && weight !== null && weight !== ""
          ? Number(weight)
          : null,
        health_status || null,
        Number(vaccine_status) || PetVaccineStatusEnum.Unknown,
        Number(neutered) || PetNeuteredEnum.Unknown,
        description || null,
        finalImageUrls,
        PetStatusEnum.ForAdoption,
        auth.user.userId,
      ]
    );
  } catch (e) {
    console.error(e);
    return {
      businessCode: BusinessCodeEnum.DataInsertFailed,
      httpCode: HttpCodeEnum.ServerError,
      message: "发布失败，请重试",
    };
  }

  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Created,
    message: "发布成功",
    data: null,
  };
};

export const POST = withApiHandler(createPetHandler);
