"use client"; // 必须标记为客户端组件
import { Form, Input, Button, message, Card } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequest } from "ahooks";
import { request } from "@/app/_utils/request";

const RegisterPage = () => {
  const [form] = Form.useForm();
  const router = useRouter();

  const { run, loading } = useRequest(
    (params) => request.post("/api/auth/register", params),
    {
      manual: true,
      onSuccess: (data: { message: string }) => {
        message.success(data.message);
        router.push("/login");
      },
    }
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card
        title={<h2 className="text-center text-xl font-bold">用户注册</h2>}
        className="w-full max-w-lg p-4 shadow-lg"
      >
        <Form form={form} name="userRegister" onFinish={run} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: "请输入用户名！" },
              { min: 2, max: 50, message: "用户名长度2-50位！" },
            ]}
          >
            <Input placeholder="请输入用户名/昵称" />
          </Form.Item>

          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: "请输入手机号！" },
              { pattern: /^1[3-9]\d{9}$/, message: "请输入正确的11位手机号！" },
            ]}
          >
            <Input placeholder="请输入11位手机号" maxLength={11} />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: "请输入密码！" },
              { min: 6, message: "密码长度不能少于6位！" },
            ]}
          >
            <Input.Password placeholder="请设置密码（不少于6位）" />
          </Form.Item>

          <Form.Item
            label="确认密码"
            name="confirmPassword"
            rules={[
              { required: true, message: "请输入确认密码!" },
              {
                validator: (_, value) => {
                  const password = form.getFieldValue("password");
                  if (value && password && value !== password) {
                    return Promise.reject(new Error("两次输入的密码不一致！"));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>

          <Form.Item
            label="身份证号"
            name="identityCard"
            rules={[
              {
                required: true,
                message: "请输入身份证号！",
              },
              {
                pattern: /(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
                message: "请输入正确的18位身份证号！",
              },
            ]}
          >
            <Input placeholder="请输入身份证号" maxLength={18} />
          </Form.Item>

          <Form.Item
            label="居住地址"
            name="address"
            rules={[{ required: true, message: "请输入居住地址！" }]}
          >
            <Input.TextArea
              placeholder="请输入居住地址"
              rows={2}
              maxLength={200}
            />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: "请输入邮箱！" },
              {
                type: "email",
                message: "请输入正确的邮箱格式！",
              },
            ]}
          >
            <Input placeholder="请输入邮箱" maxLength={100} />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              提交注册
            </Button>
          </Form.Item>

          <div className="text-center mt-2 text-gray-600">
            已有账号？
            <Link href="/login" className="text-blue-500 hover:underline">
              立即登录
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage;
