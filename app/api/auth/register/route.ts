import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { withApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types/common/enum";
import { registerSchema } from "@/lib/schemas/auth";
import { mapRegisterPrismaError } from "@/lib/prisma-errors";

/**
 * 用户注册（Zod 校验 + 唯一约束检查）
 * 所有 Prisma 调用集中在 try/catch，避免未捕获异常变成笼统 500
 */
const registerHandler = async (req: NextRequest) => {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      businessCode: BusinessCodeEnum.DataFormatError,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请求体须为 JSON",
    };
  }
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: parsed.error.issues[0]?.message ?? "参数错误",
    };
  }
  const {
    username,
    real_name,
    phone,
    password,
    identityCard,
    address,
    email,
    avatar,
  } = parsed.data;

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  try {
    const usernameExist = await prisma.user.findFirst({
      where: { username },
      select: { user_id: true },
    });
    if (usernameExist) {
      return {
        businessCode: BusinessCodeEnum.UserAlreadyExist,
        httpCode: HttpCodeEnum.Conflict,
        message: "该用户名已被注册！",
      };
    }

    if (email) {
      const emailExist = await prisma.user.findFirst({
        where: { email },
        select: { user_id: true },
      });
      if (emailExist) {
        return {
          businessCode: BusinessCodeEnum.UserAlreadyExist,
          httpCode: HttpCodeEnum.Conflict,
          message: "该邮箱已被注册！",
        };
      }
    }

    const phoneExist = await prisma.user.findFirst({
      where: { phone },
      select: { user_id: true },
    });
    if (phoneExist) {
      return {
        businessCode: BusinessCodeEnum.UserAlreadyExist,
        httpCode: HttpCodeEnum.Conflict,
        message: "该手机号已注册！",
      };
    }

    const idCardExist = await prisma.user.findFirst({
      where: { id_card: identityCard },
      select: { user_id: true },
    });
    if (idCardExist) {
      return {
        businessCode: BusinessCodeEnum.UserAlreadyExist,
        httpCode: HttpCodeEnum.Conflict,
        message: "该身份证号已被注册！",
      };
    }

    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;
    const role = isFirstUser ? 1 : 0;

    await prisma.user.create({
      data: {
        username,
        real_name,
        avatar: avatar || null,
        phone,
        id_card: identityCard,
        address,
        email: email ?? null,
        password: hashedPassword,
        role,
        status: 1,
      },
    });
  } catch (e) {
    return mapRegisterPrismaError(e, "register:");
  }

  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Created,
    message: "注册成功！请前往登录",
    data: null,
  };
};

export const POST = withApiHandler(registerHandler);
