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
import { normalizeImageUrlsInput } from "@/lib/imageUrls";

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
    species === undefined ||
    species === null ||
    gender === undefined
  ) {
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

  try {
    await prisma.pet.create({
      data: {
        user_id: auth.user.userId,
        name,
        species: speciesLabel,
        breed: breed ? String(breed).trim() : null,
        age:
          age !== undefined && age !== null && age !== ""
            ? Number(age)
            : null,
        gender: genderNum,
        weight:
          weight !== undefined && weight !== null && weight !== ""
            ? Number(weight)
            : null,
        health_status: health_status || null,
        vaccine_status:
          Number(vaccine_status) || PetVaccineStatusEnum.Unknown,
        neutered: Number(neutered) || PetNeuteredEnum.Unknown,
        description: description || null,
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
