"use client";

import { useEffect, useMemo, useState } from "react";
import { useRequest } from "ahooks";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  Typography,
  Descriptions,
  Button,
  Space,
  Spin,
  Divider,
  Image,
  Tag,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
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
}

export default function PetDetailPage() {
  const router = useRouter();
  const qs = useSearchParams();
  const petId = qs.get("pet_id");
  const [uid, setUid] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("userInfo");
      if (raw) setUid(JSON.parse(raw).user_id ?? null);
    } catch {
      setUid(null);
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

  const statusStyle = (s: number) => {
    const m: Record<number, { c: string; t: string }> = {
      [PetStatusEnum.ForAdoption]: { c: "blue", t: "待领养" },
      [PetStatusEnum.Adopted]: { c: "green", t: "已领养" },
      [PetStatusEnum.Offline]: { c: "orange", t: "下架" },
    };
    return m[s] ?? { c: "default", t: "未知" };
  };

  const images = petDetail?.image_urls
    ? petDetail.image_urls.split(",").filter(Boolean)
    : [];

  return (
    <Card
      title={
        <Title level={4} style={{ marginBottom: 0 }}>
          宠物详情
        </Title>
      }
      extra={
        canEdit ? (
          <Button
            type="primary"
            onClick={() => router.push(`/pet/edit/?pet_id=${petId}`)}
          >
            编辑
          </Button>
        ) : null
      }
    >
      <Card loading={loading}>
        {error ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Text type="danger">{error.message}</Text>
            <Button
              type="primary"
              style={{ marginTop: 16 }}
              onClick={() => refresh()}
            >
              重试
            </Button>
          </div>
        ) : !petDetail ? (
          <Text>无数据</Text>
        ) : (
          <>
            <Descriptions title="基本信息" bordered column={2} size="small">
              <Descriptions.Item label="ID">
                {petDetail.pet_id}
              </Descriptions.Item>
              <Descriptions.Item label="发布者">
                {petDetail.user_id}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusStyle(petDetail.status).c}>
                  {statusStyle(petDetail.status).t}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="名称">
                {petDetail.name}
              </Descriptions.Item>
              <Descriptions.Item label="种类">
                {
                  PetSpeciesMap[petDetail.species as unknown as PetSpeciesEnum]
                    ?.label
                }
              </Descriptions.Item>
              <Descriptions.Item label="品种">
                {petDetail.breed || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="年龄(月)">
                {petDetail.age ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="性别">
                {label(PetGenderOptions, petDetail.gender)}
              </Descriptions.Item>
              <Descriptions.Item label="体重">
                {petDetail.weight ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(petDetail.create_time).format("YYYY-MM-DD HH:mm:ss")}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(petDetail.update_time).format("YYYY-MM-DD HH:mm:ss")}
              </Descriptions.Item>
            </Descriptions>
            <Descriptions
              title="健康"
              bordered
              column={2}
              size="small"
              style={{ marginTop: 16 }}
            >
              <Descriptions.Item label="疫苗">
                {label(PetVaccineStatusOptions, petDetail.vaccine_status)}
              </Descriptions.Item>
              <Descriptions.Item label="绝育">
                {label(PetNeuteredOptions, petDetail.neutered)}
              </Descriptions.Item>
              <Descriptions.Item label="健康状况" span={2}>
                {petDetail.health_status || "-"}
              </Descriptions.Item>
            </Descriptions>
            {petDetail.description ? (
              <>
                <Divider>描述</Divider>
                <Paragraph>{petDetail.description}</Paragraph>
              </>
            ) : null}
            {images.length > 0 ? (
              <>
                <Divider>图片</Divider>
                <Space wrap>
                  {images.map((url, i) => (
                    <Image key={i} width={140} src={url} alt="" />
                  ))}
                </Space>
              </>
            ) : null}
          </>
        )}
      </Card>
    </Card>
  );
}
