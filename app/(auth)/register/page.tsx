"use client"; // 必须标记为客户端组件
import {
  Form,
  Input,
  Button,
  message,
  Card,
  Upload,
  Avatar,
  Typography,
} from "antd";
import type { UploadChangeParam } from "antd/es/upload";
import { PlusOutlined, UserOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequest } from "ahooks";
import { request } from "@/utils/request";
import { useState } from "react";

const { Title, Text } = Typography;

const RegisterPage = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const { run, loading } = useRequest(
    (values) =>
      request.post("/api/auth/register", { ...values, avatar: avatarUrl }),
    {
      manual: true,
      onSuccess: (res) => {
        message.success(res.message);
        router.push("/login");
      },
    }
  );

  const handleUploadChange = (info: UploadChangeParam) => {
    if (info.file.status === "done") {
      const url = info.file.response?.data?.url;
      setAvatarUrl(url);
      message.success("头像上传成功");
    } else if (info.file.status === "error") {
      message.error("头像上传失败");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC] py-12">
      <Card
        bordered={false}
        className="w-full max-w-lg shadow-sm"
        style={{ borderRadius: 12 }}
      >
        <div className="text-center mb-8">
          <Title
            level={2}
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#0F172A",
              marginBottom: 8,
            }}
          >
            创建您的账号
          </Title>
          <Text style={{ color: "#64748B" }}>
            加入萌宠之家，为流浪生命寻找温暖
          </Text>
        </div>

        <Form
          form={form}
          name="userRegister"
          onFinish={run}
          layout="vertical"
          requiredMark="optional"
        >
          <div className="flex flex-col items-center mb-8">
            <Upload
              name="file"
              listType="picture-circle"
              className="avatar-uploader"
              showUploadList={false}
              action="/api/upload"
              onChange={handleUploadChange}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div className="flex flex-col items-center">
                  <PlusOutlined style={{ fontSize: 20, color: "#64748B" }} />
                  <div style={{ marginTop: 4, fontSize: 12, color: "#64748B" }}>
                    上传头像
                  </div>
                </div>
              )}
            </Upload>
          </div>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              label={
                <Text strong style={{ fontSize: 13 }}>
                  用户名
                </Text>
              }
              name="username"
              rules={[
                { required: true, message: "请输入用户名！" },
                { min: 2, max: 50, message: "用户名长度2-50位！" },
              ]}
            >
              <Input
                placeholder="用户名/昵称"
                style={{ borderRadius: 6, height: 40 }}
              />
            </Form.Item>

            <Form.Item
              label={
                <Text strong style={{ fontSize: 13 }}>
                  手机号
                </Text>
              }
              name="phone"
              rules={[
                { required: true, message: "请输入手机号！" },
                {
                  pattern: /^1[3-9]\d{9}$/,
                  message: "请输入正确的11位手机号！",
                },
              ]}
            >
              <Input
                placeholder="11位手机号"
                maxLength={11}
                style={{ borderRadius: 6, height: 40 }}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              label={
                <Text strong style={{ fontSize: 13 }}>
                  设置密码
                </Text>
              }
              name="password"
              rules={[
                { required: true, message: "请输入密码！" },
                { min: 6, message: "密码长度不能少于6位！" },
              ]}
            >
              <Input.Password
                placeholder="不少于6位"
                style={{ borderRadius: 6, height: 40 }}
              />
            </Form.Item>

            <Form.Item
              label={
                <Text strong style={{ fontSize: 13 }}>
                  确认密码
                </Text>
              }
              name="confirmPassword"
              rules={[
                { required: true, message: "请输入确认密码!" },
                {
                  validator: (_, value) => {
                    const password = form.getFieldValue("password");
                    if (value && password && value !== password) {
                      return Promise.reject(
                        new Error("两次输入的密码不一致！")
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input.Password
                placeholder="再次输入密码"
                style={{ borderRadius: 6, height: 40 }}
              />
            </Form.Item>
          </div>

          <Form.Item
            label={
              <Text strong style={{ fontSize: 13 }}>
                身份证号
              </Text>
            }
            name="identityCard"
            rules={[
              { required: true, message: "请输入身份证号！" },
              {
                pattern: /(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
                message: "请输入正确的18位身份证号！",
              },
            ]}
          >
            <Input
              placeholder="18位身份证号"
              maxLength={18}
              style={{ borderRadius: 6, height: 40 }}
            />
          </Form.Item>

          <Form.Item
            label={
              <Text strong style={{ fontSize: 13 }}>
                邮箱地址
              </Text>
            }
            name="email"
            rules={[
              { required: true, message: "请输入邮箱！" },
              { type: "email", message: "请输入正确的邮箱格式！" },
            ]}
          >
            <Input
              placeholder="常用邮箱地址"
              maxLength={100}
              style={{ borderRadius: 6, height: 40 }}
            />
          </Form.Item>

          <Form.Item
            label={
              <Text strong style={{ fontSize: 13 }}>
                居住地址
              </Text>
            }
            name="address"
            rules={[{ required: true, message: "请输入居住地址！" }]}
          >
            <Input.TextArea
              placeholder="详细的居住地址信息"
              rows={2}
              maxLength={200}
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12, marginTop: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{
                height: 48,
                borderRadius: 6,
                background: "#2A9D8F",
                border: "none",
                fontSize: 16,
                fontWeight: 500,
                boxShadow: "0 4px 12px rgba(42, 157, 143, 0.2)",
              }}
            >
              立即注册
            </Button>
          </Form.Item>

          <div className="text-center text-gray-500 text-sm">
            已有账号？
            <Link
              href="/login"
              className="text-[#2A9D8F] font-medium hover:underline ml-1"
            >
              立即登录
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage;
