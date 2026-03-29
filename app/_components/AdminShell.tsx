"use client";

import { Layout, Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

const { Header } = Layout;

/** 管理后台内层导航（外层由服务端 layout 校验管理员身份） */
export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const selected =
    pathname.startsWith("/admin/users")
      ? "/admin/users"
      : pathname.startsWith("/admin/adoptions")
      ? "/admin/adoptions"
      : "/admin/pets";

  return (
    <div>
      <Header
        style={{
          background: "#fafafa",
          borderBottom: "1px solid #f0f0f0",
          padding: "0 8px",
          height: 48,
          lineHeight: "48px",
        }}
      >
        <Menu
          mode="horizontal"
          selectedKeys={[selected]}
          style={{ borderBottom: "none", background: "transparent" }}
          items={[
            { key: "/admin/pets", label: <Link href="/admin/pets">宠物管理</Link> },
            { key: "/admin/users", label: <Link href="/admin/users">用户管理</Link> },
            { key: "/admin/adoptions", label: <Link href="/admin/adoptions">审批管理</Link> },
          ]}
        />
      </Header>
      {children}
    </div>
  );
}
