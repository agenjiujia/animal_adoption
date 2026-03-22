"use client"; // 必须标记为客户端组件
import { useEffect } from "react";
import { Form, Input, Button, message, Card } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { request } from "@/app/_utils/request";
import { useRequest } from "ahooks";
const LoginPage = () => {
  const [form] = Form.useForm();
  const router = useRouter();

  // 页面加载时，检查是否已登录（可选）
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      message.info("您已登录，即将跳转到首页");
      router.push("/");
    }
  }, [router]);

  const { run, loading } = useRequest(
    (params) =>
      request.post<{
        message: string;
        token: string;
        user: string;
      }>("/api/auth/login", params),
    {
      manual: true,
      onSuccess: (data) => {
        message.success(data.message);
        localStorage.setItem("token", data?.data?.token as string);
        localStorage.setItem("userInfo", JSON.stringify(data.data?.user));
        router.push("/");
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
          {/* 手机号输入框（必填+格式校验） */}
          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: "请输入手机号！" },
              { pattern: /^1[3-9]\d{9}$/, message: "请输入正确的11位手机号！" },
            ]}
          >
            <Input
              placeholder="请输入11位手机号"
              maxLength={11}
              autoComplete="off"
            />
          </Form.Item>

          {/* 密码输入框（必填+长度校验） */}
          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: "请输入密码！" },
              { min: 6, message: "密码长度不能少于6位！" },
            ]}
          >
            <Input.Password placeholder="请输入密码" autoComplete="off" />
          </Form.Item>

          {/* 登录按钮 */}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>

          {/* 跳转到注册页 */}
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
};

export default LoginPage;
