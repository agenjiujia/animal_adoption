import { NextRequest, NextResponse } from "next/server";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import pool from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/**
 * 切换收藏状态（收藏/取消收藏）
 */
export async function POST(req: NextRequest) {
  const auth = resolveAuth(req);
  if (!auth.ok) {
    return NextResponse.json(auth.error, { status: 401 });
  }

  const userId = auth.user.userId;
  let body: { pet_id: number };
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

  const { pet_id } = body;
  if (!pet_id) {
    return NextResponse.json(
      {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "pet_id 不能为空",
      },
      { status: 400 }
    );
  }

  try {
    // 1. 检查宠物是否存在
    const [petResult] = await pool.query<RowDataPacket[]>(
      "SELECT pet_id FROM pet WHERE pet_id = ?",
      [pet_id]
    );
    if (petResult.length === 0) {
      return NextResponse.json(
        {
          businessCode: BusinessCodeEnum.DataNotExist,
          httpCode: HttpCodeEnum.NotFound,
          message: "宠物不存在",
        },
        { status: 404 }
      );
    }

    // 2. 检查是否已经收藏
    const [favoriteResult] = await pool.query<RowDataPacket[]>(
      "SELECT favorite_id FROM pet_favorite WHERE user_id = ? AND pet_id = ?",
      [userId, pet_id]
    );

    if (favoriteResult.length > 0) {
      // 已收藏，取消收藏
      await pool.query(
        "DELETE FROM pet_favorite WHERE user_id = ? AND pet_id = ?",
        [userId, pet_id]
      );
      return NextResponse.json({
        businessCode: BusinessCodeEnum.Success,
        httpCode: HttpCodeEnum.Success,
        message: "取消收藏成功",
        data: { is_favorited: false },
      });
    } else {
      // 未收藏，添加收藏
      await pool.query(
        "INSERT INTO pet_favorite (user_id, pet_id) VALUES (?, ?)",
        [userId, pet_id]
      );
      return NextResponse.json({
        businessCode: BusinessCodeEnum.Success,
        httpCode: HttpCodeEnum.Success,
        message: "收藏成功",
        data: { is_favorited: true },
      });
    }
  } catch (error) {
    console.error("Toggle favorite error:", error);
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
