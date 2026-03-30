import { Prisma } from "@prisma/client";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types/common/enum";

export type RegisterDbErrorResponse = {
  businessCode: BusinessCodeEnum;
  httpCode: HttpCodeEnum;
  message: string;
};

/** 将 Prisma 异常转为注册接口可读响应（并打日志） */
export function mapRegisterPrismaError(
  e: unknown,
  logPrefix: string
): RegisterDbErrorResponse {
  console.error(logPrefix, e);

  if (e instanceof Prisma.PrismaClientInitializationError) {
    const detail =
      process.env.NODE_ENV === "development"
        ? ` 详情：${e.message || e.errorCode || ""}`
        : "";
    return {
      businessCode: BusinessCodeEnum.ServerBusinessError,
      httpCode: HttpCodeEnum.ServerError,
      message:
        "数据库未正确配置或无法连接，请检查 MYSQL_* / DATABASE_URL、MySQL 是否已启动；若 .env 里密码/用户名后写了 # 注释，请改成单独一行或去掉行内注释。" +
        detail,
    };
  }

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      const meta = e.meta as { target?: string[] } | undefined;
      const t = (meta?.target ?? []).join(",");
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
    if (e.code === "P2021" || e.code === "P1003") {
      return {
        businessCode: BusinessCodeEnum.ServerBusinessError,
        httpCode: HttpCodeEnum.ServerError,
        message: "数据库或数据表不存在，请在库中执行 Prisma 迁移或初始化 SQL",
      };
    }
    if (e.code === "P2014" || e.code === "P2003") {
      return {
        businessCode: BusinessCodeEnum.ServerBusinessError,
        httpCode: HttpCodeEnum.ServerError,
        message: "数据库约束错误，请确认表结构与当前代码一致",
      };
    }
  }

  return {
    businessCode: BusinessCodeEnum.DataInsertFailed,
    httpCode: HttpCodeEnum.ServerError,
    message: "注册失败，请稍后重试（详见服务端日志）",
  };
}
