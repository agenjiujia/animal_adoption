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
  Row,
  Col,
} from "antd";
import type { FormProps, UploadFile, UploadProps } from "antd"; // TS类型
import { PlusOutlined } from "@ant-design/icons";
import { PetVaccineStatusEnum, PetNeuteredEnum } from "@/types";
import {
  PetVaccineStatusOptions,
  PetNeuteredOptions,
  PetGenderOptions,
  PetSpeciesOptions,
  PetSpeciesMap,
} from "@/constant";
import { request } from "@/utils/request";
import { motion } from "framer-motion";
import { getPetImageList } from "@/lib/petImage";

const { Title, Text } = Typography;

// 表单字段类型定义
type CreatePetFormValues = {
  name: string;
  species: string;
  breed: string;
  age: number;
  gender: number;
  weight: number;
  health_status: string;
  vaccine_status: number;
  neutered: number;
  description: string;
  /** 仅用于表单校验：图片列表（不直接入库） */
  images?: UploadFile[];
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

  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    if (newFileList.length > 5) {
      message.warning("最多上传 5 张图片");
    }
    const next = newFileList.slice(0, 5);
    setFileList(next);
    form.setFieldValue("images", next);
    void form.validateFields(["images"]).catch(() => {});
  };

  const getUploadedImageUrls = () =>
    fileList
      .filter((f) => f.status === "done")
      .map((f) => f.response?.data?.url || f.url)
      .filter(Boolean) as string[];

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传图片</div>
    </div>
  );

  // 发布接口调用
  const { run: submitPet, loading } = useRequest(
    async (values: CreatePetFormValues) => {
      const imageUrls = getUploadedImageUrls();
      if (imageUrls.length === 0) {
        message.error("请至少上传 1 张宠物图片");
        throw new Error("missing image");
      }
      if (imageUrls.length > 5) {
        message.error("最多上传 5 张宠物图片");
        throw new Error("too many images");
      }
      return request.post("/api/pet/create", {
        ...values,
        image_urls: imageUrls.join(","),
      });
    },
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

        // 反向映射物种：从字符串 "猫" 映射回枚举值 1
        const speciesEntry = Object.entries(PetSpeciesMap).find(
          ([, v]) => v.label === d.species
        );
        const speciesValue = speciesEntry ? Number(speciesEntry[0]) : undefined;

        form.setFieldsValue({
          ...d,
          weight: d.weight != null ? Number(d.weight) : undefined,
          species: speciesValue,
        });
        // 回显图片
        if (d.image_urls) {
          const urls = getPetImageList(d.image_urls);
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
    async (values: CreatePetFormValues) => {
      const imageUrls = getUploadedImageUrls();
      if (imageUrls.length === 0) {
        message.error("请至少上传 1 张宠物图片");
        throw new Error("missing image");
      }
      if (imageUrls.length > 5) {
        message.error("最多上传 5 张宠物图片");
        throw new Error("too many images");
      }
      return request.put("/api/pet/edit", {
        ...values,
        image_urls: imageUrls.join(","),
        pet_id: petIdForEdit,
      });
    },
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
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 0" }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <Title
            level={1}
            style={{ fontSize: 36, fontWeight: 850, marginBottom: 12 }}
          >
            {isCreate ? "发布" : "编辑"}
            <span className="text-gradient">领养信息</span>
          </Title>
          <Text style={{ color: "var(--text-tertiary)", fontSize: 16 }}>
            您的每一份详细描述，都能帮助小生命更快找到家
          </Text>
        </div>

        <Card
          bordered={false}
          className="standard-card"
          bodyStyle={{ padding: 40 }}
          loading={detailLoading}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              gender: 1,
              vaccine_status: 0,
              neutered: 0,
            }}
            requiredMark={false}
          >
            <Title
              level={5}
              style={{
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 16,
                  background: "var(--primary)",
                  borderRadius: 2,
                }}
              />
              基本信息
            </Title>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ fontWeight: 600 }}>宠物昵称</span>}
                  name="name"
                  rules={[{ required: true, message: "请输入宠物昵称" }]}
                >
                  <Input placeholder="给 TA 起个好听的名字" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ fontWeight: 600 }}>物种类型</span>}
                  name="species"
                  rules={[{ required: true, message: "请选择物种" }]}
                >
                  <Select placeholder="选择物种" options={PetSpeciesOptions} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ fontWeight: 600 }}>宠物品种</span>}
                  name="breed"
                  rules={[{ required: true, message: "请输入宠物品种" }]}
                >
                  <Input placeholder="如：布偶猫、金毛等" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ fontWeight: 600 }}>宠物年龄 (月)</span>}
                  name="age"
                  rules={[{ required: true, message: "请输入宠物年龄" }]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="大概月数"
                    min={0}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label={<span style={{ fontWeight: 600 }}>宠物性别</span>}
              name="gender"
              rules={[{ required: true, message: "请选择宠物性别" }]}
            >
              <Radio.Group
                options={PetGenderOptions}
                optionType="button"
                buttonStyle="solid"
              />
            </Form.Item>

            <Divider style={{ margin: "40px 0" }} />

            <Title
              level={5}
              style={{
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 16,
                  background: "var(--primary)",
                  borderRadius: 2,
                }}
              />
              健康状况
            </Title>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ fontWeight: 600 }}>疫苗情况</span>}
                  name="vaccine_status"
                  rules={[{ required: true, message: "请选择疫苗情况" }]}
                >
                  <Select options={PetVaccineStatusOptions} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ fontWeight: 600 }}>绝育情况</span>}
                  name="neutered"
                  rules={[{ required: true, message: "请选择绝育情况" }]}
                >
                  <Select options={PetNeuteredOptions} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label={<span style={{ fontWeight: 600 }}>健康描述</span>}
              name="health_status"
              rules={[{ required: true, message: "请填写健康描述" }]}
            >
              <Input.TextArea
                placeholder="简单描述一下宠物的健康状况、过敏史等"
                rows={3}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600 }}>体重 (kg)</span>}
              name="weight"
              rules={[{ required: true, message: "请输入体重" }]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                max={999.99}
                precision={2}
                placeholder="如：3.50"
              />
            </Form.Item>

            <Divider style={{ margin: "40px 0" }} />

            <Title
              level={5}
              style={{
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 16,
                  background: "var(--primary)",
                  borderRadius: 2,
                }}
              />
              生活照展示
            </Title>

            <Form.Item
              name="images"
              label={
                <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
                  第一张图将作为封面展示（至少 1 张，最多 5 张）
                </span>
              }
              rules={[
                {
                  validator: async () => {
                    const n = getUploadedImageUrls().length;
                    if (n < 1) throw new Error("请至少上传 1 张宠物图片");
                    if (n > 5) throw new Error("最多上传 5 张宠物图片");
                  },
                },
              ]}
            >
              <Upload
                action="/api/upload"
                listType="picture-card"
                fileList={fileList}
                onPreview={handlePreview}
                onChange={handleChange}
                maxCount={5}
              >
                {fileList.length >= 5 ? null : uploadButton}
              </Upload>
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600 }}>详细故事</span>}
              name="description"
              rules={[{ required: true, message: "请填写详细故事" }]}
            >
              <Input.TextArea
                placeholder="分享一下 TA 的性格、爱好或有趣的小故事，这能大大增加领养成功率哦"
                rows={5}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 48, marginBottom: 0 }}>
              <Space
                size={16}
                style={{ width: "100%", justifyContent: "center" }}
              >
                <Button
                  size="large"
                  onClick={() => router.back()}
                  style={{ width: 120 }}
                >
                  取消
                </Button>
                <Button
                  className="btn-primary"
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={isCreate ? loading : editLoading}
                  style={{ width: 200, fontWeight: 700 }}
                >
                  {isCreate ? "确认发布" : "保存修改"}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </motion.div>

      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={handleCancel}
        centered
        className="standard-modal"
      >
        <img
          alt="preview"
          style={{ width: "100%", borderRadius: 12 }}
          src={previewImage}
        />
      </Modal>
    </div>
  );
}
