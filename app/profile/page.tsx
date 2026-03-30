"use client";

import { useRequest } from "ahooks";
import { useState } from "react";
import {
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
  Modal,
  Form,
  Input,
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
  FormOutlined,
  HeartOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { request } from "@/utils/request";
import { UserRoleMap, UserStatusMap } from "@/constant";
import { UserRoleEnum, UserStatusEnum } from "@/types";
import dayjs from "dayjs";
import type { UploadChangeParam } from "antd/es/upload";

import { motion } from "framer-motion";

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
  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm] = Form.useForm<{
    username: string;
    email?: string;
    real_name?: string;
    address?: string;
  }>();

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
            try {
              const raw = localStorage.getItem("userInfo");
              if (raw) {
                const parsed = JSON.parse(raw) as Record<string, unknown>;
                localStorage.setItem(
                  "userInfo",
                  JSON.stringify({ ...parsed, avatar: url })
                );
                window.dispatchEvent(new Event("userInfoUpdated"));
              }
            } catch {
              // ignore local cache parse failure
            }
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

  const openEditModal = () => {
    if (!u) return;
    editForm.setFieldsValue({
      username: u.username,
      email: u.email || "",
      real_name: u.real_name || "",
      address: u.address || "",
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      setEditSubmitting(true);

      await request.patch("/api/user/me", {
        username: values.username.trim(),
        email: (values.email || "").trim(),
        real_name: (values.real_name || "").trim(),
        address: (values.address || "").trim(),
      });

      try {
        const raw = localStorage.getItem("userInfo");
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          localStorage.setItem(
            "userInfo",
            JSON.stringify({
              ...parsed,
              username: values.username.trim(),
            })
          );
          window.dispatchEvent(new Event("userInfoUpdated"));
        }
      } catch {
        // ignore local cache parse failure
      }

      message.success("资料更新成功");
      setEditOpen(false);
      refresh();
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return;
      message.error("资料更新失败");
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 0" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div style={{ marginBottom: 48 }}>
          <Title style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
            个人中心
          </Title>
          <Text style={{ color: "var(--text-secondary)", fontSize: 16 }}>
            管理您的账号信息、身份认证与偏好设置
          </Text>
        </div>

        <Spin spinning={loading}>
          {u && (
            <Row gutter={[32, 32]}>
              {/* 左侧：个人名片 */}
              <Col xs={24} md={8}>
                <div
                  className="modern-card"
                  style={{ textAlign: "center", padding: "48px 24px" }}
                >
                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                      marginBottom: 24,
                    }}
                  >
                    <Avatar
                      size={120}
                      src={u.avatar}
                      icon={<UserOutlined />}
                      style={{
                        backgroundColor: "var(--bg-main)",
                        color: "var(--primary)",
                        border: "4px solid white",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Upload
                      name="file"
                      showUploadList={false}
                      action="/api/upload"
                      onChange={handleAvatarChange}
                    >
                      <Button
                        shape="circle"
                        icon={<CameraOutlined />}
                        style={{
                          position: "absolute",
                          bottom: 4,
                          right: 4,
                          background: "var(--primary)",
                          color: "white",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                        }}
                      />
                    </Upload>
                  </div>
                  <Title
                    level={3}
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: 24,
                      fontWeight: 800,
                    }}
                  >
                    {u.username}
                  </Title>
                  <Tag
                    bordered={false}
                    color={u.role === UserRoleEnum.Admin ? "purple" : "blue"}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 8,
                      fontWeight: 600,
                    }}
                  >
                    {u.role === UserRoleEnum.Admin
                      ? "平台管理员"
                      : "爱心领养人"}
                  </Tag>

                  <Divider style={{ margin: "32px 0" }} />

                  <div style={{ textAlign: "left", padding: "0 8px" }}>
                    <Space
                      orientation="vertical"
                      size={20}
                      style={{ width: "100%" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: "rgba(79, 70, 229, 0.05)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--primary)",
                          }}
                        >
                          <PhoneOutlined />
                        </div>
                        <Text
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {u.phone}
                        </Text>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: "rgba(79, 70, 229, 0.05)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--primary)",
                          }}
                        >
                          <MailOutlined />
                        </div>
                        <Text
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {u.email}
                        </Text>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: "rgba(79, 70, 229, 0.05)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--primary)",
                          }}
                        >
                          <EnvironmentOutlined />
                        </div>
                        <Text
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 500,
                          }}
                          ellipsis
                        >
                          {u.address || "未填写联系地址"}
                        </Text>
                      </div>
                    </Space>
                  </div>

                  <Button
                    type="primary"
                    className="btn-primary"
                    icon={<EditOutlined />}
                    block
                    onClick={openEditModal}
                    style={{
                      marginTop: 40,
                      height: 48,
                      fontSize: 16,
                    }}
                  >
                    编辑个人资料
                  </Button>
                </div>
              </Col>

              {/* 右侧：详细内容 */}
              <Col xs={24} md={16}>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 32 }}
                >
                  <div className="modern-card" style={{ padding: 32 }}>
                    <Title
                      level={4}
                      style={{
                        marginBottom: 20,
                        fontWeight: 700,
                      }}
                    >
                      我的领养
                    </Title>
                    <Paragraph
                      type="secondary"
                      style={{ marginBottom: 20, fontSize: 14 }}
                    >
                      查看与管理您发布的宠物、收藏的宠物及领养申请进度。
                    </Paragraph>
                    <Space wrap size={12}>
                      <Link href="/pet/my-publish">
                        <Button icon={<FormOutlined />} type="primary">
                          我发布的宠物
                        </Button>
                      </Link>
                      <Link href="/my/favorites">
                        <Button icon={<HeartOutlined />}>我的收藏</Button>
                      </Link>
                      <Link href="/my/adoptions">
                        <Button icon={<AppstoreOutlined />}>我的领养申请</Button>
                      </Link>
                    </Space>
                  </div>

                  <div className="modern-card" style={{ padding: 32 }}>
                    <Title
                      level={4}
                      style={{
                        marginBottom: 24,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <SafetyCertificateOutlined
                        style={{ color: "var(--primary)" }}
                      />
                      身份认证
                    </Title>
                    <Descriptions
                      column={1}
                      labelStyle={{
                        color: "var(--text-secondary)",
                        width: 140,
                        fontSize: 15,
                      }}
                      contentStyle={{ fontSize: 15, fontWeight: 600 }}
                    >
                      <Descriptions.Item label="真实姓名">
                        {u.real_name || (
                          <Text type="secondary" style={{ fontWeight: 400 }}>
                            未认证
                          </Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="身份证号">
                        {u.id_card ? (
                          `${u.id_card.slice(0, 4)}**********${u.id_card.slice(
                            -4
                          )}`
                        ) : (
                          <Text type="secondary" style={{ fontWeight: 400 }}>
                            未认证
                          </Text>
                        )}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>

                  <div className="modern-card" style={{ padding: 32 }}>
                    <Title
                      level={4}
                      style={{
                        marginBottom: 24,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <CalendarOutlined style={{ color: "var(--primary)" }} />
                      账号信息
                    </Title>
                    <Descriptions
                      column={1}
                      labelStyle={{
                        color: "var(--text-secondary)",
                        width: 140,
                        fontSize: 15,
                      }}
                      contentStyle={{ fontSize: 15, fontWeight: 600 }}
                    >
                      <Descriptions.Item label="账号状态">
                        <Tag
                          color={
                            u.status === UserStatusEnum.Normal
                              ? "success"
                              : "error"
                          }
                          bordered={false}
                          style={{ borderRadius: 6, fontWeight: 600 }}
                        >
                          {UserStatusMap[u.status as UserStatusEnum]?.label}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="注册时间">
                        <Text style={{ fontWeight: 500 }}>
                          {dayjs(u.create_time).format("YYYY-MM-DD HH:mm")}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="资料更新">
                        <Text style={{ fontWeight: 500 }}>
                          {dayjs(u.update_time).format("YYYY-MM-DD HH:mm")}
                        </Text>
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                </div>
              </Col>
            </Row>
          )}
        </Spin>

        <Modal
          title="编辑个人资料"
          open={editOpen}
          onCancel={() => setEditOpen(false)}
          onOk={handleEditSubmit}
          okText="保存"
          cancelText="取消"
          confirmLoading={editSubmitting}
          destroyOnHidden
        >
          <Form form={editForm} layout="vertical" style={{ marginTop: 12 }}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, whitespace: true, message: "请输入用户名" },
              ]}
            >
              <Input maxLength={50} />
            </Form.Item>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[{ type: "email", message: "请输入有效邮箱地址" }]}
            >
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="real_name" label="真实姓名">
              <Input maxLength={50} />
            </Form.Item>
            <Form.Item name="address" label="联系地址">
              <Input.TextArea rows={3} maxLength={255} showCount />
            </Form.Item>
          </Form>
        </Modal>
      </motion.div>
    </div>
  );
}
