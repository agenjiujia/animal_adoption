"use client";

import { Geist, Geist_Mono } from "next/font/google";
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
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { UserRoleEnum } from "@/types";
import { request } from "@/utils/request";
import "antd/dist/antd.css";
import "@/app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const { Header, Sider, Content } = Layout;

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
    return (
      <html
        lang="zh-CN"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full" />
      </html>
    );
  }

  const authPage = AUTH_FREE.includes(pathname);

  // 未登录访问受保护路由：不渲染子页面，避免子组件抢先请求 API 触发 401 与多余跳转
  if (!isLogin && !authPage) {
    return (
      <html
        lang="zh-CN"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex items-center justify-center text-gray-500">
          正在跳转登录…
        </body>
      </html>
    );
  }

  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {isLogin ? (
          <Layout style={{ minHeight: "100vh" }}>
            <Header
              style={{
                height: 60,
                padding: "0 24px",
                background: "#fff",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "sticky",
                top: 0,
                zIndex: 100,
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex" }}>
                <div style={{ width: 200 }}>
                  <Link
                    href="/"
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: "#1890ff",
                    }}
                  >
                    宠物领养平台
                  </Link>
                </div>
                <Menu
                  mode="horizontal"
                  selectedKeys={[selectedKey]}
                  items={menuItems}
                  style={{ borderRight: 0 }}
                />
              </div>
              <Dropdown menu={{ items: userMenu }} placement="bottomRight">
                <Space style={{ cursor: "pointer" }}>
                  <Avatar
                    icon={<UserOutlined />}
                    style={{ backgroundColor: "#1890ff" }}
                  />
                  <span>{userInfo.username}</span>
                </Space>
              </Dropdown>
            </Header>
            <Content
              style={{
                margin: 20,
                // padding: 24,
                background: "#fff",
                borderRadius: 4,
                border: "1px solid #f0f0f0",
                overflow: "auto",
                minHeight: "calc(100vh - 100px)",
              }}
            >
              {children}
            </Content>
          </Layout>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
