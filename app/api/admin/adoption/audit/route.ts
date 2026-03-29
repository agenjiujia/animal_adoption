import { NextRequest, NextResponse } from "next/server";
import { BusinessCodeEnum, HttpCodeEnum, UserRoleEnum } from "@/types";
import pool, { withTransaction } from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/**
 * 管理员审批领养申请
 */
export async function POST(req: NextRequest) {
  const auth = resolveAuth(req);
  if (!auth.ok || auth.user.role !== UserRoleEnum.Admin) {
    return NextResponse.json(
      {
        businessCode: BusinessCodeEnum.AdminPermissionDenied,
        httpCode: HttpCodeEnum.Forbidden,
        message: "无权访问",
      },
      { status: 403 }
    );
  }

  let body: { app_id: number; status: number; audit_remark?: string };
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "请求体须为 JSON",
      },
      { status: 400 }
    );
  }

  const { app_id, status, audit_remark } = body;
  // status: 1-通过/已领养, 2-拒绝
  if (!app_id || ![1, 2].includes(status)) {
    return NextResponse.json(
      {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "参数非法",
      },
      { status: 400 }
    );
  }

  try {
    const result = await withTransaction(async (conn) => {
      // 1. 获取申请详情
      const [appResult] = await conn.query<RowDataPacket[]>(
        "SELECT * FROM adoption_application WHERE app_id = ? FOR UPDATE",
        [app_id]
      );
      const application = appResult[0];

      if (!application) {
        throw new Error("申请单不存在");
      }

      if (application.status !== 0) {
        throw new Error("申请单已处理");
      }

      const pet_id = application.pet_id;

      // 2. 如果是通过审批 (status = 1)
      if (status === 1) {
        // 更新申请单状态为已领养 (3)
        await conn.query(
          `UPDATE adoption_application 
           SET status = 3, admin_id = ?, audit_time = NOW(), audit_remark = ? 
           WHERE app_id = ?`,
          [auth.user.userId, audit_remark || "审批通过", app_id]
        );

        // 更新宠物状态为已领养 (1)
        await conn.query("UPDATE pet SET status = 1 WHERE pet_id = ?", [
          pet_id,
        ]);

        // 将该宠物其他的待审核申请全部拒绝 (2)
        await conn.query(
          `UPDATE adoption_application 
           SET status = 2, admin_id = ?, audit_time = NOW(), audit_remark = '该宠物已被他人领养' 
           WHERE pet_id = ? AND app_id != ? AND status = 0`,
          [auth.user.userId, pet_id, app_id]
        );
      } else {
        // 3. 如果是拒绝审批 (status = 2)
        await conn.query(
          `UPDATE adoption_application 
           SET status = 2, admin_id = ?, audit_time = NOW(), audit_remark = ? 
           WHERE app_id = ?`,
          [auth.user.userId, audit_remark || "审批驳回", app_id]
        );
      }

      return true;
    });

    return NextResponse.json({
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "审批处理成功",
    });
  } catch (error) {
    console.error("Admin adoption audit error:", error);
    const message = error instanceof Error ? error.message : "系统内部错误";
    return NextResponse.json(
      {
        businessCode: BusinessCodeEnum.OperationFailed,
        httpCode: HttpCodeEnum.ServerError,
        message,
      },
      { status: 500 }
    );
  }
}
