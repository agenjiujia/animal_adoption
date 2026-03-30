import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "@/lib/db";
import { UserStatusEnum } from "@/types";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types/common/enum";
import { wrapBusinessResponse, generateRequestId } from "@/utils/response/core";
import { loginSchema } from "@/lib/schemas/auth";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_MAX_AGE,
} from "@/lib/constants/auth";

/**
 * 用户登录：校验账号密码，签发 JWT，并写入 HttpOnly Cookie（供服务端校验 /admin）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const apiRes = wrapBusinessResponse({
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: parsed.error.issues[0]?.message ?? "参数校验失败",
      });
      return NextResponse.json(apiRes, { status: Number(apiRes.httpCode) });
    }

    const { phone, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      const apiRes = wrapBusinessResponse({
        businessCode: BusinessCodeEnum.UserNotExist,
        httpCode: HttpCodeEnum.NotFound,
        message: "该手机号未注册！",
      });
      return NextResponse.json(apiRes, { status: Number(apiRes.httpCode) });
    }

    if (user.status === UserStatusEnum.Disabled) {
      const apiRes = wrapBusinessResponse({
        businessCode: BusinessCodeEnum.UserAccountDisabled,
        httpCode: HttpCodeEnum.Forbidden,
        message: "账号已被禁用，请联系管理员！",
      });
      return NextResponse.json(apiRes, { status: Number(apiRes.httpCode) });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      const apiRes = wrapBusinessResponse({
        businessCode: BusinessCodeEnum.PasswordError,
        httpCode: HttpCodeEnum.Unauthorized,
        message: "密码不正确！",
      });
      return NextResponse.json(apiRes, { status: Number(apiRes.httpCode) });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        phone: user.phone,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: AUTH_COOKIE_MAX_AGE }
    );

    const businessRes = {
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

    const apiRes = wrapBusinessResponse(businessRes);
    const res = NextResponse.json(apiRes, { status: Number(apiRes.httpCode) });
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        httpCode: HttpCodeEnum.ServerError,
        businessCode: BusinessCodeEnum.ServerBusinessError,
        message: "服务器内部错误，请稍后重试",
        data: null,
        requestId: generateRequestId(),
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
