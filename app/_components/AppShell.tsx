"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Layout, Menu, Avatar, Space, Dropdown } from "antd";
import {
  UserOutlined,
  HomeOutlined,
  FormOutlined,
  LogoutOutlined,
  IdcardOutlined,
  SettingOutlined,
  UpSquareOutlined,
  HeartOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { UserRoleEnum } from "@/types";
import { request } from "@/utils/request";
import "@/app/globals.css";

const { Header, Content } = Layout;

type StoredUser = {
  user_id: number;
  username: string;
  phone: string;
  role?: number;
};

const AUTH_FREE = ["/login", "/register"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [userInfo, setUserInfo] = useState<StoredUser>({
    user_id: 0,
    username: "",
    phone: "",
    role: UserRoleEnum.OrdinaryAdopter,
  });

  const checkLogin = useCallback(() => {
    try {
      const token = localStorage.getItem("token");
      const raw = localStorage.getItem("userInfo");
      if (token && raw) {
        setIsLogin(true);
        setUserInfo(JSON.parse(raw) as StoredUser);
      } else {
        setIsLogin(false);
        setUserInfo({
          user_id: 0,
          username: "",
          phone: "",
          role: UserRoleEnum.OrdinaryAdopter,
        });
        if (!AUTH_FREE.includes(pathname)) router.push("/login");
      }
    } catch {
      setIsLogin(false);
    } finally {
      setReady(true);
    }
  }, [pathname, router]);

  useEffect(() => {
    checkLogin();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "userInfo") checkLogin();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [checkLogin]);

  const logout = useCallback(async () => {
    try {
      await request.post("/api/auth/logout");
    } catch {
      /* 仍清理本地态 */
    }
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    setIsLogin(false);
    router.push("/login");
  }, [router]);

  const isAdmin = userInfo.role === UserRoleEnum.Admin;

  const menuItems = useMemo(() => {
    const items = [
      {
        key: "/",
        icon: <HomeOutlined />,
        label: <Link href="/">领养中心</Link>,
      },
      {
        key: "/pet/new",
        icon: <FormOutlined />,
        label: <Link href="/pet/new">发布宠物</Link>,
      },
    ];
    return items;
  }, []);

  const selectedKey = useMemo(() => {
    if (pathname.startsWith("/admin")) return "/admin/pets";
    if (pathname.startsWith("/profile")) return "/profile";
    if (pathname.startsWith("/pet/new") || pathname.startsWith("/pet/edit"))
      return "/pet/new";
    if (pathname.startsWith("/pet/my-publish")) return "/pet/my-publish";
    return "/";
  }, [pathname]);

  const userMenu = useMemo(
    () => [
      ...(isAdmin
        ? [
            {
              key: "/admin/pets",
              icon: <SettingOutlined />,
              label: <Link href="/admin/pets">管理后台</Link>,
            },
          ]
        : []),
      {
        key: "/profile",
        icon: <IdcardOutlined />,
        label: <Link href="/profile">个人中心</Link>,
      },
      {
        key: "/my/favorites",
        icon: <HeartOutlined />,
        label: <Link href="/my/favorites">我的收藏</Link>,
      },
      {
        key: "/my/adoptions",
        icon: <IdcardOutlined />,
        label: <Link href="/my/adoptions">我的领养</Link>,
      },
      {
        key: "/pet/my-publish",
        icon: <UpSquareOutlined />,
        label: <Link href="/pet/my-publish">我发布的</Link>,
      },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: <span onClick={logout}>退出登录</span>,
      },
    ],
    [isAdmin, logout]
  );

  if (!ready) {
    return <div className="min-h-full" />;
  }

  const authPage = AUTH_FREE.includes(pathname);

  // 未登录访问受保护路由：不渲染子页面，避免子组件抢先请求 API 触发 401 与多余跳转
  if (!isLogin && !authPage) {
    return (
      <div className="min-h-full flex items-center justify-center text-gray-500">
        正在跳转登录…
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {isLogin ? (
        <Layout style={{ minHeight: "100vh", background: "#F8FAFC" }}>
          <Header
            style={{
              height: 64,
              padding: "0 24px",
              background: "#fff",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "sticky",
              top: 0,
              zIndex: 100,
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ marginRight: 40 }}>
                <Link
                  href="/"
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#2A9D8F",
                    letterSpacing: "-0.5px",
                  }}
                >
                  🐾 萌宠之家
                </Link>
              </div>
              <Menu
                mode="horizontal"
                selectedKeys={[selectedKey]}
                items={menuItems}
                style={{
                  borderBottom: 0,
                  background: "transparent",
                  flex: 1,
                  lineHeight: "64px",
                }}
              />
            </div>
            <Dropdown menu={{ items: userMenu }} placement="bottomRight" arrow>
              <Space
                style={{
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 8,
                  transition: "background 0.2s",
                }}
                className="hover:bg-slate-50"
              >
                <Avatar
                  icon={<UserOutlined />}
                  style={{ backgroundColor: "#2A9D8F" }}
                  size="small"
                />
                <span
                  style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}
                >
                  {userInfo.username}
                </span>
              </Space>
            </Dropdown>
          </Header>
          <Content
            style={{
              padding: "20px 24px",
              background: "transparent",
              minHeight: "calc(100vh - 64px)",
              maxWidth: 1280,
              margin: "0 auto",
              width: "100%",
            }}
          >
            {children}
          </Content>
        </Layout>
      ) : (
        <Content style={{ background: "#F8FAFC", minHeight: "100vh" }}>
          {children}
        </Content>
      )}
    </div>
  );
}
