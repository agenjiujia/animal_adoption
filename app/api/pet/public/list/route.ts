import { NextRequest, NextResponse } from "next/server";
import { BusinessCodeEnum, HttpCodeEnum, UserRoleEnum } from "@/types";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import { resolveAuth } from "@/lib/auth";

/**
 * 首页公共宠物列表（不强制登录，仅展示待领养宠物）
 */
export async function POST(req: NextRequest) {
  const auth = resolveAuth(req);
  const currentUserId = auth.ok ? auth.user.userId : null;
  const isAdmin = auth.ok ? auth.user.role === UserRoleEnum.Admin : false;

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
    // 仅查询状态为 0 (待领养) 的宠物
    const whereSql = "WHERE status = 0";

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM pet ${whereSql}`
    );
    const total = countResult[0]?.total || 0;

    // 如果用户已登录，联表查询申请状态
    let listSql = `SELECT * FROM pet ${whereSql} ORDER BY create_time DESC LIMIT ? OFFSET ?`;
    let queryParams: (string | number)[] = [pageSize, offset];

    if (currentUserId) {
      listSql = `
        SELECT p.*, 
        (SELECT COUNT(*) FROM adoption_application a WHERE a.pet_id = p.pet_id AND a.user_id = ? AND a.status = 0) as is_applied,
        (SELECT COUNT(*) FROM pet_favorite f WHERE f.pet_id = p.pet_id AND f.user_id = ?) as is_favorited
        FROM pet p 
        ${whereSql} 
        ORDER BY p.create_time DESC 
        LIMIT ? OFFSET ?
      `;
      queryParams = [currentUserId, currentUserId, pageSize, offset];
    }

    const [listResult] = await pool.query<RowDataPacket[]>(
      listSql,
      queryParams
    );

    // 新增：获取未读通知（仅在第一页时返回，或者始终返回）
    let notifications: RowDataPacket[] = [];
    if (currentUserId && pageNum === 1) {
      // 1. 获取给普通用户的通知（申请结果）
      const [userNotifResult] = await pool.query<RowDataPacket[]>(
        `SELECT a.*, p.name as pet_name, 'USER' as type
         FROM adoption_application a 
         JOIN pet p ON a.pet_id = p.pet_id 
         WHERE a.user_id = ? AND a.is_read = 0 AND a.status IN (2, 3)`,
        [currentUserId]
      );
      notifications = [...userNotifResult];

      // 2. 如果是管理员，获取新申请通知
      if (isAdmin) {
        const [adminNotifResult] = await pool.query<RowDataPacket[]>(
          `SELECT a.*, p.name as pet_name, u.username as applicant_name, 'ADMIN' as type
           FROM adoption_application a 
           JOIN pet p ON a.pet_id = p.pet_id 
           JOIN user u ON a.user_id = u.user_id
           WHERE a.is_admin_read = 0 AND a.status = 0`
        );
        notifications = [...notifications, ...adminNotifResult];
      }
    }

    return NextResponse.json({
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "查询成功",
      data: {
        list: listResult,
        total,
        pageNum,
        pageSize,
        notifications, // 返回未读通知
      },
    });
  } catch (error) {
    console.error("Public pet list error:", error);
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
