import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { BusinessCodeEnum, HttpCodeEnum } from "@/types";
import prisma from "@/lib/db";
import { resolveAuth } from "@/lib/auth";

/**
 * 发布者获取“待审批”领养申请列表（分页）
 * POST /api/adoption/owner/list
 */
export async function POST(req: NextRequest) {
  const auth = resolveAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      {
        businessCode: auth.error.businessCode,
        httpCode: auth.error.httpCode,
        message: auth.error.message,
      },
      { status: 401 }
    );
  }

  let body: {
    pageNum?: number;
    pageSize?: number;
    status?: number | string;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty */
  }

  const pageNum = Number(body.pageNum || 1);
  const pageSize = Number(body.pageSize || 10);
  const offset = (pageNum - 1) * pageSize;

  let where: Prisma.AdoptionApplyWhereInput = {
    pet_user_id: auth.user.userId,
  };

  const statusRaw = body.status ?? 0;
  const st = Number(statusRaw);
  if (![0, 1, 2].includes(st)) {
    return NextResponse.json(
      {
        businessCode: BusinessCodeEnum.ParameterValidationFailed,
        httpCode: HttpCodeEnum.BadRequest,
        message: "status 只能为 0/1/2",
      },
      { status: 400 }
    );
  }
  where.status = st;

  try {
    const [total, listResult] = await Promise.all([
      prisma.adoptionApply.count({ where }),
      prisma.adoptionApply.findMany({
        where,
        include: {
          pet: { select: { name: true, species: true } },
          applicant: {
            select: {
              username: true,
              real_name: true,
              phone: true,
              avatar: true,
            },
          },
        },
        orderBy: { create_time: "desc" },
        skip: offset,
        take: pageSize,
      }),
    ]);

    const list = listResult.map((a) => ({
      ...a,
      pet_name: a.pet?.name,
      pet_species: a.pet?.species,
      applicant_name: a.applicant?.username,
      applicant_real_name: a.applicant?.real_name,
      applicant_phone: a.applicant?.phone,
      applicant_avatar: a.applicant?.avatar,
    }));

    return NextResponse.json({
      businessCode: BusinessCodeEnum.Success,
      httpCode: HttpCodeEnum.Success,
      message: "查询成功",
      data: {
        list,
        total,
        pageNum,
        pageSize,
      },
    });
  } catch (error) {
    console.error("Owner adoption list error:", error);
    // 兼容历史库：列缺失时降级为空列表，避免前端全站 500
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2022"
    ) {
      return NextResponse.json({
        businessCode: BusinessCodeEnum.Success,
        httpCode: HttpCodeEnum.Success,
        message: "查询成功",
        data: { list: [], total: 0, pageNum, pageSize },
      });
    }

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

