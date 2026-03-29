import { NextRequest, NextResponse } from "next/server";
import { BusinessCodeEnum, HttpCodeEnum, UserRoleEnum } from "@/types";
import pool from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/**
 * 管理员获取领养申请列表
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

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch (e) {
    // 允许空请求体
  }

  const pageNum = Number(body.pageNum || 1);
  const pageSize = Number(body.pageSize || 10);
  const offset = (pageNum - 1) * pageSize;

  try {
    // 联表查询：领养申请 + 宠物信息 + 申请人信息
    const querySql = `
      SELECT 
        a.*, 
        p.name as pet_name, 
        p.species as pet_species, 
        u.username as applicant_name, 
        u.real_name as applicant_real_name,
        u.phone as applicant_phone
      FROM adoption_application a
      LEFT JOIN pet p ON a.pet_id = p.pet_id
      LEFT JOIN user u ON a.user_id = u.user_id
      ORDER BY a.apply_time DESC
      LIMIT ? OFFSET ?
    `;

    const [countResult] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM adoption_application"
    );
    const total = countResult[0]?.total || 0;

    const [listResult] = await pool.query<RowDataPacket[]>(querySql, [
      pageSize,
      offset,
    ]);

    return NextResponse.json({
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "查询成功",
      data: {
        list: listResult,
        total,
        pageNum,
        pageSize,
      },
    });
  } catch (error) {
    console.error("Admin adoption list error:", error);
    return NextResponse.json(
      {
        businessCode: BusinessCodeEnum.InternalServerError,
        httpCode: HttpCodeEnum.ServerError,
        message: "系统内部错误",
      },
      { status: 500 }
    );
  }
}
