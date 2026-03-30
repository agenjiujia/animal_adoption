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
  Row,
  Col,
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
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-main)] py-12">
      <Card
        bordered={false}
        className="w-full max-w-lg standard-card"
        style={{ padding: 20 }}
      >
        <div className="text-center mb-10">
          <Title
            level={2}
            style={{
              fontSize: 32,
              fontWeight: 850,
              color: "var(--text-primary)",
              marginBottom: 12,
              letterSpacing: "-0.02em",
            }}
          >
            加入<span className="text-gradient">萌宠之家</span>
          </Title>
          <Text style={{ color: "var(--text-tertiary)", fontSize: 16 }}>
            为流浪生命寻找温暖，从这里开始
          </Text>
        </div>

        <Form
          form={form}
          name="userRegister"
          onFinish={run}
          layout="vertical"
          requiredMark={false}
        >
          <div className="flex flex-col items-center mb-10">
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
                    border: "2px solid var(--primary)",
                  }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--text-tertiary)",
                  }}
                >
                  <PlusOutlined style={{ fontSize: 24 }} />
                  <div style={{ fontSize: 12 }}>上传头像</div>
                </div>
              )}
            </Upload>
          </div>

          <Form.Item
            name="username"
            label={<span className="font-semibold text-slate-700">用户名</span>}
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="请设置您的独特昵称" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label={
              <span className="font-semibold text-slate-700">登录密码</span>
            }
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password placeholder="至少6位字符" size="large" />
          </Form.Item>

          <Form.Item
            name="phone"
            label={
              <span className="font-semibold text-slate-700">手机号码</span>
            }
            rules={[{ required: true, message: "请输入手机号" }]}
          >
            <Input placeholder="用于接收领养通知" size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="real_name"
                label={
                  <span className="font-semibold text-slate-700">真实姓名</span>
                }
                rules={[{ required: true, message: "请输入真实姓名" }]}
              >
                <Input placeholder="用于身份核验" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="identityCard"
                label={
                  <span className="font-semibold text-slate-700">身份证号</span>
                }
                rules={[
                  { required: true, message: "请输入身份证号" },
                  {
                    pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
                    message: "身份证号格式错误",
                  },
                ]}
              >
                <Input placeholder="用于资质认证" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="email"
            label={
              <span className="font-semibold text-slate-700">电子邮箱</span>
            }
            rules={[{ type: "email", message: "邮箱格式错误" }]}
          >
            <Input placeholder="用于接收重要邮件" size="large" />
          </Form.Item>

          <Form.Item
            name="address"
            label={
              <span className="font-semibold text-slate-700">居住地址</span>
            }
          >
            <Input.TextArea placeholder="请输入您的常住地址" rows={2} />
          </Form.Item>

          <Form.Item className="mt-8">
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              className="btn-primary"
              style={{ height: 48, fontSize: 16, fontWeight: 700 }}
            >
              创建账号
            </Button>
          </Form.Item>

          <div className="text-center mt-4">
            <Text style={{ color: "var(--text-tertiary)" }}>
              已有账号？{" "}
              <Link
                href="/login"
                className="text-indigo-600 font-bold hover:underline"
              >
                立即登录
              </Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage;
