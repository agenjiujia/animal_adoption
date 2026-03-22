import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { withApiHandler } from "@/response";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types/common/enum";

/**
 * 注册接口核心业务逻辑
 * 仅返回纯业务对象，由 withApiHandler 自动包装通用响应格式
 */
const registerHandler = async (req: NextRequest) => {
  // 1. 解析请求参数
  const { username, phone, password, identityCard, address, email } =
    await req.json();

  // 2. 基础参数校验
  if (!username || !phone || !password || !identityCard || !address || !email) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "用户名、手机号、密码、身份证号、地址、邮箱都为必填项！",
    };
  }

  // 3. 手机号格式校验
  const phoneReg = /^1[3-9]\d{9}$/;
  if (!phoneReg.test(phone)) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请输入正确的11位手机号！",
    };
  }

  // 4. 密码长度校验
  if (password.length < 6) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "密码长度不能少于6位！",
    };
  }
  // 5.身份证号格式简易校验（18位）
  const idCardReg = /^\d{17}[\dXx]$/;
  if (!idCardReg.test(identityCard)) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请输入正确的18位身份证号！",
    };
  }
  // 6. 邮箱格式校验
  const emailReg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailReg.test(email)) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请输入正确的邮箱格式！",
    };
  }

  // 7. 唯一字段重复校验
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
