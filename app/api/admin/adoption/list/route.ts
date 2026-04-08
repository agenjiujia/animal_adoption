import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { BusinessCodeEnum, HttpCodeEnum, UserRoleEnum } from "@/types";
import prisma from "@/lib/db";
import { resolveAuth } from "@/lib/auth";
import { rewriteLocalUploadUrlForApi } from "@/lib/uploadStorage";

/**
 * 管理员获取领养申请列表（分页、按状态筛选）
 * POST /api/admin/adoption/list
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

  let body: { pageNum?: number; pageSize?: number; status?: number | string } =
    {};
  try {
    body = await req.json();
  } catch (e) {
    /* allow empty */
  }

  const pageNum = Number(body.pageNum || 1);
  const pageSize = Number(body.pageSize || 10);
  const offset = (pageNum - 1) * pageSize;

  const where: Prisma.AdoptionApplyWhereInput = {};
  if (
    body.status !== undefined &&
    body.status !== null &&
    body.status !== ""
  ) {
    const st = Number(body.status);
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
  }

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
      applicant_avatar: a.applicant?.avatar
        ? rewriteLocalUploadUrlForApi(a.applicant.avatar)
        : a.applicant?.avatar,
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
    console.error("Admin adoption list error:", error);
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
