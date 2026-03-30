import { NextRequest, NextResponse } from "next/server";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import prisma from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import { imageUrlsToApiField } from "@/lib/imageUrls";

/**
 * 获取当前用户的领养申请记录
 * GET /api/adoption/my-list
 */
export async function GET(req: NextRequest) {
  const auth = resolveAuth(req);
  if (!auth.ok) {
    return NextResponse.json(auth.error, { status: 401 });
  }

  const userId = auth.user.userId;

  try {
    const rows = await prisma.adoptionApply.findMany({
      where: { apply_user_id: userId },
      orderBy: { create_time: "desc" },
      include: {
        pet: {
          include: {
            publisher: {
              select: { username: true, avatar: true },
            },
          },
        },
      },
    });

    const list = rows.map((a) => ({
      ...a,
      pet_name: a.pet?.name,
      species: a.pet?.species,
      breed: a.pet?.breed,
      image_urls: imageUrlsToApiField(a.pet?.image_urls),
      pet_description: a.pet?.description,
      owner_name: a.pet?.publisher?.username,
      owner_avatar: a.pet?.publisher?.avatar,
    }));

    return NextResponse.json({
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "查询成功",
      data: { list },
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
