import { NextRequest, NextResponse } from "next/server";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import pool from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/**
 * 获取当前用户的收藏列表
 */
export async function GET(req: NextRequest) {
  const auth = resolveAuth(req);
  if (!auth.ok) {
    return NextResponse.json(auth.error, { status: 401 });
  }

  const userId = auth.user.userId;

  try {
    // 联表查询宠物信息
    const [listResult] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, 
       (SELECT COUNT(*) FROM adoption_application a WHERE a.pet_id = p.pet_id AND a.user_id = ? AND a.status = 0) as is_applied,
       1 as is_favorited
       FROM pet p
       JOIN pet_favorite f ON p.pet_id = f.pet_id
       WHERE f.user_id = ?
       ORDER BY f.create_time DESC`,
      [userId, userId]
    );

    return NextResponse.json({
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "查询成功",
      data: {
        list: listResult,
      },
    });
  } catch (error) {
    console.error("Favorite list error:", error);
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
