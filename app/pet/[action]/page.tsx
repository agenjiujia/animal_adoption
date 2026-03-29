"use client";
import { useEffect, useState } from "react";
import { useRequest } from "ahooks";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Button,
  Card,
  Space,
  Typography,
  message,
  Upload,
  Modal,
  Divider,
} from "antd";
import type { FormProps, UploadFile, UploadProps } from "antd"; // TS类型
import { PlusOutlined } from "@ant-design/icons";
import { PetVaccineStatusEnum, PetNeuteredEnum } from "@/types";
import {
  PetVaccineStatusOptions,
  PetNeuteredOptions,
  PetGenderOptions,
  PetSpeciesOptions,
} from "@/constant";
import { request } from "@/utils/request";

const { Title, Text } = Typography;

// 表单字段类型定义
type CreatePetFormValues = {
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
};

export default function CreatePet() {
  const router = useRouter();
  const [form] = Form.useForm();
  const params = useParams<{ action: string }>();
  const urlSearchParams = useSearchParams();
  const isCreate = params.action === "new";
  const petIdForEdit = urlSearchParams.get("pet_id");

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const handleCancel = () => setPreviewOpen(false);

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = file.thumbUrl;
    }
    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
    setPreviewTitle(
      file.name || file.url!.substring(file.url!.lastIndexOf("/") + 1)
    );
  };

  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) =>
    setFileList(newFileList);

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传图片</div>
    </div>
  );

  // 发布接口调用
  const { run: submitPet, loading } = useRequest(
    (values: CreatePetFormValues) =>
      request.post("/api/pet/create", {
        ...values,
        // 处理图片URL（从 fileList 中提取已上传成功的 URL）
        image_urls: fileList
          .filter((f) => f.status === "done")
          .map((f) => f.response?.data?.url || f.url)
          .join(","),
      }),
    {
      manual: true,
      onSuccess: () => {
        message.success("发布成功");
        router.push("/");
      },
    }
  );

  const { loading: detailLoading } = useRequest(
    () => request.get(`/api/pet/detail?pet_id=${petIdForEdit}`),
    {
      ready: !isCreate && !!petIdForEdit,
      refreshDeps: [petIdForEdit, isCreate],
      onSuccess: (res) => {
        const d = res.data as Record<string, unknown> | undefined;
        if (!d) return;
        form.setFieldsValue({
          ...d,
          weight: d.weight != null ? Number(d.weight) : undefined,
          species: d.species !== null ? Number(d.species) : undefined,
        });
        // 回显图片
        if (d.image_urls) {
          const urls = String(d.image_urls).split(",").filter(Boolean);
          setFileList(
            urls.map((url, index) => ({
              uid: `-${index}`,
              name: `image-${index}`,
              status: "done",
              url: url,
            }))
          );
        }
      },
    }
  );

  const { loading: editLoading, run: editPet } = useRequest(
    (values: CreatePetFormValues) =>
      request.put("/api/pet/edit", {
        ...values,
        image_urls: fileList
          .filter((f) => f.status === "done")
          .map((f) => f.response?.data?.url || f.url)
          .join(","),
        pet_id: petIdForEdit,
      }),
    {
      manual: true,
      onSuccess: () => {
        message.success("编辑成功");
        router.push("/");
      },
    }
  );

  // 表单提交处理
  const onFinish: FormProps<CreatePetFormValues>["onFinish"] = (values) =>
    isCreate ? submitPet(values) : editPet(values);

  return (
    <div
      style={{
        background: "#F8FAFC",
        minHeight: "100vh",
        padding: "20px 24px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <Title
            level={2}
            style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}
          >
            {isCreate ? "发布送养信息" : "编辑宠物信息"}
          </Title>
          <Text style={{ color: "#64748B" }}>
            请真实、详细地填写宠物信息，帮助它更快找到温暖的家
          </Text>
        </div>

        <Card
          bordered={false}
          className="card-shadow"
          style={{ borderRadius: 12 }}
          bodyStyle={{ padding: "40px" }}
          loading={detailLoading}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              vaccine_status: PetVaccineStatusEnum.Unknown,
              neutered: PetNeuteredEnum.Unknown,
            }}
            requiredMark="optional"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "0 24px",
              }}
            >
              {/* 宠物名称 */}
              <Form.Item
                name="name"
                label={
                  <Text strong style={{ fontSize: 14 }}>
                    宠物名称
                  </Text>
                }
                rules={[
                  { required: true, message: "请输入宠物名称" },
                  { max: 50, message: "名称长度不能超过50字" },
                ]}
              >
                <Input
                  placeholder="例如：小金毛、小布偶"
                  maxLength={50}
                  style={{ borderRadius: 6 }}
                />
              </Form.Item>

              {/* 宠物种类 */}
              <Form.Item
                name="species"
                label={
                  <Text strong style={{ fontSize: 14 }}>
                    宠物种类
                  </Text>
                }
                rules={[{ required: true, message: "请选择种类" }]}
              >
                <Select
                  options={PetSpeciesOptions}
                  placeholder="请选择宠物种类"
                  style={{ borderRadius: 6 }}
                />
              </Form.Item>

              <Form.Item
                name="gender"
                label={
                  <Text strong style={{ fontSize: 14 }}>
                    性别
                  </Text>
                }
                rules={[{ required: true, message: "请选择性别" }]}
              >
                <Radio.Group>
                  <Space size={24}>
                    {PetGenderOptions.map((option) => (
                      <Radio key={option.value} value={option.value}>
                        {option.label}
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              </Form.Item>

              {/* 宠物品种 */}
              <Form.Item
                name="breed"
                label={
                  <Text strong style={{ fontSize: 14 }}>
                    宠物品种
                  </Text>
                }
              >
                <Input
                  placeholder="例如：金毛、布偶猫（可选）"
                  style={{ borderRadius: 6 }}
                />
              </Form.Item>

              <Form.Item
                name="age"
                label={
                  <Text strong style={{ fontSize: 14 }}>
                    年龄（月）
                  </Text>
                }
                rules={[
                  { type: "number", min: 0, message: "年龄必须为非负整数" },
                ]}
              >
                <InputNumber
                  placeholder="例如：3"
                  min={0}
                  precision={0}
                  style={{ width: "100%", borderRadius: 6 }}
                />
              </Form.Item>

              {/* 体重 */}
              <Form.Item
                name="weight"
                label={
                  <Text strong style={{ fontSize: 14 }}>
                    体重（kg）
                  </Text>
                }
                rules={[
                  {
                    type: "number",
                    min: 0,
                    max: 999.99,
                    message: "体重需为0-999.99之间的数字",
                  },
                ]}
              >
                <InputNumber
                  placeholder="例如：5.5"
                  min={0}
                  max={999.99}
                  precision={2}
                  style={{ width: "100%", borderRadius: 6 }}
                />
              </Form.Item>
            </div>

            <Divider style={{ margin: "16px 0 32px" }} />

            {/* 健康状况 */}
            <Form.Item
              name="health_status"
              label={
                <Text strong style={{ fontSize: 14 }}>
                  健康状况描述
                </Text>
              }
            >
              <Input.TextArea
                placeholder="描述宠物健康状况、是否有疾病等（可选）"
                rows={3}
                style={{ borderRadius: 6 }}
              />
            </Form.Item>

            {/* 疫苗状态 + 绝育状态 一行布局 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "0 24px",
              }}
            >
              <Form.Item
                name="vaccine_status"
                label={
                  <Text strong style={{ fontSize: 14 }}>
                    疫苗状态
                  </Text>
                }
              >
                <Select
                  options={PetVaccineStatusOptions}
                  placeholder="请选择疫苗状态"
                  style={{ width: "100%", borderRadius: 6 }}
                />
              </Form.Item>

              <Form.Item
                name="neutered"
                label={
                  <Text strong style={{ fontSize: 14 }}>
                    绝育状态
                  </Text>
                }
              >
                <Select
                  options={PetNeuteredOptions}
                  placeholder="请选择绝育状态"
                  style={{ width: "100%", borderRadius: 6 }}
                />
              </Form.Item>
            </div>

            {/* 详细描述 */}
            <Form.Item
              name="description"
              label={
                <Text strong style={{ fontSize: 14 }}>
                  详细故事与领养要求
                </Text>
              }
            >
              <Input.TextArea
                placeholder="描述宠物的性格、习性、生活习惯以及对领养家庭的期待等..."
                rows={5}
                style={{ borderRadius: 6 }}
              />
            </Form.Item>

            {/* 图片上传 */}
            <Form.Item
              label={
                <Text strong style={{ fontSize: 14 }}>
                  宠物图片
                </Text>
              }
              extra={
                <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                  支持多图上传（最多8张），首张图片将作为封面展示
                </Text>
              }
            >
              <Upload
                action="/api/upload"
                listType="picture-card"
                fileList={fileList}
                onPreview={handlePreview}
                onChange={handleChange}
                maxCount={8}
                accept="image/*"
              >
                {fileList.length >= 8 ? null : uploadButton}
              </Upload>
              <Modal
                open={previewOpen}
                title={previewTitle}
                footer={null}
                onCancel={handleCancel}
              >
                <img
                  alt="preview"
                  style={{ width: "100%", borderRadius: 8 }}
                  src={previewImage}
                />
              </Modal>
            </Form.Item>

            <Divider style={{ margin: "40px 0" }} />

            {/* 提交按钮 */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              <Button
                onClick={() => router.push("/")}
                size="large"
                style={{ width: 160, height: 48, borderRadius: 6 }}
              >
                返回首页
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading || editLoading}
                size="large"
                style={{
                  width: 240,
                  height: 48,
                  borderRadius: 6,
                  background: "#2A9D8F",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(42, 157, 143, 0.2)",
                }}
              >
                确认{isCreate ? "发布" : "保存修改"}
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
}
