import jwt, { type JwtPayload } from "jsonwebtoken";
import { UserRoleEnum } from "@/types";

/**
 * JWT Token 校验结果类型定义
 */
export interface TokenVerifyResult extends JwtPayload {
  /** Token 是否合法有效（未过期+签名正确） */
  isValid: boolean;
  /** 是否因过期导致无效 */
  isExpired: boolean;
  /** 校验提示信息 */
  message: string;
  /** Token 载荷数据（有效时存在） */
  payload?: JwtPayload & { user_id: number; role: UserRoleEnum };
}

/**
 * 校验 JWT Token 合法性与过期状态
 * @param token 待校验的 Token 字符串
 * @param secretKey JWT 签名密钥
 * @returns Token 校验结果
 */
export const verifyToken = (token: string): TokenVerifyResult => {
  try {
    // verify 方法自动校验签名和 exp 过期时间
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload & {
      user_id: number;
      role: UserRoleEnum;
    };

    return {
      isValid: true,
      isExpired: false,
      message: "Token 有效且未过期",
      payload,
    };
  } catch (error) {
    const errorObj = error as Error;

    // 区分 Token 过期和其他无效场景
    if (errorObj.name === "TokenExpiredError") {
      return {
        isValid: false,
        isExpired: true,
        message: "Token 已过期",
        payload: undefined,
      };
    }

    return {
      isValid: false,
      isExpired: false,
      message: `Token 校验失败：${errorObj.message}`,
      payload: undefined,
    };
  }
};
