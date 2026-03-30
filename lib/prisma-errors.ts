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

/** 领养申请等写入 adoption_apply 时的 Prisma 错误 */
export function mapAdoptionApplyPrismaError(
  e: unknown,
  logPrefix: string
): RegisterDbErrorResponse {
  console.error(logPrefix, e);

  if (e instanceof Prisma.PrismaClientInitializationError) {
    return {
      businessCode: BusinessCodeEnum.ServerBusinessError,
      httpCode: HttpCodeEnum.ServerError,
      message: "数据库未正确配置或无法连接，请检查 DATABASE_URL / MySQL 是否可用",
    };
  }

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2022") {
      return {
        businessCode: BusinessCodeEnum.ServerBusinessError,
        httpCode: HttpCodeEnum.ServiceUnavailable,
        message:
          "无法提交申请：数据库「领养申请」表与当前程序不一致（缺列或列类型与外键不匹配）。请在本机执行：`npx tsx scripts/run-fix-adoption-apply.ts`（会按 .env 连库并执行 scripts/fix_adoption_apply.sql），或执行 `npx prisma migrate deploy` / 初始化 SQL。",
      };
    }
    if (e.code === "P2002") {
      return {
        businessCode: BusinessCodeEnum.DataAlreadyExist,
        httpCode: HttpCodeEnum.Conflict,
        message: "您已提交过该宠物的领养申请，请勿重复操作",
      };
    }
  }

  return {
    businessCode: BusinessCodeEnum.DataInsertFailed,
    httpCode: HttpCodeEnum.ServerError,
    message: "提交失败，请稍后重试（详见服务端日志）",
  };
}
