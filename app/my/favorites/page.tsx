"use client";

import { useState } from "react";
import { useInfiniteScroll } from "ahooks";
import {
  Col,
  Row,
  Button,
  Typography,
  Empty,
  message,
  Spin,
} from "antd";
import { HeartFilled, ArrowRightOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  getLocalDefaultPetCoverBySpecies,
  getPetCoverImage,
} from "@/lib/petImage";
import { PetSpeciesMap } from "@/constant";
import { PetSpeciesEnum } from "@/types";
import { PET_CARD_PAGE_SIZE } from "@/lib/petListing";
import { usePetCardInfiniteLoadMore } from "@/lib/usePetCardInfiniteLoadMore";

const { Title, Text } = Typography;

interface Pet {
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
  favorite_time: string;
}

type FavChunk = {
  list: Pet[];
  total: number;
  pageNum: number;
  pageSize: number;
};

export default function MyFavoritesPage() {
  const [failedImageByPetId, setFailedImageByPetId] = useState<
    Record<number, string>
  >({});
  const router = useRouter();

  const { data, loading, loadingMore, noMore, mutate, loadMore } =
    useInfiniteScroll<FavChunk>(
    async (last) => {
      const nextPage = last?.pageNum != null ? last.pageNum + 1 : 1;
      const res = await fetch("/api/my/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: nextPage,
          pageSize: PET_CARD_PAGE_SIZE,
        }),
        credentials: "same-origin",
      });
      const json = await res.json();
      if (json.httpCode === 401) {
        message.warning("请先登录");
        router.push("/login");
        return {
          list: [] as Pet[],
          total: 0,
          pageNum: nextPage,
          pageSize: PET_CARD_PAGE_SIZE,
        };
      }
      if (json.businessCode !== 0) {
        message.error(
          typeof json.message === "string" ? json.message : "获取收藏列表失败"
        );
        return {
          list: [] as Pet[],
          total: 0,
          pageNum: nextPage,
          pageSize: PET_CARD_PAGE_SIZE,
        };
      }
      return {
        list: (json.data.list as Pet[]) ?? [],
        total: Number(json.data.total) ?? 0,
        pageNum: nextPage,
        pageSize: PET_CARD_PAGE_SIZE,
      };
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

  const toggleFavorite = async (e: React.MouseEvent, petId: number) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/pet/${petId}/favorite`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.businessCode === 0) {
        message.success("已取消收藏");
        mutate((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            list: prev.list.filter((p) => p.pet_id !== petId),
            total: Math.max(0, (prev.total ?? 0) - 1),
          };
        });
      }
    } catch {
      message.error("操作失败");
    }
  };

  return (
    <div style={{ margin: "0 auto", paddingBottom: 0 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <Title style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
              我的收藏
            </Title>
            <Text style={{ color: "var(--text-secondary)", fontSize: 16 }}>
              您一共关注了{" "}
              <Text strong style={{ color: "var(--primary)" }}>
                {total}
              </Text>{" "}
              只可爱的小伙伴
              <Text type="secondary" style={{ fontSize: 13, marginLeft: 8 }}>
                · 每次加载 {PET_CARD_PAGE_SIZE} 条
              </Text>
            </Text>
          </div>
          <Button
            type="primary"
            className="btn-primary"
            onClick={() => router.push("/")}
            icon={<ArrowRightOutlined />}
          >
            去发现更多
          </Button>
        </div>

        <Spin spinning={loading && pets.length === 0} tip="正在加载收藏列表...">
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
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: (index % 4) * 0.05 }}
                        className="modern-card"
                        style={{ overflow: "hidden" }}
                      >
                        <div
                          style={{ cursor: "pointer" }}
                          onClick={() =>
                            router.push(`/pet/detail?pet_id=${pet.pet_id}`)
                          }
                        >
                          <div className="pet-list-card__cover">
                            <img
                              alt={pet.name}
                              src={imageUrl}
                              className="pet-card-img"
                              style={{ width: "100%" }}
                              referrerPolicy="no-referrer"
                              onError={() => {
                                setFailedImageByPetId((prev) => {
                                  if (prev[pet.pet_id]) return prev;
                                  return {
                                    ...prev,
                                    [pet.pet_id]:
                                      getLocalDefaultPetCoverBySpecies(
                                        pet.species
                                      ),
                                  };
                                });
                              }}
                            />
                            <div className="pet-card__float-action">
                              <Button
                                shape="circle"
                                size="large"
                                icon={
                                  <HeartFilled
                                    style={{
                                      color: "var(--secondary)",
                                      fontSize: 20,
                                    }}
                                  />
                                }
                                onClick={(e) => toggleFavorite(e, pet.pet_id)}
                              />
                            </div>
                          </div>
                          <div className="pet-list-card__content">
                            <div className="pet-list-card__title-row">
                              <Title
                                style={{
                                  margin: 0,
                                  fontSize: 20,
                                  fontWeight: 700,
                                }}
                              >
                                {pet.name}
                              </Title>
                              <span className="pet-list-card__species-tag">
                                {pet.breed ||
                                  PetSpeciesMap[pet.species as PetSpeciesEnum]
                                    ?.label ||
                                  "其他"}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  color: "var(--text-muted)",
                                  fontSize: 13,
                                  fontWeight: 500,
                                }}
                              >
                                {pet.age} 个月 ·{" "}
                                {pet.gender === 1 ? "公" : "母"}
                              </Text>
                              <Button
                                type="link"
                                style={{ padding: 0, fontWeight: 600 }}
                              >
                                查看详情
                              </Button>
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
                {!loading && !loadingMore && noMore && pets.length > 0 && "已加载全部"}
              </div>
            </>
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
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Text type="secondary">
                      暂无收藏，快去寻找你的缘分吧
                    </Text>
                  }
                >
                  <Button
                    type="primary"
                    className="btn-primary"
                    size="large"
                    onClick={() => router.push("/")}
                  >
                    开启探索之旅
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
