"use client";
import { Geist, Geist_Mono } from "next/font/google";
import { useState, useEffect, useCallback } from "react";
import { Layout, Menu, Avatar, Space, Dropdown } from "antd";
import {
  UserOutlined,
  HomeOutlined,
  FormOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import "antd/dist/antd.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const { Header, Sider, Content } = Layout;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();

  const pathname = usePathname();

  const [isLogin, setIsLogin] = useState<boolean | null>(null);

  const [userInfo, setUserInfo] = useState<{
    username: string;
    phone: string;
  }>({ username: "", phone: "" });

  const checkLoginStatus = useCallback(() => {
    try {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("token");
      const user = localStorage.getItem("userInfo");
      if (token && user) {
        setIsLogin(true);
        setUserInfo(JSON.parse(user));
      } else {
        setIsLogin(false);
        setUserInfo({ username: "", phone: "" });
        if (!["/login", "/register"].includes(pathname)) {
          router.push("/login");
        }
      }
    } catch (error) {
      console.error("检查登录状态失败：", error);
      setIsLogin(false);
      setUserInfo({ username: "", phone: "" });
    }
  }, [pathname, router]);

  useEffect(() => {
    // 首次挂载检查
    checkLoginStatus();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "userInfo") {
        checkLoginStatus();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [checkLoginStatus]);

  // 退出登录逻辑
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    setIsLogin(false);
    setUserInfo({ username: "", phone: "" });
    router.push("/login");
  };

  // 左侧菜单配置
  const menuItems = [
    {
      key: "home",
      icon: <HomeOutlined />,
      label: <Link href="/">首页</Link>,
    },
    {
      key: "adopt",
      icon: <FormOutlined />,
      label: <Link href="/adopt">领养申请</Link>,
    },
  ];

  // 登录后头像下拉菜单
  const userDropdownItems = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: <span onClick={handleLogout}>退出登录</span>,
    },
  ];

  // 初始化未完成时渲染空白页（避免UI闪烁）
  if (isLogin === null) {
    return (
      <html
        lang="zh-CN"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full" />
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
                width: "100%",
                boxSizing: "border-box",
                margin: 0,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#1890ff",
                  lineHeight: "60px",
                }}
              >
                宠物领养平台
              </div>
              <Space size="middle">
                <Dropdown
                  menu={{ items: userDropdownItems }}
                  placement="bottomRight"
                >
                  <Space style={{ cursor: "pointer" }}>
                    <Avatar
                      icon={<UserOutlined />}
                      alt={userInfo.username}
                      style={{ backgroundColor: "#1890ff" }}
                    />
                    <span style={{ color: "#333" }}>{userInfo.username}</span>
                  </Space>
                </Dropdown>
              </Space>
            </Header>

            <Layout style={{ height: `calc(100vh - 100px)` }}>
              <Sider
                width={200}
                style={{
                  background: "#fff",
                  borderRight: "1px solid #f0f0f0",
                  height: "100%",
                  overflow: "auto",
                }}
              >
                <Menu
                  mode="inline"
                  selectedKeys={["home"]}
                  items={menuItems}
                  style={{
                    borderRight: 0,
                    height: "100%",
                    paddingTop: 16,
                  }}
                />
              </Sider>

              <Content
                style={{
                  margin: "20px",
                  padding: 24,
                  minHeight: "calc(100% - 40px)",
                  background: "#fff",
                  borderRadius: 4,
                  border: "1px solid #f0f0f0",
                  boxSizing: "border-box",
                  overflow: "auto",
                }}
              >
                {children}
              </Content>
            </Layout>
          </Layout>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
