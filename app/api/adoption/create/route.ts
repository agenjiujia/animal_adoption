import { NextRequest, NextResponse } from "next/server";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import pool from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/**
 * 创建领养申请
 */
export async function POST(req: NextRequest) {
  const auth = resolveAuth(req);
  if (!auth.ok) {
    return NextResponse.json(auth.error, { status: 401 });
  }

  let body: { pet_id: number; reason?: string };
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

  const { pet_id, reason } = body;
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
    // 1. 检查宠物是否存在且状态为待领养
    const [petResult] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM pet WHERE pet_id = ?",
      [pet_id]
    );
    const pet = petResult[0];

    if (!pet) {
      return NextResponse.json(
        {
          businessCode: BusinessCodeEnum.DataNotExist,
          httpCode: HttpCodeEnum.NotFound,
          message: "宠物不存在",
        },
        { status: 404 }
      );
    }

    if (pet.status !== 0) {
      return NextResponse.json(
        {
          businessCode: BusinessCodeEnum.PermissionDenied,
          httpCode: HttpCodeEnum.Forbidden,
          message: "该宠物目前不可领养",
        },
        { status: 403 }
      );
    }

    // 新增：不允许领养自己发布的宠物
    if (pet.user_id === auth.user.userId) {
      return NextResponse.json(
        {
          businessCode: BusinessCodeEnum.PermissionDenied,
          httpCode: HttpCodeEnum.Forbidden,
          message: "您不能领养自己发布的宠物",
        },
        { status: 403 }
      );
    }

    // 2. 检查用户是否已经申请过该宠物且还在审核中
    const [existingApp] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM adoption_application WHERE pet_id = ? AND user_id = ? AND status = 0",
      [pet_id, auth.user.userId]
    );

    if (existingApp.length > 0) {
      return NextResponse.json(
        {
          businessCode: BusinessCodeEnum.DataAlreadyExist,
          httpCode: HttpCodeEnum.Conflict,
          message: "您已提交过该宠物的领养申请，请耐心等待审核",
        },
        { status: 409 }
      );
    }

    // 3. 创建申请
    await pool.query(
      "INSERT INTO adoption_application (pet_id, user_id, reason, status) VALUES (?, ?, ?, ?)",
      [pet_id, auth.user.userId, reason || "", 0]
    );

    return NextResponse.json({
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "申请提交成功",
    });
  } catch (error) {
    console.error("Create adoption application error:", error);
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
