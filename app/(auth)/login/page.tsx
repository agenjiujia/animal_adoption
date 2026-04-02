"use client";

import { useEffect, useState, Suspense } from "react";
import { Form, Input, Button, message, Card, Typography } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { request } from "@/utils/request";
import { useRequest } from "ahooks";
import { motion } from "framer-motion";
import NeuralNetwork from "@/app/_components/NeuralNetwork";
import LoginPeekingPets from "@/app/_components/LoginPeekingPets";

const { Title, Text } = Typography;

function LoginForm() {
  const [form] = Form.useForm();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [authErrorNonce, setAuthErrorNonce] = useState(0);
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
      onError: () => {
        setAuthErrorNonce((n) => n + 1);
      },
    }
  );

  return (
    <div style={{ position: "relative", minHeight: "100dvh" }}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "auto",
        }}
      >
        <NeuralNetwork
          cameraPosition={{ x: 5, y: 9, z: 26 }}
          orbitTarget={{ x: 11, y: -3.5, z: 5 }}
          pulseOnMount
          pulseOnMountViewport={{ x: 0.26, y: 0.34 }}
        />
      </div>
      <div
        className="flex"
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "flex-end",
          padding:
            "max(20px, env(safe-area-inset-top)) max(28px, min(64px, 8vw), env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left))",
          pointerEvents: "none",
        }}
      >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(1100px circle at 22% 28%, rgba(124,110,230,0.14), transparent 52%), radial-gradient(800px circle at 78% 88%, rgba(243,143,178,0.08), transparent 48%), radial-gradient(640px circle at 12% 72%, rgba(196,181,253,0.07), transparent 46%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md px-4"
        style={{
          position: "relative",
          zIndex: 1,
          pointerEvents: "auto",
          maxWidth: "min(448px, 100%)",
          marginRight: 160,
          marginTop: 160,
        }}
      >
        <div style={{ position: "relative", overflow: "visible" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: "100%",
              transform: "translateY(34px)",
              zIndex: 4,
              pointerEvents: "auto",
              paddingInline: "clamp(4px, 5%, 28px)",
              boxSizing: "border-box",
            }}
          >
            <LoginPeekingPets
              passwordVisible={passwordVisible}
              authErrorNonce={authErrorNonce}
            />
          </div>
        <Card
          variant="borderless"
          className="standard-card auth-brand-card"
          styles={{ body: { padding: 24 } }}
          style={{
            position: "relative",
            overflow: "visible",
          }}
        >
          <div className="text-center mb-10">
            <img
              src="/icon.svg"
              alt="萌宠之家"
              style={{ width: 42, height: 42, margin: "0 auto 12px" }}
            />
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
              label={<span className="font-semibold" style={{ color: "var(--text-secondary)" }}>手机号码</span>}
              name="phone"
              rules={[
                { required: true, message: "请输入手机号" },
                { pattern: /^1[3-9]\d{9}$/, message: "手机号格式错误" },
              ]}
            >
              <Input placeholder="请输入登录手机号" size="large" />
            </Form.Item>

            <Form.Item
              label={<span className="font-semibold" style={{ color: "var(--text-secondary)" }}>登录密码</span>}
              name="password"
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password
                placeholder="请输入密码"
                size="large"
                visibilityToggle={{
                  visible: passwordVisible,
                  onVisibleChange: setPasswordVisible,
                }}
              />
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
                  className="font-bold hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  立即加入
                </Link>
              </Text>
            </div>
          </Form>
        </Card>
        </div>
      </motion.div>
      </div>
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
