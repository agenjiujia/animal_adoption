"use client";

import { useEffect, useMemo, useState } from "react";
import { useRequest } from "ahooks";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Typography,
  Button,
  Image,
  Tag,
  Carousel,
  Row,
  Col,
  Space,
  Spin,
  Modal,
  message,
  Avatar,
  Divider,
} from "antd";
import {
  LeftOutlined,
  RightOutlined,
  HeartOutlined,
  HeartFilled,
  UserOutlined,
  ArrowLeftOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { request } from "@/utils/request";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import {
  getDefaultPetCoverBySpecies,
  getLocalDefaultPetCoverBySpecies,
  getPetImageList,
} from "@/lib/petImage";
import { PetSpeciesMap } from "@/app/_constant";
import { PetSpeciesEnum } from "@/app/_types";

const { Title, Text, Paragraph } = Typography;

interface PetDetail {
  pet_id: number;
  user_id: number;
  name: string;
  species: number;
  breed: string;
  age: number;
  gender: number;
  image_urls?: string | string[];
  description: string;
  status: number;
  vaccine_status: number;
  neutered: number;
  is_applied: number;
  is_favorited: number;
  owner_name: string;
  owner_avatar: string;
}

export default function PetDetailPage() {
  const router = useRouter();
  const qs = useSearchParams();
  const petId = qs.get("pet_id");
  const [uid, setUid] = useState<number | null>(null);
  const [petDetail, setPetDetail] = useState<PetDetail | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("userInfo");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setUid(parsed.user_id ?? null);
      } catch {
        setUid(null);
      }
    }
  }, []);

  const { data, loading, error, refresh } = useRequest(
    () => request.get(`/api/pet/detail?pet_id=${petId}`),
    { ready: !!petId, refreshDeps: [petId] }
  );
  useEffect(() => {
    const next = data?.data as PetDetail | undefined;
    if (next) setPetDetail(next);
  }, [data]);

  const images = useMemo(() => {
    if (!petDetail) return [];
    const list = getPetImageList(petDetail.image_urls);
    if (list.length > 0) return list;
    // 无图时直接给一个默认封面，避免轮播区空白
    return [getDefaultPetCoverBySpecies(petDetail.species)];
  }, [petDetail]);

  const handleAdopt = () => {
    if (!petDetail) return;
    Modal.confirm({
      title: "确认申请领养",
      content: `您确定要申请领养 "${petDetail.name}" 吗？我们将立即通知原主人。`,
      okText: "确认申请",
      cancelText: "再想想",
      centered: true,
      onOk: async () => {
        try {
          const res = await fetch(`/api/pet/${petDetail.pet_id}/apply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: "我想给这个小家伙一个温暖的家。",
            }),
          });
          const json = await res.json();
          if (json.businessCode === 0) {
            message.success("申请已提交，请耐心等待主人联系");
            refresh();
          } else if (json.httpCode === 401) {
            router.push("/login");
          } else {
            message.error(json.message);
          }
        } catch {
          message.error("网络异常，请稍后重试");
        }
      },
    });
  };

  const handleFavorite = async () => {
    if (!petDetail) return;
    try {
      const res = await fetch(`/api/pet/${petDetail.pet_id}/favorite`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.businessCode === 0) {
        setPetDetail((prev) =>
          prev ? { ...prev, is_favorited: prev.is_favorited ? 0 : 1 } : prev
        );
      } else if (json.httpCode === 401) {
        router.push("/login");
      }
    } catch {
      message.error("网络异常");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "200px 0", textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !petDetail) {
    return (
      <div style={{ padding: "120px 0", textAlign: "center" }}>
        <Title style={{ fontWeight: 700 }}>抱歉，未找到该宠物信息</Title>
        <Button type="primary" onClick={() => router.push("/")}>
          返回首页
        </Button>
      </div>
    );
  }

  const isOwner = petDetail.user_id === uid;

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", paddingBottom: 32 }}>
      <Row gutter={[24, 24]}>
        {/* 左侧：宠物美照 */}
        <Col xs={24} lg={12}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Carousel
              infinite={false}
              prevArrow={<CustomPrevArrow />}
              nextArrow={<CustomNextArrow />}
              arrows
              style={{
                borderRadius: 20,
                overflow: "hidden",
                border: "1px solid #e6edf8",
                boxShadow: "0 14px 28px -20px rgba(0,0,0,0.18)",
              }}
            >
              {images.map((url: string, index: number) => (
                <div key={index}>
                  <img
                    src={url}
                    alt={petDetail.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.currentTarget;
                      const localFallback = getLocalDefaultPetCoverBySpecies(
                        petDetail.species
                      );
                      if (img.src.includes(localFallback)) return;
                      img.src = localFallback;
                    }}
                    style={{ width: "100%", height: 560, objectFit: "cover" }}
                  />
                </div>
              ))}
            </Carousel>
          </motion.div>
        </Col>

        {/* 右侧：详细信息 */}
        <Col xs={24} lg={12}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--primary)",
                  marginBottom: 12,
                }}
              >
                档案编号：#{petDetail.pet_id.toString().padStart(4, "0")}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 32,
                }}
              >
                <Title style={{ margin: 0, fontSize: 40, fontWeight: 800 }}>
                  {petDetail.name}
                </Title>
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    type="text"
                    shape="circle"
                    size="large"
                    icon={
                      petDetail.is_favorited ? (
                        <HeartFilled
                          style={{ color: "var(--secondary)", fontSize: 24 }}
                        />
                      ) : (
                        <HeartOutlined style={{ fontSize: 24 }} />
                      )
                    }
                    onClick={handleFavorite}
                    style={{
                      background: "rgba(244, 63, 94, 0.05)",
                      width: 56,
                      height: 56,
                    }}
                  />
                </motion.div>
              </div>

              <Space size={12} wrap style={{ marginBottom: 20 }}>
                <div
                  className="modern-card pet-surface-card"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    boxShadow: "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    物种
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {PetSpeciesMap[petDetail.species as PetSpeciesEnum]?.label}
                  </div>
                </div>
                <div
                  className="modern-card pet-surface-card"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    boxShadow: "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    品种
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {petDetail.breed || '- -'}
                  </div>
                </div>
                <div
                  className="modern-card pet-surface-card"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    boxShadow: "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    年龄
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {petDetail.age} 个月
                  </div>
                </div>
                <div
                  className="modern-card pet-surface-card"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    boxShadow: "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    性别
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {petDetail.gender === 1 ? "公" : "母"}
                  </div>
                </div>
              </Space>

              <Title level={4} style={{ marginBottom: 16, fontWeight: 700 }}>
                关于它
              </Title>
              <Paragraph
                style={{
                  fontSize: 15,
                  color: "var(--text-secondary)",
                  lineHeight: 1.75,
                  marginBottom: 20,
                }}
              >
                {petDetail.description || "主人很懒，还没有给它写介绍哦~"}
              </Paragraph>

              <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                <Col span={12}>
                  <div
                    className="modern-card"
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: "var(--bg-main)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginBottom: 8,
                      }}
                    >
                      疫苗情况
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {petDetail.vaccine_status === 1
                        ? "已接种"
                        : "待接种"}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    className="modern-card"
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: "var(--bg-main)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginBottom: 8,
                      }}
                    >
                      绝育情况
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {petDetail.neutered === 1 ? "已绝育" : "未绝育"}
                    </div>
                  </div>
                </Col>
              </Row>

              <div className="pet-owner-box">
                <Avatar
                  size={56}
                  src={petDetail.owner_avatar}
                  icon={<UserOutlined />}
                  style={{ border: "2px solid white" }}
                />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {petDetail.owner_name}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    原主人/发布者
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <Button
                  className="btn-primary"
                  type="primary"
                  size="large"
                  block
                  style={{
                    height: 52,
                    fontSize: 16,
                  }}
                  onClick={handleAdopt}
                  disabled={
                    petDetail.is_applied === 1 ||
                    petDetail.status !== 0 ||
                    isOwner
                  }
                >
                  {isOwner
                    ? "这是您发布的宠物"
                    : petDetail.is_applied === 1
                    ? "领养申请审核中"
                    : petDetail.status === 1
                    ? "已被领养"
                    : "申请领养"}
                </Button>
                <Button
                  size="large"
                  icon={<ShareAltOutlined />}
                  style={{
                    height: 52,
                    width: 52,
                    borderRadius: 12,
                  }}
                />
              </div>
            </div>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
}

const CustomPrevArrow = ({ onClick }: { onClick?: () => void }) => (
  <div
    onClick={onClick}
    style={{
      position: "absolute",
      left: 24,
      top: "50%",
      zIndex: 10,
      cursor: "pointer",
      width: 48,
      height: 48,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(255,255,255,0.2)",
      backdropFilter: "blur(12px)",
      color: "#fff",
      borderRadius: "50%",
      transform: "translateY(-50%)",
    }}
  >
    <LeftOutlined style={{ fontSize: 20 }} />
  </div>
);

const CustomNextArrow = ({ onClick }: { onClick?: () => void }) => (
  <div
    onClick={onClick}
    style={{
      position: "absolute",
      right: 24,
      top: "50%",
      zIndex: 10,
      cursor: "pointer",
      width: 48,
      height: 48,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(255,255,255,0.2)",
      backdropFilter: "blur(12px)",
      color: "#fff",
      borderRadius: "50%",
      transform: "translateY(-50%)",
    }}
  >
    <RightOutlined style={{ fontSize: 20 }} />
  </div>
);
