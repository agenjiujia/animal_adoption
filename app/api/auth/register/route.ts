import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
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
  const { username, phone, password, identityCard, address, email } =
    parsed.data;

  // 唯一字段重复校验
  // 7.1 校验用户名是否已存在（对应 uk_username 唯一索引）
  const [usernameExist] = await pool.query(
    "SELECT user_id FROM user WHERE username = ?",
    [username]
  );
  if ((usernameExist as unknown[]).length > 0) {
    return {
      businessCode: BusinessCodeEnum.UserAlreadyExist,
      httpCode: HttpCodeEnum.Conflict,
      message: "该用户名已被注册！",
    };
  }

  // 7.2 校验邮箱是否已存在（对应 uk_email 唯一索引）
  const [emailExist] = await pool.query(
    "SELECT user_id FROM user WHERE email = ?",
    [email]
  );
  if ((emailExist as unknown[]).length > 0) {
    return {
      businessCode: BusinessCodeEnum.UserAlreadyExist,
      httpCode: HttpCodeEnum.Conflict,
      message: "该邮箱已被注册！",
    };
  }

  // 7.3 校验手机号是否已存在（对应 uk_phone 唯一索引）
  const [phoneExist] = await pool.query(
    "SELECT user_id FROM user WHERE phone = ?",
    [phone]
  );
  if ((phoneExist as unknown[]).length > 0) {
    return {
      businessCode: BusinessCodeEnum.UserAlreadyExist,
      httpCode: HttpCodeEnum.Conflict,
      message: "该手机号已注册！",
    };
  }

  // 7.4 校验身份证号是否已存在（业务唯一性）
  const [idCardExist] = await pool.query(
    "SELECT user_id FROM user WHERE id_card = ?",
    [identityCard]
  );
  if ((idCardExist as unknown[]).length > 0) {
    return {
      businessCode: BusinessCodeEnum.UserAlreadyExist,
      httpCode: HttpCodeEnum.Conflict,
      message: "该身份证号已被注册！",
    };
  }

  // 8. 密码加密
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  // 9. 插入用户数据
  await pool.query(
    `INSERT INTO user (
      username, phone, id_card, address, email, password, role, status
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
    [username, phone, identityCard, address, email, hashedPassword]
  );

  // 10. 返回注册成功响应
  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Created,
    message: "注册成功！请前往登录",
    data: null,
  };
};

/**
 * 注册接口（用 withApiHandler 包装，自动处理通用响应+全局异常）
 */
export const POST = withApiHandler(registerHandler);
