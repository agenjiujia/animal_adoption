import * as jose from "jose";

/**
 * Edge Middleware 内校验 JWT（与 jsonwebtoken HS256 签发兼容）
 */
export async function verifyJwtEdge(token: string): Promise<{
  isValid: boolean;
  isExpired: boolean;
  message: string;
  payload?: { user_id?: number; role?: number; username?: string; phone?: string };
}> {
  if (!process.env.JWT_SECRET) {
    return {
      isValid: false,
      isExpired: false,
      message: "服务器未配置 JWT_SECRET",
    };
  }
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return {
      isValid: true,
      isExpired: false,
      message: "ok",
      payload: payload as {
        user_id?: number;
        role?: number;
        username?: string;
        phone?: string;
      },
    };
  } catch (e) {
    if (e instanceof jose.errors.JWTExpired) {
      return {
        isValid: false,
        isExpired: true,
        message: "Token 已过期",
      };
    }
    const err = e as Error;
    return {
      isValid: false,
      isExpired: false,
      message: err.message || "Token 无效",
    };
  }
}
