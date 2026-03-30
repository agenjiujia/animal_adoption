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
  Card,
  Modal,
  Spin,
  Row,
  Col,
  Tag,
  Empty,
  message,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { request } from "@/utils/request";
import { PetSpeciesOptions } from "@/constant";
import { PetStatusEnum } from "@/types";
import { motion } from "framer-motion";
import { getPetCoverImage } from "@/lib/petImage";

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
  const [pageSize] = useState(12);

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
          <Text style={{ color: "#8A8AA8" }}>管理您发布的宠物领养信息</Text>
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

      <Card
        className="glass-morphism"
        style={{ marginBottom: 32, borderRadius: 16 }}
      >
        <Form
          form={form}
          layout="inline"
          onFinish={onSearch}
          style={{ gap: 16 }}
        >
          <Form.Item name="name">
            <Input
              placeholder="宠物昵称"
              prefix={<SearchOutlined style={{ color: "#8A8AA8" }} />}
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item name="species">
            <Select
              placeholder="选择物种"
              options={PetSpeciesOptions}
              style={{ width: 150 }}
              allowClear
            />
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="状态" style={{ width: 120 }} allowClear>
              <Select.Option value={0}>待领养</Select.Option>
              <Select.Option value={1}>已领养</Select.Option>
              <Select.Option value={2}>已下架</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={onReset}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Spin spinning={loading} description="正在同步发布状态...">
        {list.length > 0 ? (
          <Row gutter={[32, 32]}>
            {list.map((pet) => {
              const imageUrl = getPetCoverImage(pet.image_urls);
              return (
                <Col xs={24} sm={12} md={8} lg={6} key={pet.pet_id}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -8 }}
                  >
                    <Card
                      hoverable
                      className="fancy-card"
                      cover={
                        <div
                          style={{
                            position: "relative",
                            overflow: "hidden",
                            borderTopLeftRadius: 16,
                            borderTopRightRadius: 16,
                          }}
                        >
                          <img
                            alt={pet.name}
                            src={imageUrl}
                            style={{
                              width: "100%",
                              height: 200,
                              objectFit: "cover",
                            }}
                          />
                          <div
                            style={{ position: "absolute", top: 12, right: 12 }}
                          >
                            {getStatusTag(pet.status)}
                          </div>
                        </div>
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
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
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            color: "#8A8AA8",
                            fontSize: 12,
                          }}
                        >
                          <EnvironmentOutlined />
                          <span>
                            {pet.species} · {pet.breed || "普通"}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button
                          icon={<EditOutlined />}
                          block
                          onClick={() =>
                            router.push(`/pet/edit?pet_id=${pet.pet_id}`)
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
                    </Card>
                  </motion.div>
                </Col>
              );
            })}
          </Row>
        ) : (
          !loading && <Empty description="还没有发布过领养信息，快去发布吧" />
        )}
      </Spin>
    </div>
  );
}
