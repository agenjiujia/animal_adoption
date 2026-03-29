"use client";

import { useEffect, useState } from "react";
import { useRequest } from "ahooks";
import { useRouter } from "next/navigation";
import {
  Card,
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
  Divider,
} from "antd";
import {
  InfoCircleOutlined,
  HistoryOutlined,
  UserOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { request } from "@/utils/request";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

interface AdoptionRecord {
  app_id: number;
  pet_id: number;
  user_id: number;
  pet_name: string;
  species: string;
  breed?: string;
  image_urls?: string;
  pet_description?: string;
  owner_name: string;
  status: number;
  apply_time: string;
  audit_time?: string;
  audit_remark?: string;
}

export default function MyAdoptionsPage() {
  const router = useRouter();

  const { data, loading, error } = useRequest(
    () => request.get("/api/adoption/my-list"),
    {
      onSuccess: (res) => {
        if (res.businessCode !== 0) {
          message.error(res.message || "获取领养记录失败");
        }
      },
      onError: () => {
        message.error("网络请求失败");
      },
    }
  );

  const list = (data?.data as { list?: AdoptionRecord[] })?.list ?? [];

  const getStatusInfo = (status: number) => {
    const m: Record<
      number,
      {
        color: string;
        text: string;
        step: number;
        status: "process" | "wait" | "finish" | "error";
      }
    > = {
      0: { color: "blue", text: "审核中", step: 1, status: "process" },
      1: { color: "orange", text: "已取消", step: 1, status: "wait" }, // 业务暂未实现取消，预留
      2: { color: "red", text: "被拒绝", step: 2, status: "error" },
      3: { color: "green", text: "已通过", step: 2, status: "finish" },
    };
    return (
      m[status] || { color: "default", text: "未知", step: 0, status: "wait" }
    );
  };

  const getDefaultImage = (species: string | number) => {
    const s = String(species);
    if (species === "猫" || s === "1") {
      return "https://5b0988e595225.cdn.sohucs.com/images/20190808/082b82088b154024a5d8dba5da1b1c57.jpeg";
    }
    if (species === "狗" || s === "2") {
      return "https://img2.baidu.com/it/u=4071791880,181388239&fm=253&app=138&f=JPEG?w=500&h=625";
    }
    return "https://img.js.design/assets/smartFill/img457164da74a008.jpg";
  };

  return (
    <div style={{ padding: "24px", background: "#F8FAFC", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <Title
            level={2}
            style={{ marginBottom: 8, fontSize: 24, fontWeight: 600 }}
          >
            我的领养记录
          </Title>
          <Text style={{ color: "#64748B" }}>
            记录您与每一位小伙伴的缘分起点
          </Text>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "100px 0" }}>
            <Spin size="large" description="正在获取领养历史..." />
          </div>
        ) : list.length > 0 ? (
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            {list.map((record) => {
              const statusInfo = getStatusInfo(record.status);
              return (
                <Card
                  key={record.app_id}
                  className="card-shadow"
                  bordered={false}
                  style={{
                    borderRadius: 8,
                  }}
                  bodyStyle={{ padding: 24 }}
                >
                  <Row gutter={32} align="middle">
                    <Col xs={24} md={6}>
                      <div
                        style={{
                          height: 140,
                          borderRadius: 6,
                          overflow: "hidden",
                          background: "#F1F5F9",
                        }}
                      >
                        <img
                          src={
                            record.image_urls
                              ? record.image_urls.split(",")[0]
                              : getDefaultImage(record.species)
                          }
                          alt={record.pet_name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={18}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 20,
                        }}
                      >
                        <div>
                          <Title
                            level={4}
                            style={{
                              marginBottom: 8,
                              fontSize: 18,
                              color: "#0F172A",
                            }}
                          >
                            {record.pet_name}
                          </Title>
                          <Space size={12}>
                            <Tag
                              bordered={false}
                              style={{
                                background: "#F1F5F9",
                                color: "#475569",
                                borderRadius: 4,
                              }}
                            >
                              {record.breed || record.species}
                            </Tag>
                            <Text style={{ fontSize: 13, color: "#64748B" }}>
                              <UserOutlined style={{ marginRight: 4 }} />
                              发布者: {record.owner_name}
                            </Text>
                          </Space>
                        </div>
                        <Tag
                          color={
                            statusInfo.color === "blue"
                              ? "processing"
                              : statusInfo.color === "green"
                              ? "success"
                              : "error"
                          }
                          bordered={false}
                          style={{
                            padding: "2px 12px",
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {statusInfo.text}
                        </Tag>
                      </div>

                      <div
                        style={{
                          background: "#F8FAFC",
                          padding: "20px 24px",
                          borderRadius: 8,
                          marginBottom: 20,
                          border: "1px solid #F1F5F9",
                        }}
                      >
                        <Steps
                          size="small"
                          current={statusInfo.step}
                          status={statusInfo.status}
                          items={[
                            {
                              title: "提交申请",
                              description: dayjs(record.apply_time).format(
                                "MM-DD HH:mm"
                              ),
                            },
                            {
                              title: "后台审核",
                              description: record.audit_time
                                ? dayjs(record.audit_time).format("MM-DD HH:mm")
                                : "等待中",
                            },
                            {
                              title:
                                record.status === 2 ? "申请拒绝" : "领养成功",
                              description:
                                record.audit_remark ||
                                (record.status === 3 ? "恭喜您！" : ""),
                            },
                          ]}
                        />
                      </div>

                      <div
                        style={{ display: "flex", justifyContent: "flex-end" }}
                      >
                        <Button
                          icon={<InfoCircleOutlined />}
                          onClick={() =>
                            router.push(`/pet/detail?pet_id=${record.pet_id}`)
                          }
                          style={{ borderRadius: 6, color: "#64748B" }}
                        >
                          详情
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </Card>
              );
            })}
          </Space>
        ) : (
          <Card
            bordered={false}
            style={{
              padding: "80px 0",
              textAlign: "center",
              borderRadius: 12,
            }}
          >
            <Empty
              description={
                <Text style={{ color: "#94A3B8" }}>暂无领养申请记录</Text>
              }
            >
              <Button
                type="primary"
                onClick={() => router.push("/")}
                style={{
                  height: 40,
                  borderRadius: 6,
                  background: "#2A9D8F",
                  border: "none",
                }}
              >
                探索更多伙伴
              </Button>
            </Empty>
          </Card>
        )}
      </div>
    </div>
  );
}
