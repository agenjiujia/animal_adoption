"use client";

import { useEffect, useMemo, useState } from "react";
import { useRequest } from "ahooks";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  Typography,
  Descriptions,
  Button,
  Divider,
  Image,
  Tag,
  Carousel,
  Row,
  Col,
  Space,
  Spin,
  Modal,
  message,
  Breadcrumb,
} from "antd";
import {
  LeftOutlined,
  RightOutlined,
  HomeOutlined,
  HeartOutlined,
  HeartFilled,
  CalendarOutlined,
  InfoCircleOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { request } from "@/utils/request";
import {
  PetGenderOptions,
  PetVaccineStatusOptions,
  PetNeuteredOptions,
  PetSpeciesMap,
} from "@/constant";
import { PetSpeciesEnum, PetStatusEnum } from "@/types";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

interface ArrowProps {
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler;
}

const CustomPrevArrow = (props: ArrowProps) => {
  const { className, style, onClick } = props;
  return (
    <div
      className={`${className} custom-arrow prev`}
      style={{ ...style }}
      onClick={onClick}
    >
      <LeftOutlined />
    </div>
  );
};

const CustomNextArrow = (props: ArrowProps) => {
  const { className, style, onClick } = props;
  return (
    <div
      className={`${className} custom-arrow next`}
      style={{ ...style }}
      onClick={onClick}
    >
      <RightOutlined />
    </div>
  );
};

interface PetDetail {
  pet_id: number;
  user_id: number;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  gender: number;
  weight?: number;
  health_status?: string;
  vaccine_status: number;
  neutered: number;
  description?: string;
  image_urls?: string;
  status: number;
  create_time: string;
  update_time: string;
  is_applied?: number;
  is_favorited?: number;
}

export default function PetDetailPage() {
  const router = useRouter();
  const qs = useSearchParams();
  const petId = qs.get("pet_id");
  const [uid, setUid] = useState<number | null>(null);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("userInfo");
      if (raw) {
        setTimeout(() => {
          try {
            const parsed = JSON.parse(raw);
            setUid(parsed.user_id ?? null);
          } catch (e) {
            console.error("Parse userInfo error:", e);
          }
        }, 0);
      }
    } catch {
      setTimeout(() => setUid(null), 0);
    }
  }, []);

  const { data, loading, error, refresh } = useRequest(
    () => request.get(`/api/pet/detail?pet_id=${petId}`),
    { ready: !!petId, refreshDeps: [petId] }
  );

  const petDetail = data?.data as PetDetail | undefined;

  const canEdit = useMemo(() => {
    if (!petDetail || uid === null) return false;
    return petDetail.user_id === uid;
  }, [petDetail, uid]);

  const label = (opts: { value: number; label: string }[], v: number) =>
    opts.find((o) => o.value === v)?.label ?? "未知";

  const getStatusInfo = (s: number) => {
    const m: Record<number, { color: string; text: string }> = {
      [PetStatusEnum.ForAdoption]: { color: "blue", text: "待领养" },
      [PetStatusEnum.Adopted]: { color: "green", text: "已领养" },
      [PetStatusEnum.Offline]: { color: "orange", text: "已下架" },
    };
    return m[s] ?? { color: "default", text: "未知" };
  };

  const images = useMemo(() => {
    if (!petDetail?.image_urls) return [];
    return petDetail.image_urls.split(",").filter(Boolean);
  }, [petDetail]);

  const handleAdopt = () => {
    if (!petDetail) return;
    Modal.confirm({
      title: "确认领养申请",
      content: `您确定要申请领养 ${petDetail.name} 吗？`,
      okText: "确认申请",
      cancelText: "再想想",
      okButtonProps: { shape: "round" },
      cancelButtonProps: { shape: "round" },
      onOk: async () => {
        try {
          const res = await fetch("/api/adoption/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pet_id: petDetail.pet_id }),
          });
          const json = await res.json();
          if (json.businessCode === 0) {
            message.success("申请成功，请等待管理员审核");
            refresh();
          } else if (json.httpCode === 401) {
            message.warning("请先登录后再申请领养");
            router.push("/login");
          } else {
            message.error(json.message || "申请失败");
          }
        } catch (error) {
          message.error("网络请求失败");
        }
      },
    });
  };

  const handleFavorite = async () => {
    if (!petDetail) return;
    try {
      const res = await fetch("/api/favorite/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pet_id: petDetail.pet_id }),
      });
      const json = await res.json();
      if (json.businessCode === 0) {
        message.success(json.message);
        refresh();
      } else if (json.httpCode === 401) {
        message.warning("请先登录后再收藏");
        router.push("/login");
      } else {
        message.error(json.message || "操作失败");
      }
    } catch (error) {
      message.error("网络请求失败");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "100px 0", textAlign: "center" }}>
        <Spin size="large" description="正在加载宠物详情..." />
      </div>
    );
  }

  if (error || !petDetail) {
    return (
      <div style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <Card
          style={{ borderRadius: 20, textAlign: "center", padding: "40px 0" }}
        >
          <Text
            type="danger"
            style={{ fontSize: 18, display: "block", marginBottom: 24 }}
          >
            {error?.message || "未找到宠物详情"}
          </Text>
          <Button
            type="primary"
            shape="round"
            size="large"
            onClick={() => router.push("/")}
          >
            返回首页
          </Button>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo(petDetail.status);

  return (
    <div
      style={{
        background: "#F8FAFC",
        minHeight: "100vh",
        padding: "20px 24px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Navigation */}
        <div
          style={{
            marginBottom: 32,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Breadcrumb
            items={[
              {
                title: (
                  <Link href="/" style={{ color: "#64748B" }}>
                    <HomeOutlined /> 首页
                  </Link>
                ),
              },
              { title: <span style={{ color: "#64748B" }}>宠物详情</span> },
              {
                title: (
                  <span style={{ color: "#0F172A", fontWeight: 500 }}>
                    {petDetail.name}
                  </span>
                ),
              },
            ]}
          />
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/")}
            style={{ borderRadius: 6, color: "#64748B" }}
          >
            返回首页
          </Button>
        </div>

        <Row gutter={[40, 40]}>
          {/* Left Column: Images */}
          <Col xs={24} lg={12}>
            <div style={{ position: "sticky", top: 100 }}>
              <div
                className="custom-carousel-container"
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "40px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  position: "relative",
                  overflow: "hidden",
                  border: "1px solid #F1F5F9",
                }}
              >
                {images.length > 0 ? (
                  <>
                    <Carousel
                      arrows
                      adaptiveHeight
                      afterChange={(index) => setCurrentImgIndex(index)}
                      prevArrow={<CustomPrevArrow />}
                      nextArrow={<CustomNextArrow />}
                    >
                      {images.map((url, i) => (
                        <div key={i}>
                          <div
                            style={{
                              height: 480,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "#F8FAFC",
                              borderRadius: 8,
                              overflow: "hidden",
                            }}
                          >
                            <Image
                              src={url}
                              alt={`pet-${i}`}
                              style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain",
                              }}
                              preview={{
                                mask: (
                                  <div style={{ fontSize: 14 }}>
                                    <InfoCircleOutlined /> 查看原图
                                  </div>
                                ),
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </Carousel>
                    {/* Counter */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 60,
                        right: 60,
                        background: "rgba(15, 23, 42, 0.6)",
                        color: "#fff",
                        padding: "4px 12px",
                        borderRadius: 20,
                        fontSize: 11,
                        zIndex: 10,
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      {currentImgIndex + 1} / {images.length}
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      height: 480,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#F8FAFC",
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: "#94A3B8" }}>暂无宠物图片</Text>
                  </div>
                )}
              </div>
            </div>
          </Col>

          {/* Right Column: Info */}
          <Col xs={24} lg={12}>
            <Card
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                height: "100%",
              }}
              bodyStyle={{ padding: "40px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 24,
                }}
              >
                <div>
                  <Tag
                    color={
                      statusInfo.color === "blue"
                        ? "#E6F4F1"
                        : statusInfo.color === "green"
                        ? "#E6F7F0"
                        : "#FFF7ED"
                    }
                    style={{
                      borderRadius: 4,
                      padding: "2px 10px",
                      marginBottom: 16,
                      color:
                        statusInfo.color === "blue"
                          ? "#2A9D8F"
                          : statusInfo.color === "green"
                          ? "#10B981"
                          : "#F4A261",
                      border: "none",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {statusInfo.text}
                  </Tag>
                  <Title
                    level={1}
                    style={{
                      margin: 0,
                      fontSize: 32,
                      fontWeight: 700,
                      color: "#0F172A",
                    }}
                  >
                    {petDetail.name}
                  </Title>
                </div>
                <Button
                  type="text"
                  shape="circle"
                  icon={
                    petDetail.is_favorited ? (
                      <HeartFilled style={{ color: "#EF4444", fontSize: 24 }} />
                    ) : (
                      <HeartOutlined
                        style={{ fontSize: 24, color: "#CBD5E1" }}
                      />
                    )
                  }
                  onClick={handleFavorite}
                />
              </div>

              <Space size={[8, 12]} wrap style={{ marginBottom: 32 }}>
                <Tag
                  bordered={false}
                  style={{
                    fontSize: 13,
                    padding: "4px 12px",
                    borderRadius: 6,
                    background: "#F1F5F9",
                    color: "#475569",
                  }}
                >
                  {
                    PetSpeciesMap[
                      petDetail.species as unknown as PetSpeciesEnum
                    ]?.label
                  }
                </Tag>
                {petDetail.breed && (
                  <Tag
                    bordered={false}
                    style={{
                      fontSize: 13,
                      padding: "4px 12px",
                      borderRadius: 6,
                      background: "#F1F5F9",
                      color: "#475569",
                    }}
                  >
                    {petDetail.breed}
                  </Tag>
                )}
                <Tag
                  bordered={false}
                  style={{
                    fontSize: 13,
                    padding: "4px 12px",
                    borderRadius: 6,
                    background: "#F1F5F9",
                    color: "#475569",
                  }}
                >
                  {label(PetGenderOptions, petDetail.gender)}
                </Tag>
                <Tag
                  bordered={false}
                  style={{
                    fontSize: 13,
                    padding: "4px 12px",
                    borderRadius: 6,
                    background: "#F1F5F9",
                    color: "#475569",
                  }}
                >
                  {petDetail.age ? `${petDetail.age}个月` : "年龄不详"}
                </Tag>
              </Space>

              <Divider
                style={{ margin: "0 0 32px 0", borderColor: "#F1F5F9" }}
              />

              <Title
                level={4}
                style={{ marginBottom: 16, fontSize: 18, color: "#0F172A" }}
              >
                <InfoCircleOutlined
                  style={{ marginRight: 8, color: "#2A9D8F" }}
                />{" "}
                宠物故事
              </Title>
              <Paragraph
                style={{
                  fontSize: 15,
                  lineHeight: 1.8,
                  color: "#334155",
                  marginBottom: 32,
                }}
              >
                {petDetail.description ||
                  "这只可爱的小伙伴暂时还没有详细的故事，但它正期待着与你开启新的篇章。"}
              </Paragraph>

              <Title
                level={4}
                style={{ marginBottom: 20, fontSize: 18, color: "#0F172A" }}
              >
                <MedicineBoxOutlined
                  style={{ marginRight: 8, color: "#2A9D8F" }}
                />{" "}
                健康状况
              </Title>
              <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                <Col span={12}>
                  <div
                    style={{
                      background: "#F8FAFC",
                      padding: "16px",
                      borderRadius: 8,
                      border: "1px solid #F1F5F9",
                    }}
                  >
                    <Text
                      style={{
                        display: "block",
                        marginBottom: 4,
                        color: "#64748B",
                        fontSize: 12,
                      }}
                    >
                      疫苗状态
                    </Text>
                    <Text style={{ color: "#334155", fontWeight: 500 }}>
                      {label(PetVaccineStatusOptions, petDetail.vaccine_status)}
                    </Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      background: "#F8FAFC",
                      padding: "16px",
                      borderRadius: 8,
                      border: "1px solid #F1F5F9",
                    }}
                  >
                    <Text
                      style={{
                        display: "block",
                        marginBottom: 4,
                        color: "#64748B",
                        fontSize: 12,
                      }}
                    >
                      绝育状态
                    </Text>
                    <Text style={{ color: "#334155", fontWeight: 500 }}>
                      {label(PetNeuteredOptions, petDetail.neutered)}
                    </Text>
                  </div>
                </Col>
                <Col span={24}>
                  <div
                    style={{
                      background: "#F8FAFC",
                      padding: "16px",
                      borderRadius: 8,
                      border: "1px solid #F1F5F9",
                    }}
                  >
                    <Text
                      style={{
                        display: "block",
                        marginBottom: 4,
                        color: "#64748B",
                        fontSize: 12,
                      }}
                    >
                      健康描述
                    </Text>
                    <Text style={{ color: "#334155", fontWeight: 500 }}>
                      {petDetail.health_status || "健康状况良好"}
                    </Text>
                  </div>
                </Col>
              </Row>

              <div
                style={{
                  background: "#FDFCFB",
                  padding: 20,
                  borderRadius: 12,
                  marginBottom: 40,
                  border: "1px solid #F4EBE4",
                }}
              >
                <Space align="start">
                  <UserOutlined style={{ color: "#F4A261", marginTop: 4 }} />
                  <div>
                    <Text
                      style={{
                        color: "#9A3412",
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      发布者寄语
                    </Text>
                    <Paragraph
                      style={{
                        margin: "4px 0 0 0",
                        color: "#7C2D12",
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    >
                      希望领养人能够给它一个稳定、温暖的家，不离不弃。
                    </Paragraph>
                  </div>
                </Space>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                {petDetail.status === PetStatusEnum.ForAdoption ? (
                  petDetail.user_id === uid ? (
                    <Button
                      size="large"
                      block
                      disabled
                      style={{ height: 52, borderRadius: 8, fontSize: 15 }}
                    >
                      这是您发布的宠物
                    </Button>
                  ) : petDetail.is_applied ? (
                    <Button
                      type="primary"
                      size="large"
                      block
                      disabled
                      style={{
                        height: 52,
                        borderRadius: 8,
                        background: "#10B981",
                        borderColor: "#10B981",
                        color: "#fff",
                        fontSize: 15,
                      }}
                    >
                      已提交申请
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      size="large"
                      block
                      onClick={handleAdopt}
                      style={{
                        height: 52,
                        borderRadius: 8,
                        background: "#2A9D8F",
                        fontSize: 16,
                        fontWeight: 500,
                      }}
                    >
                      立即申请领养
                    </Button>
                  )
                ) : (
                  <Button
                    size="large"
                    block
                    disabled
                    style={{ height: 52, borderRadius: 8, fontSize: 15 }}
                  >
                    该宠物目前不在待领养状态
                  </Button>
                )}

                {canEdit && (
                  <Button
                    size="large"
                    onClick={() => router.push(`/pet/edit/?pet_id=${petId}`)}
                    style={{ height: 52, padding: "0 32px", borderRadius: 8 }}
                  >
                    编辑
                  </Button>
                )}
              </div>

              <div style={{ marginTop: 24, textAlign: "center" }}>
                <Space style={{ fontSize: 12, color: "#94A3B8" }}>
                  <CalendarOutlined /> 发布于{" "}
                  {dayjs(petDetail.create_time).format("YYYY-MM-DD")}
                </Space>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <style jsx global>{`
        .custom-carousel-container .slick-dots {
          bottom: 20px !important;
        }
        .custom-carousel-container .slick-dots li button {
          background: #cbd5e1 !important;
          height: 4px !important;
          border-radius: 2px !important;
          transition: all 0.3s !important;
        }
        .custom-carousel-container .slick-dots li.slick-active button {
          background: #2a9d8f !important;
          width: 20px !important;
        }
        .custom-arrow {
          width: 40px;
          height: 40px;
          background: #fff;
          border-radius: 50%;
          display: flex !important;
          align-items: center;
          justify-content: center;
          z-index: 2;
          color: #334155;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.2s;
          cursor: pointer;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
        }
        .custom-arrow:hover {
          background: #2a9d8f;
          color: #fff;
          transform: translateY(-50%) scale(1.05);
          box-shadow: 0 6px 16px rgba(42, 157, 143, 0.2);
        }
        .custom-arrow.prev {
          left: -20px;
        }
        .custom-arrow.next {
          right: -20px;
        }
        .slick-prev:before,
        .slick-next:before {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
