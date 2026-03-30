import { NextRequest } from "next/server";
import { withPaginationApiHandler } from "@/utils/response/hoc";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import prisma from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import type { BusinessPaginationResponse } from "@/types";
import { serializePetForApi } from "@/lib/petSerialize";

/**
 * 查询我的收藏列表接口（分页）
 * POST /api/my/favorites
 */
export const POST = withPaginationApiHandler(
  async (
    req: NextRequest
  ): Promise<BusinessPaginationResponse<Record<string, unknown>>> => {
    const auth = resolveAuth(req);
    if (!auth.ok) {
      return {
        businessCode: auth.error.businessCode,
        httpCode: auth.error.httpCode,
        message: auth.error.message,
        data: { list: [], total: 0, pageNum: 1, pageSize: 10 },
      };
    }

    const userId = auth.user.userId;
    let body: { page?: number; pageSize?: number } = {};
    try {
      body = await req.json();
    } catch (e) {
      /* ignore */
    }

    const pageNum = Number(body.page) || 1;
    const pageSize = Number(body.pageSize) || 10;
    const offset = (pageNum - 1) * pageSize;

    const total = await prisma.petFavorite.count({ where: { user_id: userId } });

    if (total === 0) {
      return {
        businessCode: BusinessCodeEnum.Success,
        httpCode: HttpCodeEnum.Success,
        message: "查询成功",
        data: { list: [], total: 0, pageNum, pageSize },
      };
    }

    const favRows = await prisma.petFavorite.findMany({
      where: { user_id: userId },
      orderBy: { create_time: "desc" },
      skip: offset,
      take: pageSize,
      include: { pet: true },
    });

    const list = favRows.map((f) =>
      serializePetForApi({
        ...(f.pet as unknown as Record<string, unknown>),
        favorite_time: f.create_time,
      })
    );

    return {
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "查询成功",
      data: {
        list,
        total,
        pageNum,
        pageSize,
      },
    };
  }
);
