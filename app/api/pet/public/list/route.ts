import { NextRequest, NextResponse } from "next/server";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import prisma from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import { serializePetForApi } from "@/lib/petSerialize";

/**
 * 首页公共宠物列表（不强制登录，仅展示待领养宠物）
 * POST /api/pet/public/list
 */
export async function POST(req: NextRequest) {
  const auth = resolveAuth(req);
  const currentUserId = auth.ok ? auth.user.userId : null;

  let body: { pageNum?: number; pageSize?: number } = {};
  try {
    body = await req.json();
  } catch (e) {
    /* empty body */
  }

  const pageNum = Number(body.pageNum || 1);
  const pageSize = Number(body.pageSize || 12);
  const offset = (pageNum - 1) * pageSize;

  try {
    const where = { status: 0 };

    const total = await prisma.pet.count({ where });

    const baseList = await prisma.pet.findMany({
      where,
      orderBy: { create_time: "desc" },
      skip: offset,
      take: pageSize,
    });

    let listResult = baseList.map((p) =>
      serializePetForApi(p as unknown as Record<string, unknown>)
    );

    /** 登录态：已申请/收藏标记 + 首屏通知（表未 migrate 时仍会返回列表） */
    if (currentUserId) {
      try {
        const petIds = baseList.map((p) => p.pet_id);
        if (petIds.length > 0) {
          const [applied, favs] = await Promise.all([
            prisma.adoptionApply.findMany({
              where: {
                apply_user_id: currentUserId,
                pet_id: { in: petIds },
                status: 0,
              },
              select: { pet_id: true },
            }),
            prisma.petFavorite.findMany({
              where: { user_id: currentUserId, pet_id: { in: petIds } },
              select: { pet_id: true },
            }),
          ]);
          const appliedSet = new Set(applied.map((a) => a.pet_id));
          const favSet = new Set(favs.map((f) => f.pet_id));
          listResult = listResult.map((row, i) => ({
            ...row,
            is_applied: appliedSet.has(baseList[i].pet_id) ? 1 : 0,
            is_favorited: favSet.has(baseList[i].pet_id) ? 1 : 0,
          }));
        }
      } catch (e) {
        console.error("Public pet list: skip apply/favorite markers:", e);
      }
    }

    let notifications: Record<string, unknown>[] = [];
    if (currentUserId && pageNum === 1) {
      try {
        const userNotif = await prisma.adoptionApply.findMany({
          where: {
            apply_user_id: currentUserId,
            is_read: 0,
            status: { in: [1, 2] },
          },
          include: { pet: { select: { name: true } } },
        });
        notifications = userNotif.map((a) => ({
          ...a,
          pet_name: a.pet?.name,
          type: "USER",
        })) as Record<string, unknown>[];

        // 发布者待审批通知：每个发布者只收到自己发布宠物的审批队列
        const ownerNotif = await prisma.adoptionApply.findMany({
          where: {
            pet_user_id: currentUserId,
            is_admin_read: 0, // 复用字段：表示“发布者是否已读”
            status: 0, // 待审核
          },
          include: {
            pet: { select: { name: true } },
            applicant: { select: { username: true } },
          },
        });

        notifications = [
          ...notifications,
          ...ownerNotif.map((a) => ({
            ...a,
            pet_name: a.pet?.name,
            applicant_name: a.applicant?.username,
            type: "OWNER",
          })),
        ];
      } catch (e) {
        console.error("Public pet list: skip notifications:", e);
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
        notifications,
      },
    });
  } catch (error) {
    console.error("Public pet list error:", error);
    return NextResponse.json(
      {
        businessCode: BusinessCodeEnum.InternalServerError,
        httpCode: HttpCodeEnum.ServerError,
        message: "获取列表失败",
      },
      { status: 500 }
    );
  }
}
