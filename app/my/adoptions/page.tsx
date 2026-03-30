"use client";

import { useState } from "react";
import { useRequest } from "ahooks";
import { useRouter } from "next/navigation";
import {
  Col,
  Row,
  Button,
  Tag,
  Typography,
  Empty,
  message,
  Spin,
  Space,
  Steps,
  Avatar,
} from "antd";
import {
  HistoryOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { request } from "@/utils/request";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import {
  getLocalDefaultPetCoverBySpecies,
  getPetCoverImage,
} from "@/lib/petImage";

const { Title, Text } = Typography;

interface AdoptionRecord {
  apply_id: number;
  pet_id: number;
  pet_name: string;
  species: string;
  breed?: string;
  image_urls?: string | string[];
  owner_name: string;
  owner_avatar?: string;
  status: number;
  create_time: string;
  review_time?: string;
  review_message?: string;
}

export default function MyAdoptionsPage() {
  const router = useRouter();
  const [failedImageByPetId, setFailedImageByPetId] = useState<
    Record<number, string>
  >({});

  const { data, loading } = useRequest(
    () => request.get("/api/adoption/my-list"),
    {
      onSuccess: (res) => {
        setFailedImageByPetId({});
        if (res.businessCode !== 0) {
          message.error(res.message);
        }
      },
    }
  );

  const list = (data?.data as { list?: AdoptionRecord[] })?.list ?? [];

  const getStatusConfig = (status: number) => {
    switch (status) {
      case 0:
        return {
          color: "blue",
          text: "待审核",
          icon: <ClockCircleOutlined />,
          step: 1,
        };
      case 1:
        return {
          color: "green",
          text: "审核通过",
          icon: <CheckCircleOutlined />,
          step: 2,
        };
      case 2:
        return {
          color: "red",
          text: "已拒绝",
          icon: <CloseCircleOutlined />,
          step: 2,
        };
      default:
        return { color: "default", text: "未知", icon: null, step: 0 };
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
            我的领养申请
          </Title>
          <Text style={{ color: "var(--text-secondary)", fontSize: 16 }}>
            追踪您的每一份爱心传递进度
          </Text>
        </div>

        <Spin spinning={loading} tip="正在同步申请进度...">
          {list.length > 0 ? (
            <Space direction="vertical" size={32} style={{ width: "100%" }}>
              {list.map((item, index) => {
                const status = getStatusConfig(item.status);
                const imageUrl = getPetCoverImage(
                  item.image_urls,
                  item.species
                );

                return (
                  <motion.div
                    key={item.apply_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="modern-card"
                    style={{ padding: 32 }}
                  >
                    <Row gutter={48} align="middle">
                      <Col xs={24} md={6}>
                        <div
                          style={{ position: "relative", cursor: "pointer" }}
                          onClick={() =>
                            router.push(`/pet/detail?pet_id=${item.pet_id}`)
                          }
                        >
                          {/* 左侧缩略图统一封面容器：圆角/溢出/相对定位 */}
                          <div className="pet-list-card__cover" style={{ padding: 16 }}>
                          <img
                            src={
                              failedImageByPetId[item.pet_id] ?? imageUrl
                            }
                            alt={item.pet_name}
                            className="pet-card-img pet-list-card__thumb"
                            referrerPolicy="no-referrer"
                            onError={() => {
                              setFailedImageByPetId((prev) => {
                                if (prev[item.pet_id]) return prev;
                                return {
                                  ...prev,
                                  [item.pet_id]:
                                    getLocalDefaultPetCoverBySpecies(
                                      item.species
                                    ),
                                };
                              });
                            }}
                          />
                          <div
                            style={{ position: "absolute", top: 16, left: 16 }}
                          >
                            <Tag
                              color={status.color}
                              style={{
                                borderRadius: 8,
                                padding: "4px 16px",
                                fontWeight: 600,
                                border: "none",
                                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                              }}
                            >
                              {status.text}
                            </Tag>
                          </div>
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} md={18}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 24,
                          }}
                        >
                          <div>
                            <Title
                              style={{
                                margin: "0 0 8px 0",
                                fontSize: 24,
                                fontWeight: 800,
                              }}
                            >
                              {item.pet_name}
                            </Title>
                            <Text
                              style={{
                                color: "var(--text-secondary)",
                                fontSize: 14,
                                fontWeight: 500,
                              }}
                            >
                              {item.species} · {item.breed || "普通品种"}
                            </Text>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <Text
                              style={{
                                fontSize: 12,
                                color: "var(--text-muted)",
                                display: "block",
                                marginBottom: 4,
                              }}
                            >
                              申请时间
                            </Text>
                            <Text style={{ fontSize: 14, fontWeight: 600 }}>
                              {dayjs(item.create_time).format("YYYY-MM-DD")}
                            </Text>
                          </div>
                        </div>

                        <Steps
                          size="small"
                          current={status.step}
                          items={[
                            {
                              title: "提交申请",
                            },
                            {
                              title: "原主人审核",
                              description:
                                item.status === 0 ? "审核中" : "已处理",
                            },
                            {
                              title:
                                item.status === 2 ? "审核未通过" : "成功领养",
                              status:
                                item.status === 2
                                  ? "error"
                                  : item.status === 1
                                  ? "finish"
                                  : "wait",
                            },
                          ]}
                          style={{ marginBottom: 32, padding: "0 8px" }}
                        />

                        <div
                          style={{
                            padding: "16px 24px",
                            background: "var(--bg-main)",
                            borderRadius: 16,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Space size={12}>
                            <Avatar
                              size={32}
                              src={item.owner_avatar}
                              icon={<UserOutlined />}
                            />
                            <div>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-muted)",
                                  display: "block",
                                  lineHeight: 1,
                                }}
                              >
                                原主人
                              </Text>
                              <Text style={{ fontSize: 14, fontWeight: 600 }}>
                                {item.owner_name}
                              </Text>
                            </div>
                          </Space>

                          {item.review_message && (
                            <div
                              style={{
                                flex: 1,
                                margin: "0 32px",
                                padding: "8px 16px",
                                background: "white",
                                borderRadius: 8,
                                borderLeft: `4px solid ${
                                  item.status === 2
                                    ? "var(--color-error)"
                                    : "var(--color-success)"
                                }`,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 13,
                                  color: "var(--text-secondary)",
                                }}
                              >
                                <Text strong>审核意见：</Text>
                                {item.review_message}
                              </Text>
                            </div>
                          )}

                          <Button
                            type="link"
                            className="btn-link"
                            style={{ fontWeight: 600 }}
                            onClick={() =>
                              router.push(`/pet/detail?pet_id=${item.pet_id}`)
                            }
                          >
                            查看宠物详情 <ArrowRightOutlined />
                          </Button>
                        </div>
                      </Col>
                    </Row>
                  </motion.div>
                );
              })}
            </Space>
          ) : (
            !loading && (
              <div
                style={{
                  padding: "100px 0",
                  textAlign: "center",
                  background: "white",
                  borderRadius: 32,
                }}
              >
                <Empty
                  image={
                    <HistoryOutlined
                      style={{
                        fontSize: 64,
                        color: "var(--border-light)",
                        marginBottom: 24,
                      }}
                    />
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 16 }}>
                      您还没有提交过领养申请哦
                    </Text>
                  }
                >
                  <Button
                    className="btn-primary"
                    type="primary"
                    size="large"
                    onClick={() => router.push("/")}
                    style={{ marginTop: 24 }}
                  >
                    开启领养之旅
                  </Button>
                </Empty>
              </div>
            )
          )}
        </Spin>
      </motion.div>
    </div>
  );
}
