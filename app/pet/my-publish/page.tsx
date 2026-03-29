"use client";

import { useEffect, useState } from "react";
import { useRequest } from "ahooks";
import { useRouter } from "next/navigation";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Typography,
  Card,
  Modal,
  Spin,
  Row,
  Col,
  Tag,
  Empty,
  message,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { request } from "@/utils/request";
import {
  PetGenderOptions,
  PetVaccineStatusOptions,
  PetNeuteredOptions,
  PetSpeciesOptions,
} from "@/constant";
import { PetStatusEnum } from "@/types";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

interface PetItem {
  pet_id: number;
  user_id: number;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  gender: number;
  weight?: number;
  image_urls?: string;
  description?: string;
  vaccine_status: number;
  neutered: number;
  status: number;
  create_time: string;
  update_time: string;
}

interface QueryParams {
  pet_id?: number;
  name?: string;
  species?: string;
  gender?: number;
  status?: number;
  vaccine_status?: number;
  neutered?: number;
  pageNum: number;
  pageSize: number;
}

export default function MyPublishPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("userInfo");
      if (raw) {
        const u = JSON.parse(raw) as { user_id?: number };
        setTimeout(() => setCurrentUserId(u.user_id ?? null), 0);
      }
    } catch {
      setTimeout(() => setCurrentUserId(null), 0);
    }
  }, []);

  const {
    run: load,
    loading,
    data,
  } = useRequest((p: QueryParams) => request.post("/api/pet/list", p), {
    manual: true,
  });

  useEffect(() => {
    const d = data?.data as
      | { list: PetItem[]; total: number; pageNum: number; pageSize: number }
      | undefined;
    if (d && "total" in d) {
      setTimeout(() => {
        setTotal(d.total);
        setPageNum(d.pageNum);
        setPageSize(d.pageSize);
      }, 0);
    }
  }, [data]);

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    load({ pageNum: 1, pageSize: 12 });
  }, [load]);

  const onSearch = (values: QueryParams) => {
    load({ ...values, pageNum: 1, pageSize });
    setPageNum(1);
  };

  const onReset = () => {
    form.resetFields();
    setPageNum(1);
    load({ pageNum: 1, pageSize });
  };

  const remove = (pet: PetItem) => {
    Modal.confirm({
      title: "确认删除",
      content: `您确定要删除宠物 "${pet.name}" 的发布信息吗？此操作不可撤销。`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await request.delete(`/api/pet/${pet.pet_id}`);
          message.success("删除成功");
          load({ ...form.getFieldsValue(), pageNum, pageSize });
        } catch (error) {
          message.error("删除失败");
        }
      },
    });
  };

  const getStatusTag = (status: number) => {
    const m: Record<number, { color: string; text: string }> = {
      [PetStatusEnum.ForAdoption]: { color: "blue", text: "待领养" },
      [PetStatusEnum.Adopted]: { color: "green", text: "已领养" },
      [PetStatusEnum.Offline]: { color: "orange", text: "已下架" },
    };
    const s = m[status] || { color: "default", text: "未知" };
    return (
      <Tag color={s.color} bordered={false}>
        {s.text}
      </Tag>
    );
  };

  const getGenderTag = (gender: number) => {
    if (gender === 1)
      return (
        <Tag color="blue" bordered={false}>
          公
        </Tag>
      );
    if (gender === 0)
      return (
        <Tag color="magenta" bordered={false}>
          母
        </Tag>
      );
    return <Tag bordered={false}>未知</Tag>;
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

  const list = (data?.data as { list?: PetItem[] })?.list ?? [];

  return (
    <div
      style={{
        padding: "24px",
        background: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <div>
            <Title
              level={2}
              style={{ marginBottom: 8, fontSize: 24, fontWeight: 600 }}
            >
              我发布的宠物
            </Title>
            <Text style={{ color: "#64748B" }}>
              管理您发布的每一份领养爱心，共计 {total} 个发布单
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => router.push("/pet/new")}
            style={{
              height: 44,
              padding: "0 24px",
              borderRadius: 6,
              background: "#2A9D8F",
              border: "none",
              boxShadow: "0 4px 12px rgba(42, 157, 143, 0.2)",
            }}
          >
            发布新宠物
          </Button>
        </div>

        {/* 筛选区域 */}
        <Card
          bordered={false}
          className="card-shadow"
          style={{
            marginBottom: 32,
            borderRadius: 8,
          }}
          bodyStyle={{ padding: "20px 24px" }}
        >
          <Form
            form={form}
            layout="inline"
            onFinish={onSearch}
            style={{ display: "flex", flexWrap: "wrap", gap: 16 }}
          >
            <Form.Item name="name" style={{ marginBottom: 0 }}>
              <Input
                placeholder="搜索宠物名称"
                allowClear
                prefix={<SearchOutlined style={{ color: "#CBD5E1" }} />}
                style={{ borderRadius: 6, width: 200 }}
              />
            </Form.Item>
            <Form.Item
              name="species"
              style={{ marginBottom: 0, minWidth: 140 }}
            >
              <Select
                placeholder="宠物种类"
                allowClear
                options={PetSpeciesOptions}
                style={{ borderRadius: 6 }}
              />
            </Form.Item>
            <Form.Item name="status" style={{ marginBottom: 0, minWidth: 140 }}>
              <Select
                placeholder="发布状态"
                allowClear
                options={[
                  { label: "待领养", value: PetStatusEnum.ForAdoption },
                  { label: "已领养", value: PetStatusEnum.Adopted },
                  { label: "已下架", value: PetStatusEnum.Offline },
                ]}
                style={{ borderRadius: 6 }}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Space size={12}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<SearchOutlined />}
                  style={{
                    borderRadius: 6,
                    background: "#2A9D8F",
                    border: "none",
                  }}
                >
                  查询
                </Button>
                <Button
                  onClick={onReset}
                  icon={<ReloadOutlined />}
                  style={{ borderRadius: 6 }}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {loading ? (
          <div style={{ textAlign: "center", padding: "100px 0" }}>
            <Spin size="large" description="正在获取发布列表..." />
          </div>
        ) : list.length > 0 ? (
          <>
            <Row gutter={[24, 24]}>
              {list.map((pet) => (
                <Col key={pet.pet_id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    className="card-shadow"
                    bordered={false}
                    style={{
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                    bodyStyle={{ padding: 20 }}
                    cover={
                      <div
                        style={{
                          height: 200,
                          overflow: "hidden",
                          position: "relative",
                          background: "#F1F5F9",
                        }}
                      >
                        <img
                          alt={pet.name}
                          src={
                            pet.image_urls
                              ? pet.image_urls.split(",")[0]
                              : getDefaultImage(pet.species)
                          }
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                        <div
                          style={{ position: "absolute", top: 12, left: 12 }}
                        >
                          <Tag
                            bordered={false}
                            style={{
                              background:
                                pet.status === PetStatusEnum.ForAdoption
                                  ? "#E6F4F1"
                                  : pet.status === PetStatusEnum.Adopted
                                  ? "#E6F7F0"
                                  : "#F1F5F9",
                              color:
                                pet.status === PetStatusEnum.ForAdoption
                                  ? "#2A9D8F"
                                  : pet.status === PetStatusEnum.Adopted
                                  ? "#10B981"
                                  : "#64748B",
                              borderRadius: 4,
                              fontWeight: 500,
                            }}
                          >
                            {getStatusTag(pet.status).props.children}
                          </Tag>
                        </div>
                      </div>
                    }
                    actions={[
                      <Button
                        key="detail"
                        type="text"
                        size="small"
                        onClick={() =>
                          router.push(`/pet/detail/?pet_id=${pet.pet_id}`)
                        }
                        style={{ color: "#64748B" }}
                      >
                        详情
                      </Button>,
                      <Button
                        key="edit"
                        type="text"
                        size="small"
                        onClick={() =>
                          router.push(`/pet/edit/?pet_id=${pet.pet_id}`)
                        }
                        style={{ color: "#3B82F6" }}
                      >
                        编辑
                      </Button>,
                      <Button
                        key="delete"
                        type="text"
                        danger
                        size="small"
                        onClick={() => remove(pet)}
                      >
                        删除
                      </Button>,
                    ]}
                  >
                    <Card.Meta
                      title={
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 12,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 17,
                              fontWeight: 600,
                              color: "#0F172A",
                            }}
                          >
                            {pet.name}
                          </span>
                          {getGenderTag(pet.gender)}
                        </div>
                      }
                      description={
                        <div>
                          <Space size={8} wrap style={{ marginBottom: 12 }}>
                            {pet.breed && (
                              <Tag
                                bordered={false}
                                style={{
                                  borderRadius: 4,
                                  background: "#F1F5F9",
                                  color: "#475569",
                                  fontSize: 11,
                                }}
                              >
                                {pet.breed}
                              </Tag>
                            )}
                            <Tag
                              bordered={false}
                              style={{
                                borderRadius: 4,
                                background: "#F1F5F9",
                                color: "#475569",
                                fontSize: 11,
                              }}
                            >
                              {pet.age ? `${pet.age}个月` : "年龄未知"}
                            </Tag>
                          </Space>
                          <Paragraph
                            style={{
                              color: "#64748B",
                              fontSize: 13,
                              marginBottom: 16,
                              height: 40,
                              lineHeight: 1.5,
                            }}
                            ellipsis={{ rows: 2 }}
                          >
                            {pet.description || "暂无描述信息"}
                          </Paragraph>
                          <div
                            style={{
                              borderTop: "1px solid #F1F5F9",
                              paddingTop: 12,
                              marginTop: 4,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                              更新于{" "}
                              {dayjs(pet.update_time).format("YYYY-MM-DD")}
                            </Text>
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 分页 */}
            <div
              style={{ marginTop: 48, textAlign: "center", paddingBottom: 40 }}
            >
              <Space size={16}>
                <Button
                  disabled={pageNum <= 1}
                  onClick={() => {
                    const next = pageNum - 1;
                    setPageNum(next);
                    load({ ...form.getFieldsValue(), pageNum: next, pageSize });
                  }}
                  style={{ borderRadius: 6 }}
                >
                  上一页
                </Button>
                <Text style={{ color: "#64748B" }}>
                  第 {pageNum} 页 / 共 {Math.ceil(total / pageSize)} 页
                </Text>
                <Button
                  disabled={pageNum >= Math.ceil(total / pageSize)}
                  onClick={() => {
                    const next = pageNum + 1;
                    setPageNum(next);
                    load({ ...form.getFieldsValue(), pageNum: next, pageSize });
                  }}
                  style={{ borderRadius: 6 }}
                >
                  下一页
                </Button>
              </Space>
            </div>
          </>
        ) : (
          <Card
            bordered={false}
            style={{
              padding: "80px 0",
              textAlign: "center",
              borderRadius: 8,
            }}
            className="card-shadow"
          >
            <Empty
              description={
                <Text style={{ color: "#94A3B8" }}>
                  您还没有发布过任何宠物信息
                </Text>
              }
            >
              <Button
                type="primary"
                onClick={() => router.push("/pet/new")}
                style={{
                  height: 40,
                  borderRadius: 6,
                  background: "#2A9D8F",
                  border: "none",
                }}
              >
                立即发布第一个宠物
              </Button>
            </Empty>
          </Card>
        )}
      </div>
    </div>
  );
}
