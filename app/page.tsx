"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  notification,
} from "antd";
import {
  HeartOutlined,
  HeartFilled,
  InfoCircleOutlined,
  BellOutlined,
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
  is_applied?: number; // 新增：是否已申请
  is_favorited?: number; // 新增：是否已收藏
}

interface AdoptionNotification {
  app_id: number;
  pet_name: string;
  status: number;
  audit_remark: string;
  applicant_name?: string; // 新增：申请人姓名（给管理员看）
  type: "USER" | "ADMIN"; // 新增：通知类型
}

export default function HomePage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize] = useState(12);
  const [hasMore, setHasMore] = useState(true);
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

  const observer = useRef<IntersectionObserver | null>(null);
  const lastPetElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPageNum((prevPageNum) => prevPageNum + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  const fetchPets = async (page: number, size: number) => {
    setLoading(true);
    try {
      const res = await fetch("/api/pet/public/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageNum: page, pageSize: size }),
      });
      const json = await res.json();
      if (json.businessCode === 0) {
        const { list, total: totalCount } = json.data;
        setPets((prev) => (page === 1 ? list : [...prev, ...list]));
        setTotal(totalCount);
        setHasMore(pets.length + list.length < totalCount);

        // 通知处理逻辑
        if (json.data.notifications && json.data.notifications.length > 0) {
          const userAppIds: number[] = [];
          const adminAppIds: number[] = [];

          json.data.notifications.forEach((notif: AdoptionNotification) => {
            if (notif.type === "USER") {
              const isApproved = notif.status === 3;
              notification.open({
                message: isApproved ? "领养申请通过！" : "领养申请被拒绝",
                description: `您对宠物 "${
                  notif.pet_name
                }" 的领养申请已被管理员${
                  isApproved
                    ? "通过，恭喜！"
                    : "拒绝。原因：" + (notif.audit_remark || "无")
                }`,
                icon: (
                  <BellOutlined
                    style={{ color: isApproved ? "#52c41a" : "#ff4d4f" }}
                  />
                ),
                duration: 0,
                key: `notif-user-${notif.app_id}`,
              });
              userAppIds.push(notif.app_id);
            } else if (notif.type === "ADMIN") {
              notification.info({
                message: "新领养申请",
                description: `用户 "${notif.applicant_name}" 申请领养宠物 "${notif.pet_name}"，请尽快处理。`,
                icon: <BellOutlined style={{ color: "#1890ff" }} />,
                duration: 0,
                key: `notif-admin-${notif.app_id}`,
                onClick: () => {
                  router.push("/admin/adoptions");
                },
              });
              adminAppIds.push(notif.app_id);
            }
          });

          // 分别标记已读
          if (userAppIds.length > 0) {
            fetch("/api/adoption/mark-read", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ app_ids: userAppIds }),
            });
          }
          if (adminAppIds.length > 0) {
            fetch("/api/admin/adoption/mark-read", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ app_ids: adminAppIds }),
            });
          }
        }
      } else {
        message.error(json.message || "获取宠物列表失败");
      }
    } catch {
      message.error("网络请求失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPets(pageNum, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum, pageSize]);

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
            setPageNum(1);
            fetchPets(1, pageSize);
          } else if (json.httpCode === 401) {
            message.warning("请先登录后再申请领养");
            router.push("/login");
          } else {
            message.error(json.message || "申请失败");
          }
        } catch {
          message.error("网络请求失败");
        }
      },
    });
  };

  const handleFavorite = async (e: React.MouseEvent, petId: number) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/favorite/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pet_id: petId }),
      });
      const json = await res.json();
      if (json.businessCode === 0) {
        message.success(json.message);
        // 更新本地状态
        setPets((prev) =>
          prev.map((p) =>
            p.pet_id === petId
              ? { ...p, is_favorited: json.data.is_favorited ? 1 : 0 }
              : p
          )
        );
      } else if (json.httpCode === 401) {
        message.warning("请先登录后再收藏");
        router.push("/login");
      } else {
        message.error(json.message || "操作失败");
      }
    } catch {
      message.error("网络请求失败");
    }
  };

  const getGenderTag = (gender: number) => {
    if (gender === 1)
      return (
        <Tag color="blue" bordered={false} style={{ borderRadius: 10 }}>
          公
        </Tag>
      );
    if (gender === 0)
      return (
        <Tag color="magenta" bordered={false} style={{ borderRadius: 10 }}>
          母
        </Tag>
      );
    return (
      <Tag bordered={false} style={{ borderRadius: 10 }}>
        未知
      </Tag>
    );
  };

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
    species: string | number
  ) => {
    const target = e.target as HTMLImageElement;
    const defaultImg = getDefaultImage(species);
    if (target.src === defaultImg || !defaultImg) {
      target.src =
        "https://img.js.design/assets/smartFill/img457164da74a008.jpg";
      target.onerror = null;
    } else {
      target.src = defaultImg;
    }
  };

  const getDefaultImage = (species: string | number) => {
    const s = String(species);
    if (species === "猫" || s === "1") {
      return "https://5b0988e595225.cdn.sohucs.com/images/20190808/082b82088b154024a5d8dba5da1b1c57.jpeg";
    }
    if (species === "狗" || s === "2") {
      return "https://img2.baidu.com/it/u=4071791880,181388239&fm=253&app=138&f=JPEG?w=500&h=625";
    }
    return null;
  };

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Hero Section */}
      <div
        style={{
          height: "400px",
          background: "linear-gradient(135deg, #2A9D8F 0%, #264653 100%)",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          textAlign: "center",
          padding: "0 24px",
          overflow: "hidden",
        }}
      >
        {/* Decorative Elements */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -50,
            left: "10%",
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 800 }}>
          <Title
            style={{
              color: "#fff",
              fontSize: "42px",
              marginBottom: "16px",
              fontWeight: 700,
              letterSpacing: "-1px",
            }}
          >
            给流浪的小生命一个家
          </Title>
          <Paragraph
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "18px",
              marginBottom: "32px",
              lineHeight: 1.6,
            }}
          >
            每一份领养都是一份生命的契约。在这里，遇见你的那个它，开启一段温暖治愈的旅程。
          </Paragraph>
          <Button
            type="primary"
            size="large"
            style={{
              height: 48,
              padding: "0 32px",
              fontSize: 16,
              borderRadius: 6,
              background: "#F4A261",
              border: "none",
              boxShadow: "0 4px 12px rgba(244, 162, 97, 0.3)",
            }}
            onClick={() => {
              const el = document.getElementById("pet-list");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            立即探索
          </Button>
        </div>
      </div>

      <div
        id="pet-list"
        style={{ padding: "64px 24px", maxWidth: "1280px", margin: "0 auto" }}
      >
        <div
          style={{
            marginBottom: "40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <Title level={2} style={{ marginBottom: 8, fontSize: 24 }}>
              待领养小伙伴
            </Title>
            <Text style={{ color: "#64748B", fontSize: 14 }}>
              目前有 {total} 位可爱的小萌宠在等待你的关注
            </Text>
          </div>
        </div>

        {pets.length === 0 && loading ? (
          <Row gutter={[24, 24]}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Col key={i} xs={24} sm={12} md={8} lg={6}>
                <Card
                  loading={true}
                  style={{ borderRadius: 8, border: "none" }}
                />
              </Col>
            ))}
          </Row>
        ) : pets.length > 0 ? (
          <>
            <Row gutter={[24, 24]}>
              {pets.map((pet, index) => {
                const isLastElement = pets.length === index + 1;
                return (
                  <Col
                    key={pet.pet_id}
                    xs={24}
                    sm={12}
                    md={8}
                    lg={6}
                    ref={isLastElement ? lastPetElementRef : null}
                  >
                    <Card
                      hoverable
                      className="card-shadow"
                      style={{
                        borderRadius: 8,
                        overflow: "hidden",
                        border: "1px solid #F1F5F9",
                        transition: "all 0.2s ease",
                      }}
                      bodyStyle={{ padding: "20px" }}
                      cover={
                        <div
                          style={{
                            height: "220px",
                            overflow: "hidden",
                            background: "#F8FAFC",
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              top: 12,
                              left: 12,
                              zIndex: 2,
                            }}
                          >
                            <Tag
                              style={{
                                borderRadius: 4,
                                background: "rgba(15, 23, 42, 0.6)",
                                backdropFilter: "blur(4px)",
                                border: "none",
                                color: "#fff",
                                fontSize: 11,
                                padding: "2px 8px",
                              }}
                            >
                              {pet.species}
                            </Tag>
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                              zIndex: 2,
                            }}
                          >
                            <Button
                              type="text"
                              shape="circle"
                              icon={
                                pet.is_favorited ? (
                                  <HeartFilled style={{ color: "#EF4444" }} />
                                ) : (
                                  <HeartOutlined style={{ color: "#fff" }} />
                                )
                              }
                              onClick={(e) => handleFavorite(e, pet.pet_id)}
                              style={{
                                background: pet.is_favorited
                                  ? "rgba(255,255,255,0.95)"
                                  : "rgba(15, 23, 42, 0.3)",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s",
                              }}
                            />
                          </div>
                          {pet.image_urls || getDefaultImage(pet.species) ? (
                            <img
                              alt={pet.name}
                              src={
                                pet.image_urls
                                  ? pet.image_urls.split(",")[0]
                                  : (getDefaultImage(pet.species) as string)
                              }
                              onError={(e) => handleImageError(e, pet.species)}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                transition: "transform 0.4s ease",
                              }}
                              className="pet-card-image"
                            />
                          ) : (
                            <div
                              style={{
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#CBD5E1",
                                fontSize: 14,
                              }}
                            >
                              暂无图片
                            </div>
                          )}
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
                            style={{ color: "#64748B", fontSize: 13 }}
                          >
                            详情
                          </Button>
                        </Link>,
                        pet.user_id === currentUserId ? (
                          <Button
                            key="self"
                            type="text"
                            disabled
                            size="small"
                            style={{ color: "#CBD5E1", fontSize: 13 }}
                          >
                            我的发布
                          </Button>
                        ) : pet.is_applied ? (
                          <Button
                            key="applied"
                            type="text"
                            disabled
                            size="small"
                            style={{
                              color: "#10B981",
                              fontWeight: 500,
                              fontSize: 13,
                            }}
                          >
                            已申请
                          </Button>
                        ) : (
                          <Button
                            key="adopt"
                            type="text"
                            size="small"
                            onClick={() => handleAdopt(pet)}
                            style={{
                              color: "#2A9D8F",
                              fontWeight: 500,
                              fontSize: 13,
                            }}
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
                                fontSize: 18,
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
                            <div
                              style={{
                                marginBottom: "12px",
                                height: 24,
                                display: "flex",
                                gap: 8,
                              }}
                            >
                              {pet.breed && (
                                <Tag
                                  bordered={false}
                                  style={{
                                    borderRadius: 4,
                                    background: "#F1F5F9",
                                    color: "#475569",
                                    fontSize: 11,
                                    margin: 0,
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
                                  margin: 0,
                                }}
                              >
                                {pet.age ? `${pet.age}个月` : "年龄不详"}
                              </Tag>
                            </div>
                            <Paragraph
                              style={{
                                marginBottom: 0,
                                fontSize: 13,
                                color: "#64748B",
                                lineHeight: 1.5,
                                height: 40,
                                overflow: "hidden",
                              }}
                              ellipsis={{ rows: 2 }}
                            >
                              {pet.description || "暂时还没有详细的介绍哦~"}
                            </Paragraph>
                          </div>
                        }
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>
            <div
              style={{
                marginTop: "48px",
                textAlign: "center",
                paddingBottom: "40px",
              }}
            >
              {loading && (
                <Spin size="large" description="更多小伙伴正在赶来..." />
              )}
              {!hasMore && pets.length > 0 && (
                <div
                  style={{
                    padding: "16px 32px",
                    background: "#F1F5F9",
                    borderRadius: 30,
                    display: "inline-block",
                  }}
                >
                  <Text style={{ color: "#94A3B8", fontSize: 13 }}>
                    已经看到最后啦
                  </Text>
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              padding: "80px 0",
              textAlign: "center",
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <Empty description="暂时没有待领养的伙伴，请稍后再来看看吧" />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div
        style={{
          background: "#fff",
          padding: "64px 24px",
          textAlign: "center",
          borderTop: "1px solid #F1F5F9",
        }}
      >
        <Title level={4} style={{ fontSize: 20, marginBottom: 16 }}>
          让爱延续
        </Title>
        <Paragraph
          style={{
            maxWidth: 700,
            margin: "0 auto",
            color: "#64748B",
            fontSize: 14,
            lineHeight: 1.8,
          }}
        >
          我们致力于为每一只宠物寻找最适合的家庭。领养不仅是给它一个家，更是给自己一个忠诚的伙伴。
          通过我们的平台，您可以安全、便捷地完成领养流程，开启美好的相伴时光。
        </Paragraph>
      </div>

      <style jsx global>{`
        .pet-card-image:hover {
          transform: scale(1.05);
        }
        .ant-card-actions {
          background: transparent !important;
          border-top: 1px solid #f1f5f9 !important;
        }
        .ant-card-actions > li {
          margin: 8px 0 !important;
        }
        .ant-card-actions > li > span {
          display: flex;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
