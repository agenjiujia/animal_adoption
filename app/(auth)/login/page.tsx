"use client";

import { useEffect, Suspense } from "react";
import { Form, Input, Button, message, Card, Typography, Space } from "antd";
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
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-main)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md px-4"
      >
        <Card
          bordered={false}
          className="standard-card"
          bodyStyle={{ padding: '48px 40px' }}
        >
          <div className="text-center mb-10">
            <div className="text-4xl mb-4">🐾</div>
            <Title level={2} style={{ fontSize: 28, fontWeight: 850, marginBottom: 12, letterSpacing: '-0.02em' }}>
              欢迎回到<span className="text-gradient">萌宠之家</span>
            </Title>
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 15 }}>
              继续您的领养之旅，让爱不间断
            </Text>
          </div>

          <Form form={form} name="userLogin" onFinish={run} layout="vertical" requiredMark={false}>
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
              rules={[
                { required: true, message: "请输入密码" },
              ]}
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
              <Text style={{ color: 'var(--text-tertiary)' }}>
                还没有账号？{" "}
                <Link href="/register" className="text-indigo-600 font-bold hover:underline">
                  立即加入
                </Link>
              </Text>
            </div>
          </Form>
        </Card>
      </motion.div>
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
