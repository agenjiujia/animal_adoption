import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME } from "@/lib/constants/auth";
import { UserRoleEnum } from "@/types";
import AdminShell from "@/components/AdminShell";

/**
 * 服务端强制校验：仅 role=1 可访问 /admin/*（配合登录时 HttpOnly Cookie）
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    redirect("/login?redirect=" + encodeURIComponent("/admin/pets"));
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      role?: number;
    };
    if (payload.role !== UserRoleEnum.Admin) {
      redirect("/");
    }
  } catch {
    redirect("/login?redirect=" + encodeURIComponent("/admin/pets"));
  }

  return <AdminShell>{children}</AdminShell>;
}
