import { NextRequest, NextResponse } from "next/server";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import pool from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/**
 * 获取当前用户的领养申请记录
 */
export async function GET(req: NextRequest) {
  const auth = resolveAuth(req);
  if (!auth.ok) {
    return NextResponse.json(auth.error, { status: 401 });
  }

  const userId = auth.user.userId;

  try {
    // 联表查询宠物信息及申请单信息
    const [listResult] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, p.name as pet_name, p.species, p.breed, p.image_urls, p.description as pet_description,
              u.username as owner_name
       FROM adoption_application a
       JOIN pet p ON a.pet_id = p.pet_id
       JOIN user u ON p.user_id = u.user_id
       WHERE a.user_id = ?
       ORDER BY a.apply_time DESC`,
      [userId]
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
    console.error("My adoption list error:", error);
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
