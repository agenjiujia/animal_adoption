"use client";

import { useRequest } from "ahooks";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  Card,
  Typography,
  Descriptions,
  Button,
  Space,
  Spin,
  message,
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
  PetSpeciesOptions,
} from "@/constant";
import { PetStatusEnum } from "@/types";

const { Title, Text, Paragraph } = Typography;

// 1. 类型定义（匹配详情接口返回的宠物字段）
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
  const urlSearchParams = useSearchParams();
  const params = useParams<{ petId: string }>(); // 从路由参数获取pet_id（路由示例：/pet/detail/[petId]）
  const petId = params.petId;

  // 2. 详情查询请求（复用你的request工具 + ahooks useRequest）
  const { data, loading, error } = useRequest(() =>
    request.get(`/api/pet/detail?pet_id=${urlSearchParams.get("pet_id")}`)
  );

  const petDetail = data?.data;

  // 3. 枚举值转中文文本（复用你的constant选项）
  const getLabelByValue = (options: any[], value: number) => {
    const option = options.find((item) => item.value === value);
    return option?.label || "未知";
  };

  // 4. 处理图片URL（多个URL拆分）
  const getImageUrls = () => {
    if (!petDetail?.image_urls) return [];
    return petDetail.image_urls.split(",").filter((url) => url.trim());
  };

  // 5. 状态标签样式
  const getStatusTagProps = (status: number) => {
    const statusMap = {
      [PetStatusEnum.Pending]: { color: "blue", text: "待领养" },
      [PetStatusEnum.Adopted]: { color: "green", text: "已领养" },
      [PetStatusEnum.Offline]: { color: "orange", text: "下架" },
    };
    return (
      statusMap[status as keyof typeof statusMap] || {
        color: "gray",
        text: "未知",
      }
    );
  };

  // 6. 返回列表页
  const handleBack = () => {
    router.back();
  };

  // 7. 页面渲染
  return (
    <div style={{ maxWidth: 800, margin: "20px auto", padding: "0 20px" }}>
      {/* 顶部操作栏 + 标题 */}
      <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleBack}>
          返回列表
        </Button>
        <Title level={4} style={{ margin: 0, flex: 1, textAlign: "center" }}>
          宠物发布单详情
        </Title>
        <Button
          type="primary"
          onClick={() =>
            router.push(`/pet/edit/?pet_id=${urlSearchParams.get("pet_id")}`)
          } // 跳转到编辑页
        >
          编辑发布单
        </Button>
      </Space.Compact>

      {/* 详情卡片（匹配创建页的样式） */}
      <Card
        style={{ boxShadow: "0 2px 12px 0 rgba(0,0,0,0.1)" }}
        loading={loading}
      >
        {error ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Text type="danger">加载失败：{error.message || "未知错误"}</Text>
            <Button
              type="primary"
              onClick={() => window.location.reload()}
              style={{ marginTop: 16 }}
            >
              重新加载
            </Button>
          </div>
        ) : !petDetail ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Text type="warning">未找到该宠物发布单</Text>
            <Button
              type="default"
              onClick={handleBack}
              style={{ marginTop: 16 }}
            >
              返回列表
            </Button>
          </div>
        ) : (
          <>
            {/* 基础信息 */}
            <Descriptions
              title="基础信息"
              bordered
              column={{ xs: 1, sm: 2, md: 3, lg: 3 }}
              style={{ marginBottom: 20 }}
            >
              <Descriptions.Item label="宠物ID" span={1}>
                {petDetail.pet_id}
              </Descriptions.Item>
              <Descriptions.Item label="发布者ID" span={1}>
                {petDetail.user_id}
              </Descriptions.Item>
              <Descriptions.Item label="发布状态" span={1}>
                <Tag color={getStatusTagProps(petDetail.status).color}>
                  {getStatusTagProps(petDetail.status).text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="宠物名称" span={1}>
                {petDetail.name}
              </Descriptions.Item>
              <Descriptions.Item label="种类" span={1}>
                {petDetail.species}
              </Descriptions.Item>
              <Descriptions.Item label="品种" span={1}>
                {petDetail.breed || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="年龄（月）" span={1}>
                {petDetail.age || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="性别" span={1}>
                {getLabelByValue(PetGenderOptions, petDetail.gender)}
              </Descriptions.Item>
              <Descriptions.Item label="体重（kg）" span={1}>
                {petDetail.weight}
              </Descriptions.Item>
              <Descriptions.Item label="发布时间" span={2}>
                {petDetail.create_time}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新时间" span={1}>
                {petDetail.update_time}
              </Descriptions.Item>
            </Descriptions>

            {/* 健康信息 */}
            <Descriptions
              title="健康信息"
              bordered
              column={{ xs: 1, sm: 2, md: 2, lg: 2 }}
              style={{ marginBottom: 20 }}
            >
              <Descriptions.Item label="疫苗状态" span={1}>
                {getLabelByValue(
                  PetVaccineStatusOptions,
                  petDetail.vaccine_status
                )}
              </Descriptions.Item>
              <Descriptions.Item label="绝育状态" span={1}>
                {getLabelByValue(PetNeuteredOptions, petDetail.neutered)}
              </Descriptions.Item>
              <Descriptions.Item label="健康状况描述" span={2}>
                {petDetail.health_status || "-"}
              </Descriptions.Item>
            </Descriptions>

            {/* 详细描述 */}
            {petDetail.description && (
              <>
                <Divider orientation="left">详细描述</Divider>
                <Paragraph
                  style={{ padding: "0 16px", lineHeight: 1.8 }}
                  ellipsis={{ rows: 10, expandable: true, symbol: "展开更多" }}
                >
                  {petDetail.description}
                </Paragraph>
              </>
            )}

            {/* 图片展示 */}
            {getImageUrls().length > 0 && (
              <>
                <Divider orientation="left">宠物图片</Divider>
                <Space
                  wrap
                  size="middle"
                  style={{ padding: "0 16px", marginBottom: 16 }}
                >
                  {getImageUrls().map((url, index) => (
                    <div key={index} style={{ textAlign: "center" }}>
                      <Image
                        width={150}
                        height={150}
                        src={url}
                        alt={`宠物图片${index + 1}`}
                        fallback="https://via.placeholder.com/150?text=图片加载失败"
                        preview={true} // 支持点击预览
                      />
                      <Text
                        type="secondary"
                        style={{ display: "block", marginTop: 4 }}
                      >
                        图片{index + 1}
                      </Text>
                    </div>
                  ))}
                </Space>
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
