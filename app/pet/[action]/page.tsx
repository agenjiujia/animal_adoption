"use client";
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
} from "antd";
import type { FormProps } from "antd"; // TS类型
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

  // 发布接口调用
  const { run: submitPet, loading } = useRequest(
    (values: CreatePetFormValues) =>
      request.post("/api/pet/create", {
        ...values,
        // 处理图片URL（逗号分隔）
        image_urls: values.image_urls?.replace(/，/g, ",") || "",
      }),
    {
      manual: true,
      onSuccess: () => {
        message.success("发布成功");
        router.back();
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
        });
      },
    }
  );

  const { loading: editLoading, run: editPet } = useRequest(
    (values) =>
      request.put("/api/pet/edit", {
        ...values,
        image_urls: values.image_urls?.replace(/，/g, ",") || "",
        pet_id: petIdForEdit,
      }),
    {
      onSuccess: () => {
        message.success("编辑成功");
        router.back();
      },
    }
  );

  // 表单提交处理
  const onFinish: FormProps<CreatePetFormValues>["onFinish"] = (values) =>
    isCreate ? submitPet(values) : editPet(values);

  return (
    <Card
      title={
        <Title level={4} style={{ marginBottom: 0 }}>
          发布宠物领养信息
        </Title>
      }
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
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {/* 宠物名称 */}
          <Form.Item
            name="name"
            label="宠物名称"
            rules={[
              { required: true },
              { max: 50, message: "名称长度不能超过50字" },
            ]}
          >
            <Input placeholder="例如：小金毛、小布偶" maxLength={50} />
          </Form.Item>

          {/* 宠物种类 */}
          <Form.Item
            name="species"
            label="宠物种类"
            rules={[{ required: true }]}
          >
            <Select options={PetSpeciesOptions} placeholder="请选择宠物种类" />
          </Form.Item>

          <Form.Item
            name="gender"
            label="性别"
            style={{ flex: 1 }}
            rules={[{ required: true }]}
          >
            <Radio.Group>
              {PetGenderOptions.map((option) => (
                <Radio key={option.value} value={option.value}>
                  {option.label}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>

          {/* 宠物品种 */}
          <Form.Item name="breed" label="宠物品种">
            <Input placeholder="例如：金毛、布偶猫、柯基（可选）" />
          </Form.Item>

          <Form.Item
            name="age"
            label="年龄（月）"
            style={{ flex: 1 }}
            rules={[{ type: "number", min: 0, message: "年龄必须为非负整数" }]}
          >
            <InputNumber
              placeholder="例如：3"
              min={0}
              precision={0}
              style={{ width: "100%" }}
            />
          </Form.Item>

          {/* 体重 */}
          <Form.Item
            name="weight"
            label="体重（kg）"
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
              style={{ width: "100%" }}
            />
          </Form.Item>
        </div>

        {/* 健康状况 */}
        <Form.Item name="health_status" label="健康状况描述">
          <Input.TextArea
            placeholder="描述宠物健康状况、是否有疾病等（可选）"
            rows={3}
          />
        </Form.Item>

        {/* 疫苗状态 + 绝育状态 一行布局 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
          }}
        >
          <Form.Item name="vaccine_status" label="疫苗状态">
            <Select
              options={PetVaccineStatusOptions}
              placeholder="请选择疫苗状态"
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item name="neutered" label="绝育状态">
            <Select
              options={PetNeuteredOptions}
              placeholder="请选择绝育状态"
              style={{ width: "100%" }}
            />
          </Form.Item>
        </div>

        {/* 详细描述 */}
        <Form.Item name="description" label="宠物详细描述">
          <Input.TextArea
            placeholder="描述宠物性格、习性、领养要求等（可选）"
            rows={5}
          />
        </Form.Item>

        {/* 图片URL */}
        <Form.Item
          name="image_urls"
          label="图片URL"
          extra={<Text type="secondary">多个URL请用英文逗号分隔（可选）</Text>}
        >
          <Input placeholder="例如：https://xxx.jpg,https://yyy.jpg" />
        </Form.Item>

        {/* 提交按钮 */}
        <Form.Item style={{ textAlign: "center" }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading || editLoading}
            size="large"
            style={{ width: 200 }}
          >
            {isCreate ? "发布" : "编辑"}宠物信息
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
