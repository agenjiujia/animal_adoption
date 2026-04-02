"use client";

import { Breadcrumb } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** 管理后台内层导航（外层由服务端 layout 校验管理员身份） */
export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentLabel = pathname.startsWith("/admin/users")
    ? "用户管理"
    : pathname.startsWith("/admin/adoptions")
      ? "审批管理"
      : "宠物管理";

  return (
    <div className="admin-layout-stack">
      <nav aria-label="管理中心导航">
        <div className="admin-breadcrumb-bar">
          <Breadcrumb
            items={[
              { title: <Link href="/admin/pets">管理中心</Link> },
              { title: currentLabel },
            ]}
          />
        </div>
      </nav>
      {children}
    </div>
  );
}
