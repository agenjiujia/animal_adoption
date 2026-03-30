import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { withApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types/common/enum";
import { registerSchema } from "@/lib/schemas/auth";

/**
 * 用户注册（Zod 校验 + 唯一约束检查）
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

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  let userCount: number;
  try {
    userCount = await prisma.user.count();
  } catch (e) {
    console.error("register db:", e);
    return {
      businessCode: BusinessCodeEnum.ServerBusinessError,
      httpCode: HttpCodeEnum.ServerError,
      message: "数据库连接失败，请检查 DATABASE_URL 或 MYSQL_* 配置与迁移是否已执行",
    };
  }

  const isFirstUser = userCount === 0;
  const role = isFirstUser ? 1 : 0;

  try {
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
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const meta = e.meta as { target?: string[] } | undefined;
      const t = meta?.target?.join(",") ?? "";
      let msg = "该信息已被占用，请更换后重试";
      if (t.includes("username")) msg = "该用户名已被注册！";
      else if (t.includes("phone")) msg = "该手机号已注册！";
      else if (t.includes("email")) msg = "该邮箱已被注册！";
      else if (t.includes("id_card")) msg = "该身份证号已被注册！";
      return {
        businessCode: BusinessCodeEnum.UserAlreadyExist,
        httpCode: HttpCodeEnum.Conflict,
        message: msg,
      };
    }
    console.error("register create:", e);
    return {
      businessCode: BusinessCodeEnum.DataInsertFailed,
      httpCode: HttpCodeEnum.ServerError,
      message: "注册失败，请稍后重试",
    };
  }

  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Created,
    message: "注册成功！请前往登录",
    data: null,
  };
};

export const POST = withApiHandler(registerHandler);
