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
import { motion } from "framer-motion";
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
    const items: NonNullable<MenuProps["items"]> = [
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
        key: "/admin",
        label: <span>管理中心</span>,
        children: [
          {
            key: "/admin/pets",
            label: <Link href="/admin/pets">宠物管理</Link>,
          },
          {
            key: "/admin/users",
            label: <Link href="/admin/users">用户管理</Link>,
          },
          {
            key: "/admin/adoptions",
            label: <Link href="/admin/adoptions">审批管理</Link>,
          },
        ],
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
            padding: "0 16px",
            height: 64,
            boxShadow: "0 1px 0 rgba(15,23,42,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <motion.div
              whileHover={{ opacity: 0.92 }}
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
              <img
                src="/icon.svg"
                alt="萌宠之家"
                style={{ width: 22, height: 22, display: "block" }}
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
                      background: "#fff",
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
        {/* 不做全局 route 进出场动画：mode="wait" + opacity 0 会让切换时先看不见 DOM */}
        <div
          className={!isAuthPage ? "main-container" : ""}
          style={{ padding: !isAuthPage ? "24px 0" : 0 }}
        >
          {children}
        </div>
      </Content>

      {/* {!isAuthPage && (
        <Footer
          className="footer-shell"
          style={{ padding: "12px 16px" }}
        >
          <div className="main-container" style={{ padding: 0 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr)",
                gap: 20,
              }}
            >
              <div>
                <div className="brand-title" style={{ fontSize: 18, marginBottom: 6 }}>
                  萌宠之家
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
                  我们致力于为每一只流浪的小动物寻找温暖的家，让领养更透明、更安心。
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>快速入口</div>
                <Space orientation="vertical" size={4}>
                  <Link className="footer-link" href="/">发现宠物</Link>
                  <Link className="footer-link" href="/pet/new">发布领养</Link>
                  <Link className="footer-link" href="/pet/my-publish">我的发布</Link>
                </Space>
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>关于平台</div>
                <Space orientation="vertical" size={4}>
                  <div className="footer-link">联系我们：paws@home.com</div>
                  <div className="footer-link">服务时间：09:00 - 21:00</div>
                </Space>
              </div>
            </div>

            <div
              className="footer-bottom"
              style={{ marginTop: 12, paddingTop: 10, fontSize: 12 }}
            >
              © 2026 PawHouse 萌宠之家. All rights reserved.
            </div>
          </div>
        </Footer>
      )} */}
    </Layout>
  );
}
