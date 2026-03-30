"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Layout,
  Menu,
  Avatar,
  Space,
  Dropdown,
  Button,
  type MenuProps,
} from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  HeartOutlined,
  DashboardOutlined,
  AppstoreOutlined,
  MenuOutlined,
  FormOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { UserRoleEnum } from "@/types";
import { request } from "@/utils/request";
import { motion, AnimatePresence } from "framer-motion";
import "@/app/globals.css";

const { Header, Content, Footer } = Layout;

type StoredUser = {
  user_id: number;
  username: string;
  phone: string;
  role?: number;
  avatar?: string;
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
        const parsed = JSON.parse(raw) as StoredUser;
        setIsLogin(true);
        setUserInfo(parsed);

        // 兼容老登录态：本地缓存没有 avatar 时，补拉一次最新资料
        if (!parsed.avatar) {
          void request
            .get<{
              user_id: number;
              username: string;
              phone: string;
              role?: number;
              avatar?: string;
            }>("/api/user/me")
            .then((res) => {
              const me = res.data as StoredUser | undefined;
              if (!me) return;
              const merged: StoredUser = {
                ...parsed,
                username: me.username ?? parsed.username,
                phone: me.phone ?? parsed.phone,
                role: me.role ?? parsed.role,
                avatar: me.avatar,
              };
              setUserInfo(merged);
              localStorage.setItem("userInfo", JSON.stringify(merged));
            })
            .catch(() => {
              // ignore
            });
        }
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
    const onUserInfoUpdated = () => {
      checkLogin();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("userInfoUpdated", onUserInfoUpdated);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("userInfoUpdated", onUserInfoUpdated);
    };
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
        label: <Link href="/">发现宠物</Link>,
      },
      {
        key: "/pet/new",
        label: <Link href="/pet/new">发布领养</Link>,
      },
    ];
    if (isLogin) {
      items.push({
        key: "/pet/my-publish",
        label: <Link href="/pet/my-publish">我的发布</Link>,
      });
    }
    if (isAdmin) {
      items.push({
        key: "/admin/pets",
        label: <Link href="/admin/pets">管理后台</Link>,
      });
    }
    return items;
  }, [isAdmin, isLogin]);

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined style={{ fontSize: 14 }} />,
      label: <Link href="/profile">个人中心</Link>,
    },
    {
      key: "favorites",
      icon: <HeartOutlined style={{ fontSize: 14 }} />,
      label: <Link href="/my/favorites">我的收藏</Link>,
    },
    {
      key: "my-publish",
      icon: <FormOutlined style={{ fontSize: 14 }} />,
      label: <Link href="/pet/my-publish">我发布的宠物</Link>,
    },
    {
      key: "adoptions",
      icon: <AppstoreOutlined style={{ fontSize: 14 }} />,
      label: <Link href="/my/adoptions">我的领养申请</Link>,
    },
    {
      key: "adoption-approvals",
      icon: <DashboardOutlined style={{ fontSize: 14 }} />,
      label: <Link href="/my/adoption-approvals">领养审批队列</Link>,
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined style={{ fontSize: 14 }} />,
      label: "退出登录",
      onClick: logout,
      danger: true,
    },
  ];

  if (!ready) return null;

  const isAuthPage = AUTH_FREE.includes(pathname);

  return (
    <Layout style={{ minHeight: "100vh", background: "var(--bg-main)" }}>
      {!isAuthPage && (
        <Header
          className="soft-glass"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1000,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 40px",
            height: 72,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 64 }}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="brand-title"
              style={{
                fontSize: 24,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
              onClick={() => router.push("/")}
            >
              <HeartOutlined
                style={{ fontSize: 24, color: "var(--secondary)" }}
              />
              萌宠之家
            </motion.div>

            <Menu
              mode="horizontal"
              selectedKeys={[pathname]}
              items={menuItems}
              style={{
                border: "none",
                background: "transparent",
                minWidth: 320,
                fontSize: 15,
                fontWeight: 500,
              }}
            />
          </div>

          <Space size={24}>
            {isLogin ? (
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow={{ pointAtCenter: true }}
              >
                <motion.div
                  whileHover={{ opacity: 0.8 }}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ textAlign: "right", lineHeight: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {userInfo.username}
                    </div>
                  </div>
                  <Avatar
                    src={userInfo.avatar}
                    icon={<UserOutlined />}
                    size={40}
                    style={{
                      border: "2px solid var(--primary)",
                      background: "white",
                    }}
                  />
                </motion.div>
              </Dropdown>
            ) : (
              <Space size={16}>
                <Button
                  type="text"
                  style={{ fontSize: 14, fontWeight: 500 }}
                  onClick={() => router.push("/login")}
                >
                  登录
                </Button>
                <Button
                  className="btn-primary"
                  type="primary"
                  onClick={() => router.push("/register")}
                >
                  加入我们
                </Button>
              </Space>
            )}
          </Space>
        </Header>
      )}

      <Content style={{ position: "relative" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={!isAuthPage ? "main-container" : ""}
            style={{ padding: !isAuthPage ? "28px 0" : 0 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </Content>

      {!isAuthPage && (
        <Footer
          style={{
            padding: "20px 32px",
            background: "white",
            borderTop: "1px solid var(--border-light)",
          }}
        >
          <div className="main-container">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 20,
              }}
            >
              <div style={{ gridColumn: "span 2" }}>
                <div
                  className="brand-title"
                  style={{ fontSize: 20, marginBottom: 8 }}
                >
                  萌宠之家
                </div>
                <div
                  style={{
                    color: "var(--text-secondary)",
                    maxWidth: 360,
                    lineHeight: 1.6,
                    fontSize: 14,
                  }}
                >
                  我们致力于为每一只流浪的小动物寻找一个温暖的家。在这里，每一个生命都值得被尊重和珍爱。
                </div>
              </div>
              <div>
                <div
                  style={{ fontWeight: 600, marginBottom: 10, fontSize: 15 }}
                >
                  快速链接
                </div>
                <Space orientation="vertical" size={8}>
                  <Link
                    href="/"
                    style={{ color: "var(--text-secondary)", fontSize: 14 }}
                  >
                    发现宠物
                  </Link>
                  <Link
                    href="/pet/new"
                    style={{ color: "var(--text-secondary)", fontSize: 14 }}
                  >
                    发布领养
                  </Link>
                  <Link
                    href="/pet/my-publish"
                    style={{ color: "var(--text-secondary)", fontSize: 14 }}
                  >
                    我的发布
                  </Link>
                  <Link
                    href="/profile"
                    style={{ color: "var(--text-secondary)", fontSize: 14 }}
                  >
                    个人中心
                  </Link>
                </Space>
              </div>
              <div>
                <div
                  style={{ fontWeight: 600, marginBottom: 10, fontSize: 15 }}
                >
                  关于我们
                </div>
                <Space orientation="vertical" size={8}>
                  <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                    联系我们：paws@home.com
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                    加入志愿者
                  </div>
                </Space>
              </div>
            </div>
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid var(--border-light)",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 12,
              }}
            >
              © 2026 PawHouse 萌宠之家. All rights reserved.
            </div>
          </div>
        </Footer>
      )}
    </Layout>
  );
}
