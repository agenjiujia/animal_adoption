import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import {
  BusinessCodeEnum,
  HttpCodeEnum,
  PetStatusEnum,
  PetVaccineStatusEnum,
  PetNeuteredEnum,
  PetGenderEnum,
  PetSpeciesEnum,
} from "@/types";
import {
  PetVaccineStatusMap,
  PetNeuteredMap,
  PetGenderMap,
  PetSpeciesMap,
} from "@/constant";
import prisma from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import { imageUrlsToApiField, normalizeImageUrlsInput } from "@/lib/imageUrls";

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

  if (
    !name ||
    !String(name).trim() ||
    species === undefined ||
    species === null ||
    !String(breed ?? "").trim() ||
    age === undefined ||
    age === null ||
    gender === undefined ||
    weight === undefined ||
    weight === null ||
    !String(health_status ?? "").trim() ||
    vaccine_status === undefined ||
    vaccine_status === null ||
    neutered === undefined ||
    neutered === null ||
    !String(description ?? "").trim() ||
    image_urls === undefined ||
    image_urls === null
  ) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请完整填写发布单所有内容（含图片）",
    };
  }

  if (name.length > 50) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "宠物名称长度不能超过50字",
    };
  }

  const speciesEnum = Number(species);
  const speciesLabel =
    PetSpeciesMap[speciesEnum as PetSpeciesEnum]?.label || "其他";

  const genderNum = Number(gender);
  if (PetGenderMap[genderNum as PetGenderEnum] === undefined) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "性别取值非法",
    };
  }

  const ageNum = Number(age);
  if (isNaN(ageNum) || ageNum < 0 || !Number.isInteger(ageNum)) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "年龄须为非负整数",
    };
  }

  const weightNum = Number(weight);
  if (isNaN(weightNum) || weightNum < 0 || weightNum > 999.99) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "体重取值非法",
    };
  }

  const vaccineNum = Number(vaccine_status);
  if (PetVaccineStatusMap[vaccineNum as PetVaccineStatusEnum] === undefined) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "疫苗情况取值非法",
    };
  }

  const neuteredNum = Number(neutered);
  if (PetNeuteredMap[neuteredNum as PetNeuteredEnum] === undefined) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "绝育情况取值非法",
    };
  }

  const parsedImageUrls = imageUrlsToApiField(image_urls);
  if (parsedImageUrls.length < 1 || parsedImageUrls.length > 5) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "图片数量需为 1-5 张",
    };
  }

  try {
    await prisma.pet.create({
      data: {
        user_id: auth.user.userId,
        name,
        species: speciesLabel,
        breed: String(breed).trim(),
        age: ageNum,
        gender: genderNum,
        weight: weightNum,
        health_status: String(health_status).trim(),
        vaccine_status: vaccineNum,
        neutered: neuteredNum,
        description: String(description).trim(),
        image_urls: normalizeImageUrlsInput(image_urls),
        status: PetStatusEnum.ForAdoption,
      },
    });
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
