"use client";

import { useEffect, useState } from "react";
import { useRequest } from "ahooks";
import { useRouter } from "next/navigation";
import {
  Form,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Modal,
  Spin,
  Row,
  Col,
  Tag,
  Empty,
  message,
  Pagination,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { request } from "@/utils/request";
import { PetSpeciesOptions } from "@/constant";
import { PetStatusEnum } from "@/types";
import { motion } from "framer-motion";
import {
  getLocalDefaultPetCoverBySpecies,
  getPetCoverImage,
} from "@/lib/petImage";

const { Title, Text, Paragraph } = Typography;

interface PetItem {
  pet_id: number;
  user_id: number;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  gender: number;
  image_urls?: string | string[];
  description?: string;
  status: number;
  create_time: string;
}

export default function MyPublishPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [failedImageByPetId, setFailedImageByPetId] = useState<
    Record<number, string>
  >({});

  const {
    run: load,
    loading,
    data,
  } = useRequest((params: any) => request.post("/api/pet/list", params), {
    manual: true,
  });

  const list = (data?.data as { list?: PetItem[] })?.list ?? [];
  const total = (data?.data as { total?: number })?.total ?? 0;

  useEffect(() => {
    load({ pageNum, pageSize, ...form.getFieldsValue() });
  }, [pageNum, pageSize, load]);

  useEffect(() => {
    setFailedImageByPetId({});
  }, [pageNum, pageSize]);

  const onSearch = () => {
    setPageNum(1);
    load({ pageNum: 1, pageSize, ...form.getFieldsValue() });
  };

  const onReset = () => {
    form.resetFields();
    setPageNum(1);
    load({ pageNum: 1, pageSize });
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
            load({ pageNum, pageSize, ...form.getFieldsValue() });
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

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 40,
        }}
      >
        <div>
          <Title level={2}>我的发布</Title>
          <Text className="page-title-sub">管理您发布的宠物领养信息</Text>
        </div>
        <Button
          className="btn-gradient"
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => router.push("/pet/new")}
        >
          发布新宠
        </Button>
      </div>

      <div className="modern-card" style={{ padding: 24, marginBottom: 32 }}>
        <Form form={form} layout="vertical" onFinish={onSearch}>
          <Row gutter={24}>
            <Col span={6}>
              <Form.Item name="name" label="宠物昵称">
                <Input placeholder="输入昵称搜索" allowClear />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="species" label="宠物种类">
                <Select
                  placeholder="全部种类"
                  options={PetSpeciesOptions}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="status" label="状态">
                <Select placeholder="全部状态" allowClear>
                  <Select.Option value={0}>待领养</Select.Option>
                  <Select.Option value={1}>已领养</Select.Option>
                  <Select.Option value={2}>已下架</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label=" ">
                <Space>
                  <Button type="primary" htmlType="submit" className="btn-primary">
                    查询
                  </Button>
                  <Button onClick={onReset}>重置</Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>

      <Spin spinning={loading} description="正在同步发布状态...">
        {list.length > 0 ? (
          <Row gutter={[32, 32]}>
            {list.map((pet) => {
              const imageUrl =
                failedImageByPetId[pet.pet_id] ??
                getPetCoverImage(pet.image_urls, pet.species);
              return (
                <Col xs={24} sm={12} md={8} lg={6} key={pet.pet_id}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -8 }}
                  >
                    <div className="modern-card" style={{ overflow: "hidden" }}>
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
                          <Title level={4} style={{ margin: 0 }}>
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
                            marginBottom: 16,
                            color: "#8A8AA8",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          <EnvironmentOutlined />
                          <span>
                            {pet.species} · {pet.breed || "普通"}
                          </span>
                        </div>

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
        ) : (
          !loading && <Empty description="还没有发布过领养信息，快去发布吧" />
        )}
        {total > 0 && (
          <div
            style={{
              marginTop: 40,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Pagination
              current={pageNum}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              pageSizeOptions={[12, 24, 48]}
              showTotal={(t) => `共 ${t} 条发布`}
              onChange={(p, ps) => {
                setPageNum(p);
                setPageSize(ps);
              }}
            />
          </div>
        )}
      </Spin>
    </div>
  );
}
