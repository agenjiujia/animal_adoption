import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { UserInfo, UserStatusEnum } from "@/types";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types/common/enum";
import { withApiHandler } from "@/response";

/**
 * 登录接口核心业务逻辑
 * 仅返回纯业务对象，通用响应格式由 withApiHandler 自动包装
 */
const loginBusinessHandler = async (req: NextRequest) => {
  // 1. 解析登录参数（手机号+密码）
  const { phone, password } = await req.json();

  // 2. 基础参数校验
  if (!phone || !password) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed, // 复用之前定义的参数校验失败枚举
      httpCode: HttpCodeEnum.BadRequest,
      message: "手机号和密码不能为空！",
    };
  }

  // 手机号格式兜底校验
  const phoneReg = /^1[3-9]\d{9}$/;
  if (!phoneReg.test(phone)) {
    return {
      businessCode: BusinessCodeEnum.ParameterValidationFailed,
      httpCode: HttpCodeEnum.BadRequest,
      message: "请输入正确的11位手机号！",
    };
  }

  // 3. 查询用户是否存在（基于手机号）
  const [users] = await pool.query(
    "SELECT user_id, username, phone, password, role, status, address, email FROM user WHERE phone = ?",
    [phone]
  );
  const userList = users as UserInfo[];

  // 4. 校验用户是否存在
  if (userList.length === 0) {
    return {
      businessCode: BusinessCodeEnum.UserNotExist,
      httpCode: HttpCodeEnum.NotFound,
      message: "该手机号未注册！",
    };
  }

  const user = userList[0];

  // 5. 校验账号状态（禁用则不允许登录）
  if (user.status === UserStatusEnum.Disabled) {
    return {
      businessCode: BusinessCodeEnum.UserAccountDisabled,
      httpCode: HttpCodeEnum.Forbidden,
      message: "账号已被禁用，请联系管理员！",
    };
  }

  // 6. 校验密码（加密对比）
  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    return {
      businessCode: BusinessCodeEnum.PasswordError,
      httpCode: HttpCodeEnum.Unauthorized,
      message: "密码不正确！",
    };
  }

  // 7. 生成JWT Token（包含用户核心信息）
  const token = jwt.sign(
    {
      user_id: user.user_id,
      username: user.username,
      phone: user.phone,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" } // 有效期7天
  );

  // 8. 返回成功的业务对象（使用你新增的 Success 枚举）
  return {
    businessCode: BusinessCodeEnum.Success,
    httpCode: HttpCodeEnum.Success,
    message: "登录成功！",
    data: {
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        phone: user.phone,
        address: user.address,
        email: user.email,
        role: user.role,
      },
    },
  };
};

/**
 * 登录接口（用 withApiHandler 包装，自动处理通用响应）
 * 全局异常由高阶函数捕获，无需手动 try/catch
 */
export const POST = withApiHandler(loginBusinessHandler);
