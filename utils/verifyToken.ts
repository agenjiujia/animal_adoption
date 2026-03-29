import jwt, { type JwtPayload } from "jsonwebtoken";
import { UserRoleEnum } from "@/types";

export interface TokenVerifyResult extends JwtPayload {
  isValid: boolean;
  isExpired: boolean;
  message: string;
  payload?: JwtPayload & { user_id: number; role: UserRoleEnum };
}

/** 校验 JWT：签名与有效期 */
export const verifyToken = (token: string): TokenVerifyResult => {
  try {
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
