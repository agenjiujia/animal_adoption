"use client";

import { useRequest } from "ahooks";
import {
  Card,
  Descriptions,
  Spin,
  Typography,
  Avatar,
  Row,
  Col,
  Tag,
  Divider,
  Button,
  Space,
  Upload,
  message,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
  CameraOutlined,
} from "@ant-design/icons";
import { request } from "@/utils/request";
import { UserRoleMap, UserStatusMap } from "@/constant";
import { UserRoleEnum, UserStatusEnum } from "@/types";
import dayjs from "dayjs";
import type { UploadChangeParam } from "antd/es/upload";

const { Title, Text, Paragraph } = Typography;

type Me = {
  user_id: number;
  username: string;
  email: string;
  phone: string;
  avatar?: string;
  real_name?: string;
  id_card?: string;
  address?: string;
  role: number;
  status: number;
  create_time: string;
  update_time?: string;
};

/** 个人中心：仅展示当前登录用户自身资料 */
export default function ProfilePage() {
  const { data, loading, refresh } = useRequest(() =>
    request.get<Me>("/api/user/me")
  );

  const u = data?.data as Me | undefined;

  const handleAvatarChange = (info: UploadChangeParam) => {
    if (info.file.status === "done") {
      const url = info.file.response?.data?.url;
      if (url) {
        request
          .patch("/api/user/me", { avatar: url })
          .then(() => {
            message.success("头像更新成功");
            refresh();
          })
          .catch(() => {
            message.error("头像更新失败");
          });
      }
    } else if (info.file.status === "error") {
      message.error("图片上传失败");
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 0" }}>
      <div style={{ marginBottom: 32 }}>
        <Title
          level={2}
          style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}
        >
          个人中心
        </Title>
        <Text style={{ color: "#64748B" }}>管理您的账号信息与偏好设置</Text>
      </div>

      <Spin spinning={loading} description="正在获取个人资料...">
        {u && (
          <Row gutter={[24, 24]}>
            {/* 左侧：基本名片 */}
            <Col xs={24} md={8}>
              <Card
                bordered={false}
                className="card-shadow"
                style={{ borderRadius: 12, textAlign: "center" }}
                bodyStyle={{ padding: "40px 24px" }}
              >
                <div style={{ position: "relative", display: "inline-block" }}>
                  <Avatar
                    size={100}
                    src={u.avatar}
                    icon={<UserOutlined />}
                    style={{
                      backgroundColor: "#F1F5F9",
                      color: "#2A9D8F",
                      marginBottom: 24,
                      border: "4px solid #fff",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    }}
                  />
                  <Upload
                    name="file"
                    showUploadList={false}
                    action="/api/upload"
                    onChange={handleAvatarChange}
                    style={{
                      position: "absolute",
                      bottom: 24,
                      right: 0,
                    }}
                  >
                    <Button
                      shape="circle"
                      size="small"
                      icon={<CameraOutlined style={{ fontSize: 12 }} />}
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        background: "#fff",
                        border: "1px solid #E2E8F0",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    />
                  </Upload>
                </div>
                <Title level={3} style={{ margin: "0 0 8px 0", fontSize: 20 }}>
                  {u.username}
                </Title>
                <Tag
                  color={u.role === UserRoleEnum.Admin ? "gold" : "blue"}
                  bordered={false}
                  style={{
                    borderRadius: 4,
                    padding: "2px 12px",
                    marginBottom: 24,
                  }}
                >
                  {UserRoleMap[u.role as UserRoleEnum]?.label}
                </Tag>

                <Divider style={{ margin: "24px 0" }} />

                <div style={{ textAlign: "left" }}>
                  <Space
                    direction="vertical"
                    size={16}
                    style={{ width: "100%" }}
                  >
                    <div className="flex items-center text-[#64748B]">
                      <PhoneOutlined style={{ marginRight: 12 }} />
                      <Text style={{ color: "#334155" }}>{u.phone}</Text>
                    </div>
                    <div className="flex items-center text-[#64748B]">
                      <MailOutlined style={{ marginRight: 12 }} />
                      <Text style={{ color: "#334155" }}>{u.email}</Text>
                    </div>
                    <div className="flex items-center text-[#64748B]">
                      <EnvironmentOutlined style={{ marginRight: 12 }} />
                      <Text style={{ color: "#334155" }} ellipsis>
                        {u.address || "未填写地址"}
                      </Text>
                    </div>
                  </Space>
                </div>

                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  block
                  style={{
                    marginTop: 32,
                    height: 40,
                    background: "#2A9D8F",
                    border: "none",
                    borderRadius: 6,
                  }}
                >
                  编辑资料
                </Button>
              </Card>
            </Col>

            {/* 右侧：详细信息 */}
            <Col xs={24} md={16}>
              <Card
                bordered={false}
                className="card-shadow"
                style={{ borderRadius: 12, marginBottom: 24 }}
                title={<span style={{ fontWeight: 600 }}>身份认证</span>}
              >
                <Descriptions
                  column={1}
                  labelStyle={{ color: "#64748B", width: 120 }}
                >
                  <Descriptions.Item
                    label={
                      <Space>
                        <UserOutlined />
                        真实姓名
                      </Space>
                    }
                  >
                    <Text strong>{u.real_name || "未认证"}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={
                      <Space>
                        <IdcardOutlined />
                        身份证号
                      </Space>
                    }
                  >
                    <Text strong>
                      {u.id_card
                        ? `${u.id_card.slice(0, 4)}**********${u.id_card.slice(
                            -4
                          )}`
                        : "未认证"}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card
                bordered={false}
                className="card-shadow"
                style={{ borderRadius: 12 }}
                title={<span style={{ fontWeight: 600 }}>账号安全</span>}
              >
                <Descriptions
                  column={1}
                  labelStyle={{ color: "#64748B", width: 120 }}
                >
                  <Descriptions.Item
                    label={
                      <Space>
                        <SafetyCertificateOutlined />
                        账号状态
                      </Space>
                    }
                  >
                    <Tag
                      color={
                        u.status === UserStatusEnum.Normal ? "success" : "error"
                      }
                      bordered={false}
                    >
                      {UserStatusMap[u.status as UserStatusEnum]?.label}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={
                      <Space>
                        <CalendarOutlined />
                        注册时间
                      </Space>
                    }
                  >
                    <Text>
                      {dayjs(u.create_time).format("YYYY-MM-DD HH:mm")}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={
                      <Space>
                        <CalendarOutlined />
                        最后更新
                      </Space>
                    }
                  >
                    <Text>
                      {dayjs(u.update_time).format("YYYY-MM-DD HH:mm")}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
        )}
      </Spin>
    </div>
  );
}
