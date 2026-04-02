"use client";

import { useEffect, useState, useCallback } from "react";
import { useInfiniteScroll } from "ahooks";
import {
  Col,
  Row,
  Button,
  Typography,
  Empty,
  message,
  Spin,
  notification,
} from "antd";
import { BellOutlined, HeartOutlined, HeartFilled } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  getDefaultPetCoverBySpecies,
  getLocalDefaultPetCoverBySpecies,
  getPetCoverImage,
} from "@/lib/petImage";
import { PetSpeciesMap } from "@/constant";
import { PetSpeciesEnum } from "@/types";
import { PET_CARD_PAGE_SIZE } from "@/lib/petListing";
import { usePetCardInfiniteLoadMore } from "@/lib/usePetCardInfiniteLoadMore";

const { Title, Text, Paragraph } = Typography;

interface Pet {
  pet_id: number;
  user_id: number;
  name: string;
  species: number;
  breed: string;
  age: number;
  gender: number;
  weight?: number | string | null;
  vaccine_status?: number | null;
  neutered?: number | null;
  health_status?: string | null;
  image_urls: string | string[];
  description: string;
  status: number;
  create_time?: string;
  is_applied?: number;
  is_favorited?: number;
}

type PublicListChunk = {
  list: Pet[];
  total: number;
  pageNum: number;
  pageSize: number;
};

export default function HomePage() {
  const [failedImageByPetId, setFailedImageByPetId] = useState<
    Record<number, string>
  >({});
  const router = useRouter();

  const pushNotifications = useCallback(
    (
      raw: {
        type: string;
        apply_id: number;
        pet_name: string;
        status: number;
      }[]
    ) => {
      raw.forEach((notif) => {
        const applyId = Number(notif.apply_id);
        if (!applyId) return;

        let marked = false;
        const markNotifRead = () => {
          if (marked) return;
          marked = true;
          const url =
            notif.type === "USER"
              ? "/api/adoption/mark-read"
              : notif.type === "OWNER"
                ? "/api/adoption/owner/mark-read"
                : "/api/admin/adoption/mark-read";
          void fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ app_ids: [applyId] }),
          });
        };

        notification.info({
          key: `notif-${notif.type}-${applyId}-${notif.status}`,
          message: "系统通知",
          description:
            notif.type === "USER"
              ? `您对 "${notif.pet_name}" 的领养申请已${
                  notif.status === 1 ? "通过" : "被拒绝"
                }。`
              : `收到关于 "${notif.pet_name}" 的新领养申请，请及时查看。`,
          icon: <BellOutlined style={{ color: "var(--primary)" }} />,
          style: {
            borderRadius: 16,
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
          },
          onClick: () => {
            markNotifRead();
            router.push(
              notif.type === "USER"
                ? "/my/adoptions"
                : notif.type === "OWNER"
                  ? "/my/adoption-approvals"
                  : "/admin/adoptions"
            );
          },
          onClose: () => {
            markNotifRead();
          },
        });
      });
    },
    [router]
  );

  const { data, loading, loadingMore, noMore, mutate, loadMore } =
    useInfiniteScroll<PublicListChunk>(
    async (last) => {
      const nextPage = last?.pageNum != null ? last.pageNum + 1 : 1;
      try {
        const res = await fetch("/api/pet/public/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageNum: nextPage,
            pageSize: PET_CARD_PAGE_SIZE,
          }),
          credentials: "same-origin",
        });
        const json = await res.json();
        if (json.businessCode !== 0) {
          message.error(
            typeof json.message === "string"
              ? json.message
              : "获取宠物列表失败"
          );
          return {
            list: [] as Pet[],
            total: 0,
            pageNum: nextPage,
            pageSize: PET_CARD_PAGE_SIZE,
          };
        }
        const { list, total: totalCount } = json.data;
        if (
          nextPage === 1 &&
          json.data.notifications &&
          json.data.notifications.length > 0
        ) {
          pushNotifications(
            json.data.notifications as {
              type: string;
              apply_id: number;
              pet_name: string;
              status: number;
            }[]
          );
        }
        return {
          list: list ?? [],
          total: totalCount ?? 0,
          pageNum: nextPage,
          pageSize: PET_CARD_PAGE_SIZE,
        };
      } catch {
        message.error("连接服务器失败，请稍后重试");
        return {
          list: [] as Pet[],
          total: 0,
          pageNum: nextPage,
          pageSize: PET_CARD_PAGE_SIZE,
        };
      }
    },
    {
      isNoMore: (d) => {
        if (!d?.list) return true;
        return d.list.length >= (d.total ?? 0);
      },
      onSuccess: (d) => {
        if (d.pageNum === 1) setFailedImageByPetId({});
      },
    }
  );

  const pets = data?.list ?? [];
  const total = data?.total ?? 0;

  const loadMoreSentinelRef = usePetCardInfiniteLoadMore(loadMore, {
    noMore,
    loading,
    loadingMore,
    listLength: pets.length,
  });

  const handleFavorite = async (e: React.MouseEvent, pet: Pet) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/pet/${pet.pet_id}/favorite`, {
        method: "POST",
        credentials: "same-origin",
      });
      const json = (await res.json()) as {
        businessCode?: number;
        httpCode?: number;
        message?: string;
        data?: { is_favorited?: boolean };
      };
      if (res.status === 401 || json.httpCode === 401) {
        message.warning("请先登录后再收藏");
        return;
      }
      if (json.businessCode === 0) {
        const next = json.data?.is_favorited ? 1 : 0;
        message.success(
          typeof json.message === "string" ? json.message : "操作成功"
        );
        mutate((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            list: prev.list.map((p) =>
              p.pet_id === pet.pet_id ? { ...p, is_favorited: next } : p
            ),
          };
        });
      } else {
        message.error(
          typeof json.message === "string" ? json.message : "操作失败"
        );
      }
    } catch {
      message.error("网络异常，请稍后重试");
    }
  };

  useEffect(() => {
    pets.forEach((pet) => {
      if (failedImageByPetId[pet.pet_id]) return;
      const candidate = getPetCoverImage(pet.image_urls, pet.species);
      const fallback = getDefaultPetCoverBySpecies(pet.species);
      if (!candidate || candidate === fallback) return;

      const probe = new Image();
      probe.onerror = () => {
        setFailedImageByPetId((prev) => {
          if (prev[pet.pet_id]) return prev;
          return { ...prev, [pet.pet_id]: fallback };
        });
      };
      probe.src = candidate;
    });
  }, [pets, failedImageByPetId]);

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <section
        style={{
          marginBottom: 16,
          paddingTop: 0,
          position: "relative",
          zIndex: 1,
        }}
      >
        <motion.div
          className="modern-card"
          style={{
            minHeight: 64,
            maxHeight: 80,
            border: "1px solid rgba(124, 110, 230, 0.16)",
            background:
              "linear-gradient(90deg, rgba(124, 110, 230, 0.1) 0%, rgba(243, 143, 178, 0.1) 100%)",
            boxShadow: "0 8px 20px rgba(124, 110, 230, 0.08)",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text
            onClick={() =>
              document
                .getElementById("collection")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            每一个生命都值得被温柔对待
          </Text>

          <Button
            className="btn-primary"
            type="primary"
            style={{ height: 40, padding: "0 18px", fontWeight: 700 }}
            onClick={() => router.push("/pet/new")}
          >
            发布领养
          </Button>
        </motion.div>
      </section>

      <section id="collection" style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            paddingTop: 2,
          }}
        >
          <Title style={{ margin: 0, fontSize: 26, fontWeight: 750 }}>
            待领养的小家伙们
          </Title>
          <Text style={{ color: "var(--text-muted)", fontSize: 13 }}>
            共有 {total} 位新朋友 · 每次加载 {PET_CARD_PAGE_SIZE} 条
          </Text>
        </div>

        <Spin spinning={loading && pets.length === 0}>
          {pets.length > 0 ? (
            <>
              <Row gutter={[24, 24]} justify="start">
                {pets.map((pet, index) => {
                  const imageUrl =
                    failedImageByPetId[pet.pet_id] ??
                    getPetCoverImage(pet.image_urls, pet.species);

                  return (
                    <Col xs={24} sm={12} md={12} lg={8} xl={6} key={pet.pet_id}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.5,
                          delay: (index % 4) * 0.1,
                        }}
                        className="modern-card pet-surface-card"
                        style={{
                          overflow: "hidden",
                          height: "100%",
                        }}
                      >
                        <div
                          style={{ cursor: "pointer" }}
                          onClick={() =>
                            router.push(`/pet/detail?pet_id=${pet.pet_id}`)
                          }
                        >
                          <div
                            className="pet-list-card__cover"
                            style={{ padding: 12 }}
                          >
                            <div
                              className="pet-card__float-action"
                              style={{ top: 14, right: 14 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <motion.div whileTap={{ scale: 0.92 }}>
                                <Button
                                  type="text"
                                  shape="circle"
                                  size="large"
                                  aria-label={
                                    pet.is_favorited === 1
                                      ? "取消收藏"
                                      : "收藏"
                                  }
                                  icon={
                                    pet.is_favorited === 1 ? (
                                      <HeartFilled
                                        style={{
                                          color: "var(--secondary)",
                                          fontSize: 20,
                                        }}
                                      />
                                    ) : (
                                      <HeartOutlined style={{ fontSize: 20 }} />
                                    )
                                  }
                                  onClick={(e) => handleFavorite(e, pet)}
                                />
                              </motion.div>
                            </div>
                            <motion.div
                              whileHover={{ opacity: 0.96 }}
                              transition={{ duration: 0.2 }}
                            >
                              <img
                                alt={pet.name}
                                src={imageUrl}
                                referrerPolicy="no-referrer"
                                onError={() => {
                                  const localFallback =
                                    getLocalDefaultPetCoverBySpecies(
                                      pet.species
                                    );
                                  setFailedImageByPetId((prev) => {
                                    if (prev[pet.pet_id] === localFallback)
                                      return prev;
                                    return {
                                      ...prev,
                                      [pet.pet_id]: localFallback,
                                    };
                                  });
                                }}
                                className="pet-card-img"
                                style={{
                                  width: "100%",
                                  aspectRatio: "4 / 3",
                                  borderRadius: 14,
                                }}
                              />
                            </motion.div>
                            {pet.is_applied === 1 && (
                              <div className="pet-list-card__badge">已申请</div>
                            )}
                          </div>
                          <div
                            className="pet-list-card__content"
                            style={{ padding: "0 12px 14px" }}
                          >
                            <div className="pet-list-card__title-row">
                              <Title
                                style={{
                                  margin: 0,
                                  fontSize: 18,
                                  fontWeight: 700,
                                }}
                              >
                                {pet.name}
                              </Title>
                              <span className="pet-list-card__species-tag pet-chip-accent">
                                {pet.breed ||
                                  PetSpeciesMap[pet.species as PetSpeciesEnum]
                                    ?.label ||
                                  "其他"}
                              </span>
                            </div>
                            <Paragraph
                              ellipsis={{ rows: 1 }}
                              className="pet-list-card__desc"
                              style={{ marginBottom: 10, height: "auto" }}
                            >
                              {pet.description}
                            </Paragraph>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 13,
                                  color: "var(--text-muted)",
                                  fontWeight: 500,
                                }}
                              >
                                {pet.age} 个月大 ·{" "}
                                {pet.gender === 1 ? "公" : "母"}
                              </Text>
                            </div>
                            <div
                              className="pet-list-card__meta-row"
                              style={{ marginTop: 8 }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-secondary)",
                                }}
                              >
                                {pet.weight ? `体重 ${pet.weight}kg` : "体重未知"}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-secondary)",
                                }}
                              >
                                ·
                              </Text>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-secondary)",
                                }}
                              >
                                疫苗
                                {pet.vaccine_status === 1
                                  ? "已接种"
                                  : pet.vaccine_status === 0
                                    ? "未接种"
                                    : "未知"}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-secondary)",
                                }}
                              >
                                ·
                              </Text>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-secondary)",
                                }}
                              >
                                {pet.neutered === 1
                                  ? "已绝育"
                                  : pet.neutered === 0
                                    ? "未绝育"
                                    : "绝育未知"}
                              </Text>
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-muted)",
                                }}
                                ellipsis
                              >
                                {pet.health_status
                                  ? `健康状况：${pet.health_status}`
                                  : "健康状况：待补充"}
                              </Text>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </Col>
                  );
                })}
              </Row>
              <div
                ref={loadMoreSentinelRef}
                aria-hidden
                style={{ height: 1, width: "100%" }}
              />
              <div
                style={{
                  marginTop: 20,
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                  minHeight: 22,
                }}
              >
                {loadingMore && "加载更多…"}
                {!loading && !loadingMore && noMore && pets.length > 0 && (
                  <Text style={{ letterSpacing: "0.15em", fontSize: 11 }}>
                    已加载全部
                  </Text>
                )}
              </div>
            </>
          ) : (
            !loading && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="THE GALLERY IS TEMPORARILY EMPTY"
                style={{ padding: "100px 0" }}
              />
            )
          )}
        </Spin>
      </section>
    </div>
  );
}
