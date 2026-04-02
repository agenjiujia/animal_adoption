"use client";

import { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { formatDateTime } from "@/lib/formatDate";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";

const { Text, Title } = Typography;
const { TextArea } = Input;

interface AdoptionApplication {
  apply_id: number;
  pet_id: number;
  pet_name: string;
  apply_user_id: number;
  applicant_name: string;
  applicant_real_name: string;
  applicant_phone: string;
  applicant_avatar?: string;
  apply_message: string;
  status: number;
  create_time: string;
  review_time: string;
  review_message: string;
}

export default function AdoptionApprovalsPage() {
  const [data, setData] = useState<AdoptionApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditSubmitting, setAuditSubmitting] = useState(false);
  const [auditTarget, setAuditTarget] = useState<{
    applyId: number;
    status: number;
  } | null>(null);

  const [auditForm] = Form.useForm<{ message: string }>();

  const fetchData = async (page = pageNum, size = pageSize) => {
    setLoading(true);
    try {
      const res = await fetch("/api/adoption/owner/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageNum: page, pageSize: size }),
      });
      const json = await res.json();
      if (json.businessCode === 0) {
        setData(json.data.list);
        setTotal(json.data.total);
      } else {
        message.error(json.message);
      }
    } catch {
      message.error("获取列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum, pageSize]);

  const openAuditModal = (applyId: number, status: number) => {
    setAuditTarget({ applyId, status });
    auditForm.resetFields();
    setAuditModalOpen(true);
  };

  const handleAuditSubmit = async () => {
    if (!auditTarget) return;
    try {
      const values = await auditForm.validateFields();
      setAuditSubmitting(true);
      const res = await fetch(
        `/api/adoption/owner/${auditTarget.applyId}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: auditTarget.status,
            message: values.message.trim(),
          }),
        }
      );
      const json = await res.json();
      if (json.businessCode === 0) {
        message.success(json.message);
        setAuditModalOpen(false);
        setAuditTarget(null);
        fetchData();
      } else {
        message.error(json.message);
      }
    } catch (e) {
      // 表单校验错误不提示全局 toast
      if (e && typeof e === "object" && "errorFields" in e) return;
      message.error("操作失败");
    } finally {
      setAuditSubmitting(false);
    }
  };

  const columns: ColumnsType<AdoptionApplication> = [
    {
      title: "申请人",
      key: "applicant",
      render: (_, record) => (
        <Space>
          <Avatar
            src={record.applicant_avatar}
            icon={<UserOutlined />}
          />
          <div>
            <div style={{ fontWeight: 600 }}>{record.applicant_name}</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              {record.applicant_phone}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "申请宠物",
      dataIndex: "pet_name",
      key: "pet_name",
      render: (name) => <Text strong>{name}</Text>,
    },
    {
      title: "申请留言",
      dataIndex: "apply_message",
      key: "apply_message",
      ellipsis: true,
      render: (msg) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {msg || "（无留言）"}
        </Text>
      ),
    },
    {
      title: "申请时间",
      dataIndex: "create_time",
      key: "create_time",
      render: (time) => formatDateTime(time),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: number) => {
        switch (status) {
          case 0:
            return (
              <Tag color="processing" bordered={false}>
                待审核
              </Tag>
            );
          case 1:
            return (
              <Tag color="success" bordered={false}>
                已通过
              </Tag>
            );
          case 2:
            return (
              <Tag color="error" bordered={false}>
                已拒绝
              </Tag>
            );
          default:
            return <Tag>未知</Tag>;
        }
      },
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) =>
        record.status === 0 ? (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => openAuditModal(record.apply_id, 1)}
              className="btn-primary"
            >
              通过
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => openAuditModal(record.apply_id, 2)}
            >
              拒绝
            </Button>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {record.review_message || "-"}
          </Text>
        ),
    },
  ];

  return (
    <div>
      <div className="page-title-wrap" style={{ marginBottom: 24 }}>
        <Title level={2}>领养申请审批队列</Title>
        <Text className="page-title-sub">
          处理与您发布宠物相关的领养申请
        </Text>
      </div>

      <Modal
        title={
          auditTarget?.status === 1 ? "确认通过申请？" : "确认拒绝申请？"
        }
        open={auditModalOpen}
        className="fancy-modal"
        okText="提交审核"
        cancelText="取消"
        confirmLoading={auditSubmitting}
        onCancel={() => {
          setAuditModalOpen(false);
          setAuditTarget(null);
        }}
        onOk={handleAuditSubmit}
        destroyOnHidden
      >
        <Form form={auditForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="message"
            label="审核意见"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "请填写审核意见",
              },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="请说明通过或拒绝的原因（必填）"
              style={{ borderRadius: 12 }}
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Card className="standard-card" bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="apply_id"
          loading={loading}
          pagination={{
            current: pageNum,
            pageSize: pageSize,
            total: total,
            onChange: (page, size) => {
              setPageNum(page);
              setPageSize(size);
            },
            showSizeChanger: true,
          }}
        />
      </Card>
    </div>
  );
}

