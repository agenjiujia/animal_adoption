"use client";

import { useEffect, useState } from "react";
import {
  Col,
  Row,
  Button,
  Typography,
  Empty,
  message,
  Spin,
} from "antd";
import {
  HeartFilled,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  getLocalDefaultPetCoverBySpecies,
  getPetCoverImage,
} from "@/lib/petImage";

const { Title, Text } = Typography;

interface Pet {
  pet_id: number;
  user_id: number;
  name: string;
  species: string;
  breed: string;
  age: number;
  gender: number;
  image_urls?: string | string[];
  description: string;
  status: number;
  favorite_time: string;
}

export default function MyFavoritesPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedImageByPetId, setFailedImageByPetId] = useState<
    Record<number, string>
  >({});
  const router = useRouter();

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/my/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 1, pageSize: 100 }), // 获取全部收藏
      });
      const json = await res.json();
      if (json.businessCode === 0) {
        setFailedImageByPetId({});
        setPets(json.data.list);
      } else if (json.httpCode === 401) {
        message.warning("请先登录");
        router.push("/login");
      }
    } catch {
      message.error("获取收藏列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const toggleFavorite = async (e: React.MouseEvent, petId: number) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/pet/${petId}/favorite`, { method: "POST" });
      const json = await res.json();
      if (json.businessCode === 0) {
        message.success("已取消收藏");
        setPets((prev) => prev.filter((p) => p.pet_id !== petId));
      }
    } catch {
      message.error("操作失败");
    }
  };

  return (
    <div style={{ margin: "0 auto", paddingBottom:0 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <Title style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>我的收藏</Title>
            <Text style={{ color: "var(--text-secondary)", fontSize: 16 }}>
              您一共关注了 <Text strong color="var(--primary)">{pets.length}</Text> 只可爱的小伙伴
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

        <Spin spinning={loading} tip="正在加载收藏列表...">
          {pets.length > 0 ? (
            <Row gutter={[24, 24]}>
              {pets.map((pet, index) => {
                const imageUrl =
                  failedImageByPetId[pet.pet_id] ??
                  getPetCoverImage(pet.image_urls, pet.species);
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={pet.pet_id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="modern-card"
                      style={{ overflow: "hidden" }}
                    >
                      <div
                        style={{ cursor: "pointer" }}
                        onClick={() => router.push(`/pet/detail?pet_id=${pet.pet_id}`)}
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
                                    getLocalDefaultPetCoverBySpecies(pet.species),
                                };
                              });
                            }}
                          />
                          <div className="pet-card__float-action">
                            <Button
                              shape="circle"
                              size="large"
                              icon={<HeartFilled style={{ color: "var(--secondary)", fontSize: 20 }} />}
                              onClick={(e) => toggleFavorite(e, pet.pet_id)}
                            />
                          </div>
                        </div>
                        <div className="pet-list-card__content">
                          <div className="pet-list-card__title-row">
                            <Title style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                              {pet.name}
                            </Title>
                            <span className="pet-list-card__species-tag">
                              {pet.breed || pet.species}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 500 }}>
                              {pet.age} 个月 · {pet.gender === 1 ? "公" : "母"}
                            </Text>
                            <Button type="link" style={{ padding: 0, fontWeight: 600 }}>
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
          ) : (
            !loading && (
              <div style={{ padding: "100px 0", textAlign: "center", background: "white", borderRadius: 32 }}>
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description={<Text type="secondary">暂无收藏，快去寻找你的缘分吧</Text>} 
                >
                  <Button type="primary" className="btn-primary" size="large" onClick={() => router.push("/")}>
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
