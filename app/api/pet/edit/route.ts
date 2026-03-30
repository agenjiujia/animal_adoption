import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import {
  BusinessCodeEnum,
  HttpCodeEnum,
  PetOperateTypeEnum,
  PetSpeciesEnum,
  PetVaccineStatusEnum,
  PetNeuteredEnum,
} from "@/types";
import { PetNeuteredMap, PetSpeciesMap, PetVaccineStatusMap } from "@/constant";
import prisma, { withTransaction } from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import { imageUrlsToApiField, normalizeImageUrlsInput } from "@/lib/imageUrls";

/**
 * 发布者修改宠物内容（不含 status）
 */
const editPetHandler = async (req: NextRequest) => {
  const auth = resolveAuth(req);
  if (!auth.ok) return auth.error;

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

  const petInfo = await prisma.pet.findUnique({ where: { pet_id: petId } });
  if (!petInfo) {
    return {
      businessCode: BusinessCodeEnum.DataNotExist,
      httpCode: HttpCodeEnum.NotFound,
      message: "宠物不存在",
    };
  }

  if (petInfo.user_id !== auth.user.userId) {
    return {
      businessCode: BusinessCodeEnum.DataPermissionDenied,
      httpCode: HttpCodeEnum.Forbidden,
      message: "仅可编辑本人发布的宠物",
    };
  }

  // 全字段必填（与发布单一致）
  if (
    !String(name ?? "").trim() ||
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

  const updateData: Prisma.PetUpdateInput = {};

  if (!String(name).trim() || String(name).length > 50) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "名称不能为空且不超过50字",
    };
  }
  updateData.name = String(name).trim();

  const sEnum = Number(species);
  const sLabel = PetSpeciesMap[sEnum as PetSpeciesEnum]?.label;
  if (!sLabel) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "物种类型非法",
    };
  }
  updateData.species = sLabel;

  const g = Number(gender);
  if (![0, 1].includes(g)) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "gender 只能为 0 或 1",
    };
  }
  updateData.gender = g;

  const v = Number(vaccine_status);
  if (PetVaccineStatusMap[v as PetVaccineStatusEnum] === undefined) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "vaccine_status 非法",
    };
  }
  updateData.vaccine_status = v;

  const n = Number(neutered);
  if (PetNeuteredMap[n as PetNeuteredEnum] === undefined) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "neutered 非法",
    };
  }
  updateData.neutered = n;

  const w = Number(weight);
  if (isNaN(w) || w < 0 || w > 999.99) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "体重非法",
    };
  }
  updateData.weight = w;

  const a = Number(age);
  if (isNaN(a) || a < 0 || !Number.isInteger(a)) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "年龄须为非负整数",
    };
  }
  updateData.age = a;

  updateData.breed = String(breed).trim();
  updateData.health_status = String(health_status).trim();
  updateData.description = String(description).trim();

  const parsedImageUrls = imageUrlsToApiField(image_urls);
  if (parsedImageUrls.length < 1 || parsedImageUrls.length > 5) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "图片数量需为 1-5 张",
    };
  }
  updateData.image_urls = normalizeImageUrlsInput(image_urls);

  const keys = Object.keys(updateData);
  if (keys.length === 0) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "没有可更新字段",
    };
  }

  try {
    await withTransaction(async (tx) => {
      const current = await tx.pet.findUnique({ where: { pet_id: petId } });
      if (!current) throw new Error("NF");
      await tx.pet.update({
        where: { pet_id: petId },
        data: updateData,
      });
      const patchJson = Object.fromEntries(
        keys.map((k) => [
          k,
          (updateData as Record<string, unknown>)[k],
        ])
      ) as Prisma.InputJsonValue;
      await tx.petHistory.create({
        data: {
          pet_id: petId,
          old_data: JSON.parse(JSON.stringify(current)) as Prisma.InputJsonValue,
          new_data: patchJson,
          operator_id: auth.user.userId,
          operate_type: PetOperateTypeEnum.CONTENT_EDIT,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NF") {
      return {
        businessCode: BusinessCodeEnum.DataNotExist,
        httpCode: HttpCodeEnum.NotFound,
        message: "宠物不存在",
      };
    }
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
