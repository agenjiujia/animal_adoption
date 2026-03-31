"use client";

/** 管理后台内层导航（外层由服务端 layout 校验管理员身份） */
export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
