"use client";

import { useEffect, useRef, useState } from "react";
import { useInfiniteScroll } from "ahooks";
import { useRouter } from "next/navigation";
import {
  Form,
  Input,
  Select,
  Button,
  Typography,
  Modal,
  Spin,
  Row,
  Col,
  Tag,
  Empty,
  message,
  Divider,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { request } from "@/utils/request";
import { PetSpeciesMap, PetSpeciesOptions } from "@/constant";
import { PetSpeciesEnum, PetStatusEnum } from "@/types";
import { motion } from "framer-motion";
import {
  getLocalDefaultPetCoverBySpecies,
  getPetCoverImage,
} from "@/lib/petImage";
import SearchFilterCard from "@/app/_components/SearchFilterCard";
import { PET_CARD_PAGE_SIZE } from "@/lib/petListing";
import { usePetCardInfiniteLoadMore } from "@/lib/usePetCardInfiniteLoadMore";

const { Title, Text, Paragraph } = Typography;

interface PetItem {
  pet_id: number;
  user_id: number;
  name: string;
  species: number;
  breed?: string;
  age?: number;
  gender: number;
  image_urls?: string | string[];
  description?: string;
  status: number;
  create_time: string;
}

type ListChunk = {
  list: PetItem[];
  total: number;
  pageNum: number;
  pageSize: number;
};

export default function MyPublishPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [queryKey, setQueryKey] = useState(0);
  const filterRef = useRef<Record<string, unknown>>({});
  const [failedImageByPetId, setFailedImageByPetId] = useState<
    Record<number, string>
  >({});

  const { data, loading, loadingMore, noMore, reload, loadMore } =
    useInfiniteScroll<ListChunk>(
    async (last) => {
      const nextPage = last?.pageNum != null ? last.pageNum + 1 : 1;
      const res = await request.post("/api/pet/list", {
        pageNum: nextPage,
        pageSize: PET_CARD_PAGE_SIZE,
        ...filterRef.current,
      });
      const payload = res.data as {
        list?: PetItem[];
        total?: number;
      };
      return {
        list: payload.list ?? [],
        total: payload.total ?? 0,
        pageNum: nextPage,
        pageSize: PET_CARD_PAGE_SIZE,
      };
    },
    {
      isNoMore: (d) => {
        if (!d?.list) return true;
        return d.list.length >= (d.total ?? 0);
      },
      reloadDeps: [queryKey],
    },
  );

  const list = data?.list ?? [];
  const total = data?.total ?? 0;

  const loadMoreSentinelRef = usePetCardInfiniteLoadMore(loadMore, {
    noMore,
    loading,
    loadingMore,
    listLength: list.length,
  });

  useEffect(() => {
    setFailedImageByPetId({});
  }, [queryKey]);

  const bumpQuery = () => setQueryKey((k) => k + 1);

  const onSearch = () => {
    filterRef.current = { ...form.getFieldsValue() };
    bumpQuery();
  };

  const onReset = () => {
    form.resetFields();
    filterRef.current = {};
    bumpQuery();
  };

  const handleDelete = (petId: number) => {
    Modal.confirm({
      title: "确认删除",
      content: "删除后不可恢复，确定要删除这个发布单吗？",
      okText: "确认删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await request.delete(`/api/pet/${petId}`);
          if (res.businessCode === 0) {
            message.success("已删除");
            void reload();
          } else {
            message.error(res.message);
          }
        } catch {
          message.error("操作失败");
        }
      },
    });
  };

  const getStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="blue">待领养</Tag>;
      case 1:
        return <Tag color="green">已领养</Tag>;
      case 2:
        return <Tag color="default">已下架</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  const filterList = [
    {
      field: "name",
      component: (
        <Input
          placeholder="输入昵称搜索"
          allowClear
          prefix={<span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>昵称</span>}
        />
      ),
    },
    {
      field: "species",
      component: (
        <Select
          placeholder="宠物种类"
          options={PetSpeciesOptions}
          allowClear
          prefix={<span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>种类</span>}
        />
      ),
    },
    {
      field: "status",
      component: (
        <Select
          placeholder="状态"
          allowClear
          prefix={<span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>状态</span>}
        >
          <Select.Option value={0}>待领养</Select.Option>
          <Select.Option value={1}>已领养</Select.Option>
          <Select.Option value={2}>已下架</Select.Option>
        </Select>
      ),
    },
  ];

  return (
    <div>
      <div
        className="modern-card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          padding: "16px",
          background:
            "linear-gradient(90deg, rgba(124, 110, 230, 0.08) 0%, rgba(243, 143, 178, 0.08) 100%)",
          border: "1px solid rgba(124, 110, 230, 0.14)",
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0 }}>
            我的发布
          </Title>
          <Text className="page-title-sub">管理您发布的宠物领养信息</Text>
        </div>
        <Button
          className="btn-primary"
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => router.push("/pet/new")}
        >
          发布新宠
        </Button>
      </div>

      <SearchFilterCard
        form={form}
        onSearch={onSearch}
        onReset={onReset}
        filterList={filterList}
        marginBottom={16}
      />

      <div className="modern-card pet-surface-card" style={{ padding: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
            发布列表
          </Text>
          <Text style={{ color: "var(--text-muted)", fontSize: 12 }}>
            共 {total} 条 · 每次加载 {PET_CARD_PAGE_SIZE} 条
          </Text>
        </div>
        <Divider style={{ margin: "0 0 16px 0", borderColor: "rgba(124, 110, 230, 0.12)" }} />
        <Spin spinning={loading} description="正在同步发布状态...">
        {list.length > 0 ? (
          <>
            <Row gutter={[24, 24]} justify="start">
            {list.map((pet) => {
              const imageUrl =
                failedImageByPetId[pet.pet_id] ??
                getPetCoverImage(pet.image_urls, pet.species);
              return (
                <Col xs={24} sm={12} md={12} lg={8} xl={6} key={pet.pet_id}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ opacity: 0.98 }}
                  >
                    <div className="modern-card pet-surface-card" style={{ overflow: "hidden" }}>
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
                        <div style={{ position: "absolute", top: 22, right: 24 }}>
                          {getStatusTag(pet.status)}
                        </div>
                      </div>

                      <div className="pet-list-card__content">
                        <div className="pet-list-card__title-row">
                          <Title level={4} style={{ margin: 0, fontSize: 20 }}>
                            {pet.name}
                          </Title>
                          <Tag
                            color={pet.gender === 1 ? "blue" : "volcano"}
                            bordered={false}
                          >
                            {pet.gender === 1 ? "公" : "母"}
                          </Tag>
                        </div>

                        <div
                          className="pet-list-card__meta-row"
                          style={{
                            marginBottom: 12,
                            color: "var(--text-tertiary)",
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          <EnvironmentOutlined />
                          <span>
                            {PetSpeciesMap[pet.species as PetSpeciesEnum]?.label || "其他"} · {pet.breed || "普通"}
                          </span>
                        </div>

                        <Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{
                            marginBottom: 14,
                            color: "var(--text-secondary)",
                            minHeight: 42,
                          }}
                        >
                          {pet.description || "这个小家伙还在等待你补充更详细的介绍。"}
                        </Paragraph>

                        <div style={{ display: "flex", gap: 8 }}>
                          <Button
                            icon={<EditOutlined />}
                            block
                            disabled={pet.status === PetStatusEnum.Offline}
                            onClick={() => {
                              if (pet.status === PetStatusEnum.Offline) return;
                              router.push(`/pet/edit?pet_id=${pet.pet_id}`);
                            }}
                            title={
                              pet.status === PetStatusEnum.Offline
                                ? "已下架宠物不可编辑"
                                : undefined
                            }
                          >
                            编辑
                          </Button>
                          <Button
                            danger
                            icon={<DeleteOutlined />}
                            block
                            onClick={() => handleDelete(pet.pet_id)}
                          >
                            删除
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
              {!loading && !loadingMore && noMore && list.length > 0 && "已加载全部"}
            </div>
          </>
        ) : (
          !loading && <Empty description="还没有发布过领养信息，快去发布吧" />
        )}
        </Spin>
      </div>
    </div>
  );
}
