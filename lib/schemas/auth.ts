import { z } from "zod";

/** 登录请求体校验 */
export const loginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的11位手机号"),
  password: z.string().min(1, "密码不能为空"),
});

/** 注册请求体校验 */
export const registerSchema = z.object({
  username: z.string().min(2).max(50),
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的11位手机号"),
  password: z.string().min(6, "密码长度不能少于6位"),
  identityCard: z.string().regex(/^\d{17}[\dXx]$/, "请输入正确的18位身份证号"),
  address: z.string().min(1, "地址为必填项"),
  email: z.string().email("请输入正确的邮箱"),
});
