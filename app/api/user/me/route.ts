import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { withApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import prisma from "@/lib/db";
import { resolveAuth } from "@/lib/auth";

/**
 * 个人中心：当前登录用户资料（不含密码）
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const auth = resolveAuth(req);
  if (!auth.ok) return auth.error;

  const row = await prisma.user.findUnique({
    where: { user_id: auth.user.userId },
    select: {
      user_id: true,
      username: true,
      email: true,
      phone: true,
      avatar: true,
      real_name: true,
      id_card: true,
      address: true,
      role: true,
      status: true,
      create_time: true,
      update_time: true,
    },
  });
  if (!row) {
    return {
      businessCode: BusinessCodeEnum.UserNotExist,
      httpCode: HttpCodeEnum.NotFound,
      message: "用户不存在",
    };
  }
  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Success,
    message: "查询成功",
    data: row,
  };
});

/**
 * 更新个人资料
 */
export const PATCH = withApiHandler(async (req: NextRequest) => {
  const auth = resolveAuth(req);
  if (!auth.ok) return auth.error;

  const body = await req.json();
  const { avatar, username, email, address, real_name } = body;

  const data: Prisma.UserUpdateInput = {};
  if (avatar !== undefined) data.avatar = avatar;
  if (username !== undefined) data.username = username;
  if (email !== undefined) data.email = email === "" ? null : email;
  if (address !== undefined) data.address = address;
  if (real_name !== undefined) data.real_name = real_name;

  if (Object.keys(data).length === 0) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请提供要更新的字段",
    };
  }

  try {
    await prisma.user.update({
      where: { user_id: auth.user.userId },
      data,
    });
  } catch {
    return {
      businessCode: BusinessCodeEnum.DataUpdateFailed,
      httpCode: HttpCodeEnum.ServerError,
      message: "更新失败（可能与其他唯一字段冲突）",
    };
  }

  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Success,
    message: "资料更新成功",
  };
});
