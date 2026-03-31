"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
import { BellOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  getDefaultPetCoverBySpecies,
  getLocalDefaultPetCoverBySpecies,
  getPetCoverImage,
} from "@/lib/petImage";

const { Title, Text, Paragraph } = Typography;

interface Pet {
  pet_id: number;
  user_id: number;
  name: string;
  species: string;
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

export default function HomePage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [failedImageByPetId, setFailedImageByPetId] = useState<
    Record<number, string>
  >({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize] = useState(12);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();

  const loadingRef = useRef(false);
  // 防止首屏内容高度不足时，“最后一张卡片”在未滚动前就触发 IntersectionObserver，
  // 导致分页接口（pageNum=2）在用户刚打开页面时就被额外请求。
  const scrolledRef = useRef(false);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 120) scrolledRef.current = true;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 预检测卡片图片可用性：避免首屏在 React 绑定 onError 前就已失败，导致默认图不生效
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

  const observer = useRef<IntersectionObserver | null>(null);
  const lastPetElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loadingRef.current &&
          scrolledRef.current
        ) {
          setPageNum((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [hasMore]
  );

  const fetchPets = async (page: number) => {
    setLoading(true);
    try {
      const res = await fetch("/api/pet/public/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageNum: page, pageSize }),
        credentials: "same-origin",
      });
      const json = await res.json();
      if (json.businessCode === 0) {
        const { list, total: totalCount } = json.data;
        // 首屏刷新时清理旧的失败图片缓存，避免上一批数据干扰
        if (page === 1) {
          setFailedImageByPetId({});
        }
        setPets((prev) => {
          const next = page === 1 ? list : [...prev, ...list];
          setHasMore(next.length < totalCount);
          return next;
        });
        setTotal(totalCount);

        // 处理通知（须标记已读，否则刷新仍从接口带回 is_read/is_admin_read=0）
        if (json.data.notifications?.length > 0) {
          json.data.notifications.forEach(
            (notif: {
              type: string;
              apply_id: number;
              pet_name: string;
              status: number;
            }) => {
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
            }
          );
        }
      } else {
        message.error(
          typeof json.message === "string"
            ? json.message
            : "获取宠物列表失败"
        );
        if (page === 1) {
          setPets([]);
          setTotal(0);
          setHasMore(false);
        }
      }
    } catch (e) {
      message.error("连接服务器失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPets(pageNum);
  }, [pageNum]);

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* 首屏横向通栏卡片：压缩留白，顶部直接看宠物 */}
      <section
        style={{
          marginBottom: 24,
          paddingTop: 0,
          position: "relative",
          zIndex: 1,
        }}
      >
        <motion.div
          // initial={{ opacity: 0, y: 10 }}
          // animate={{ opacity: 1, y: 0 }}
          // transition={{ duration: 0.45 }}
          className="modern-card"
          style={{
            minHeight: 64,
            maxHeight: 80,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* 左：文案（点击保留“浏览宠物”功能） */}
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

          {/* 右：发布领养 */}
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

      {/* Collection Grid - 现代卡片展示 */}
      <section id="collection" style={{ paddingBottom: 72, position: "relative", zIndex: 1 }}>
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
              共有 {total} 位新朋友
            </Text>
          </div>

        <Row gutter={[24, 24]}>
          {pets.map((pet, index) => {
            const imageUrl =
              failedImageByPetId[pet.pet_id] ??
              getPetCoverImage(pet.image_urls, pet.species);

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={pet.pet_id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: (index % 4) * 0.1 }}
                  ref={index === pets.length - 1 ? lastPetElementRef : null}
                  className="modern-card"
                  style={{
                    overflow: "hidden",
                    height: "100%",
                    border: "1px solid rgba(15,23,42,0.06)",
                    background: "linear-gradient(180deg, #fff 0%, #fcfdff 100%)",
                  }}
                >
                  <div
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      router.push(`/pet/detail?pet_id=${pet.pet_id}`)
                    }
                  >
                    <div className="pet-list-card__cover" style={{ padding: 12 }}>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.4 }}
                      >
                        <img
                          alt={pet.name}
                          src={imageUrl}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const localFallback =
                              getLocalDefaultPetCoverBySpecies(pet.species);
                            // 统一失败兜底到本地静态图，避免远程防盗链导致的反复裂图与闪烁
                            const nextFallback = localFallback;
                            setFailedImageByPetId((prev) => {
                              if (prev[pet.pet_id] === nextFallback) return prev;
                              return {
                                ...prev,
                                [pet.pet_id]: nextFallback,
                              };
                            });
                          }}
                          className="pet-card-img"
                          style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 14 }}
                        />
                      </motion.div>
                      {pet.is_applied === 1 && (
                        <div className="pet-list-card__badge">
                          已申请
                        </div>
                      )}
                    </div>
                    <div className="pet-list-card__content" style={{ padding: "0 12px 14px" }}>
                      <div className="pet-list-card__title-row">
                        <Title style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                          {pet.name}
                        </Title>
                        <span
                          className="pet-list-card__species-tag"
                        >
                          {pet.breed || pet.species}
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
                          {pet.age} 个月大 · {pet.gender === 1 ? "公" : "母"}
                        </Text>
                      </div>
                      <div className="pet-list-card__meta-row" style={{ marginTop: 8 }}>
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

        {loading && (
          <div style={{ textAlign: "center", padding: "100px 0" }}>
            <Spin size="small" />
          </div>
        )}

        {!hasMore && pets.length > 0 && (
          <div
            style={{ textAlign: "center", padding: "120px 0", opacity: 0.3 }}
          >
            <Text style={{ letterSpacing: "0.2em", fontSize: 11 }}>
              END OF COLLECTION
            </Text>
          </div>
        )}

        {!loading && pets.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="THE GALLERY IS TEMPORARILY EMPTY"
            style={{ padding: "100px 0" }}
          />
        )}
      </section>
    </div>
  );
}
