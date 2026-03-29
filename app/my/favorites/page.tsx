"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Row,
  Button,
  Tag,
  Typography,
  Empty,
  message,
  Modal,
  Spin,
  Space,
} from "antd";
import {
  HeartFilled,
  InfoCircleOutlined,
  HeartOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";

const { Title, Text, Paragraph } = Typography;

interface Pet {
  pet_id: number;
  user_id: number;
  name: string;
  species: string;
  breed: string;
  age: number;
  gender: number;
  image_urls: string;
  description: string;
  status: number;
  is_applied?: number;
  is_favorited?: number;
}

export default function MyFavoritesPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("userInfo");
      if (raw) {
        const u = JSON.parse(raw);
        setCurrentUserId(u.user_id ?? null);
      }
    } catch {
      setCurrentUserId(null);
    }
  }, []);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/favorite/list");
      const json = await res.json();
      if (json.businessCode === 0) {
        setPets(json.data.list);
      } else if (json.httpCode === 401) {
        message.warning("请先登录");
        router.push("/login");
      } else {
        message.error(json.message || "获取收藏列表失败");
      }
    } catch (error) {
      message.error("网络请求失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleAdopt = (pet: Pet) => {
    Modal.confirm({
      title: "确认领养申请",
      content: `您确定要申请领养 ${pet.name} 吗？`,
      okText: "确认申请",
      cancelText: "再想想",
      okButtonProps: { shape: "round" },
      cancelButtonProps: { shape: "round" },
      onOk: async () => {
        try {
          const res = await fetch("/api/adoption/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pet_id: pet.pet_id }),
          });
          const json = await res.json();
          if (json.businessCode === 0) {
            message.success("申请成功，请等待管理员审核");
            fetchFavorites();
          } else {
            message.error(json.message || "申请失败");
          }
        } catch (error) {
          message.error("网络请求失败");
        }
      },
    });
  };

  const handleUnfavorite = async (petId: number) => {
    try {
      const res = await fetch("/api/favorite/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pet_id: petId }),
      });
      const json = await res.json();
      if (json.businessCode === 0) {
        message.success("已取消收藏");
        setPets((prev) => prev.filter((p) => p.pet_id !== petId));
      } else {
        message.error(json.message || "操作失败");
      }
    } catch (error) {
      message.error("网络请求失败");
    }
  };

  const getGenderTag = (gender: number) => {
    if (gender === 1) return <Tag color="blue">公</Tag>;
    if (gender === 0) return <Tag color="magenta">母</Tag>;
    return <Tag>未知</Tag>;
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
    <div
      style={{
        padding: "24px",
        background: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <Title
            level={2}
            style={{ marginBottom: 8, fontSize: 24, fontWeight: 600 }}
          >
            我的收藏
          </Title>
          <Paragraph style={{ color: "#64748B", margin: 0 }}>
            您收藏的所有可爱小伙伴都在这里
          </Paragraph>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "100px 0" }}>
            <Spin size="large" description="正在获取收藏列表..." />
          </div>
        ) : pets.length > 0 ? (
          <Row gutter={[24, 24]}>
            {pets.map((pet) => (
              <Col key={pet.pet_id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  bordered={false}
                  className="card-shadow"
                  style={{ borderRadius: 8, overflow: "hidden" }}
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
                      <Button
                        type="text"
                        shape="circle"
                        icon={<HeartFilled style={{ color: "#EF4444" }} />}
                        onClick={() => handleUnfavorite(pet.pet_id)}
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          background: "rgba(255,255,255,0.95)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                      />
                    </div>
                  }
                  actions={[
                    <Link
                      key="detail"
                      href={`/pet/detail?pet_id=${pet.pet_id}`}
                    >
                      <Button
                        type="text"
                        size="small"
                        style={{ color: "#64748B" }}
                      >
                        详情
                      </Button>
                    </Link>,
                    pet.is_applied ? (
                      <Button
                        key="applied"
                        type="text"
                        disabled
                        size="small"
                        style={{ color: "#10B981", fontWeight: 500 }}
                      >
                        已申请
                      </Button>
                    ) : (
                      <Button
                        key="adopt"
                        type="text"
                        size="small"
                        onClick={() => handleAdopt(pet)}
                        style={{ color: "#2A9D8F", fontWeight: 500 }}
                      >
                        立即领养
                      </Button>
                    ),
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
                            {pet.age}个月
                          </Tag>
                        </Space>
                        <Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{
                            color: "#64748B",
                            fontSize: 13,
                            marginBottom: 0,
                            height: 40,
                            lineHeight: 1.5,
                          }}
                        >
                          {pet.description || "暂无描述"}
                        </Paragraph>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Card
            bordered={false}
            className="card-shadow"
            style={{
              marginTop: 40,
              textAlign: "center",
              borderRadius: 8,
              padding: "80px 0",
            }}
          >
            <Empty
              description={
                <Text style={{ color: "#94A3B8" }}>您还没有收藏任何宠物</Text>
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
                去逛逛
              </Button>
            </Empty>
          </Card>
        )}
      </div>
    </div>
  );
}
