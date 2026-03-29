"use client";

import { useEffect, Suspense } from "react";
import { Form, Input, Button, message, Card } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { request } from "@/utils/request";
import { useRequest } from "ahooks";

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
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card
        title={<h2 className="text-center text-xl font-bold">用户登录</h2>}
        className="w-full max-w-md p-4 shadow-lg"
      >
        <Form form={form} name="userLogin" onFinish={run} layout="vertical">
          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: "请输入手机号！" },
              { pattern: /^1[3-9]\d{9}$/, message: "请输入正确的11位手机号！" },
            ]}
          >
            <Input placeholder="11位手机号" maxLength={11} autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: "请输入密码！" },
              { min: 6, message: "密码长度不能少于6位！" },
            ]}
          >
            <Input.Password placeholder="密码" autoComplete="off" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登录
            </Button>
          </Form.Item>
          <div className="text-center mt-2 text-gray-600">
            还没有账号？
            <Link href="/register" className="text-blue-500 hover:underline">
              立即注册
            </Link>
          </div>
        </Form>
      </Card>
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
