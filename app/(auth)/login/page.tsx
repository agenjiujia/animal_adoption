"use client";

import { useEffect, Suspense } from "react";
import { Form, Input, Button, message, Card, Typography } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { request } from "@/utils/request";
import { useRequest } from "ahooks";
import { motion } from "framer-motion";

const { Title, Text } = Typography;

function LoginForm() {
  const [form] = Form.useForm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.replace(redirectTo);
    }
  }, [router, redirectTo]);

  const { run, loading } = useRequest(
    (params: { phone: string; password: string }) =>
      request.post<{
        token: string;
        user: Record<string, unknown>;
      }>("/api/auth/login", params),
    {
      manual: true,
      onSuccess: (res) => {
        message.success(res.message);
        const payload = res.data as
          | { token?: string; user?: Record<string, unknown> }
          | undefined;
        if (payload?.token) localStorage.setItem("token", payload.token);
        if (payload?.user)
          localStorage.setItem("userInfo", JSON.stringify(payload.user));
        router.replace(redirectTo.startsWith("/") ? redirectTo : "/");
      },
    }
  );

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, rgba(79,70,229,0.55), rgba(244,63,94,0.30), rgba(15,23,42,0.55))",
        backgroundSize: "400% 400%",
        animation: "loginGradient 14s ease-in-out infinite",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(900px circle at 20% 10%, rgba(79,70,229,0.45), transparent 55%), radial-gradient(900px circle at 85% 35%, rgba(244,63,94,0.30), transparent 50%), radial-gradient(800px circle at 40% 90%, rgba(34,197,94,0.18), transparent 55%)",
          animation: "loginFloat 10s ease-in-out infinite",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md px-4"
        style={{ position: "relative", zIndex: 1 }}
      >
        <Card
          bordered={false}
          className="standard-card"
          bodyStyle={{ padding: "48px 40px" }}
          style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(8px)",
            borderRadius: 20,
          }}
        >
          <div className="text-center mb-10">
            <div className="text-4xl mb-4">🐾</div>
            <Title
              level={2}
              style={{
                fontSize: 28,
                fontWeight: 850,
                marginBottom: 12,
                letterSpacing: "-0.02em",
              }}
            >
              欢迎回到<span className="text-gradient">萌宠之家</span>
            </Title>
            <Text style={{ color: "var(--text-tertiary)", fontSize: 15 }}>
              继续您的领养之旅，让爱不间断
            </Text>
          </div>

          <Form
            form={form}
            name="userLogin"
            onFinish={run}
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              label={<span className="font-semibold text-slate-700">手机号码</span>}
              name="phone"
              rules={[
                { required: true, message: "请输入手机号" },
                { pattern: /^1[3-9]\d{9}$/, message: "手机号格式错误" },
              ]}
            >
              <Input placeholder="请输入登录手机号" size="large" />
            </Form.Item>

            <Form.Item
              label={<span className="font-semibold text-slate-700">登录密码</span>}
              name="password"
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password placeholder="请输入密码" size="large" />
            </Form.Item>

            <Form.Item className="mt-10">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                className="btn-primary"
                style={{ height: 52, fontSize: 16, fontWeight: 700 }}
              >
                登录账号
              </Button>
            </Form.Item>

            <div className="text-center mt-6">
              <Text style={{ color: "var(--text-tertiary)" }}>
                还没有账号？{" "}
                <Link
                  href="/register"
                  className="text-indigo-600 font-bold hover:underline"
                >
                  立即加入
                </Link>
              </Text>
            </div>
          </Form>
        </Card>
      </motion.div>

      <style>{`
        @keyframes loginGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes loginFloat {
          0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.9; }
          50% { transform: translate3d(0, -10px, 0) scale(1.03); opacity: 1; }
          100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginForm />
    </Suspense>
  );
}
