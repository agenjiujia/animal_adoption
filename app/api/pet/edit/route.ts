import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { withApiHandler } from "@/utils/response/hoc";
import {
  BusinessCodeEnum,
  HttpCodeEnum,
  PetOperateTypeEnum,
  PetSpeciesEnum,
} from "@/types";
import { PetSpeciesMap } from "@/constant";
import prisma, { withTransaction } from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import { normalizeImageUrlsInput } from "@/lib/imageUrls";

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

  const updateData: Prisma.PetUpdateInput = {};

  if (name !== undefined) {
    if (!String(name).trim() || String(name).length > 50) {
      return {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "名称不能为空且不超过50字",
      };
    }
    updateData.name = String(name).trim();
  }

  if (species !== undefined) {
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
    updateData.gender = g;
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
    updateData.vaccine_status = v;
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
    updateData.neutered = n;
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
    updateData.weight = w;
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
    updateData.age = a;
  }

  if (breed !== undefined) {
    updateData.breed = breed ? String(breed).trim() : null;
  }
  if (health_status !== undefined) {
    updateData.health_status = health_status ? String(health_status) : null;
  }
  if (description !== undefined) {
    updateData.description = description ? String(description) : null;
  }
  if (image_urls !== undefined) {
    updateData.image_urls = normalizeImageUrlsInput(image_urls);
  }

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
