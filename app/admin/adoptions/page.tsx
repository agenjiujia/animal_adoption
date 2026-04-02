"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Tag,
  Space,
  Modal,
  Input,
  Form,
  Select,
  message,
  Typography,
  Avatar,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { formatDateTime } from "@/lib/formatDate";
import {
  UserOutlined,
} from "@ant-design/icons";
import SearchFilterCard, {
  type SearchFilterItem,
} from "@/app/_components/SearchFilterCard";

const { Text } = Typography;
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

export default function AdminAdoptionsPage() {
  const [data, setData] = useState<AdoptionApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState<number | undefined>(
    undefined
  );

  const [searchForm] = Form.useForm<{ status?: number }>();
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
      const payload: {
        pageNum: number;
        pageSize: number;
        status?: number;
      } = {
        pageNum: page,
        pageSize: size,
      };
      if (filterStatus !== undefined) payload.status = filterStatus;

      const res = await fetch("/api/admin/adoption/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.businessCode === 0) {
        setData(json.data.list);
        setTotal(json.data.total);
      } else {
        message.error(json.message);
      }
    } catch (error) {
      message.error("获取列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pageNum, pageSize, filterStatus]);

  const handleSearch = async (values: { status?: number }) => {
    const nextStatus =
      values.status === undefined || values.status === null
        ? undefined
        : Number(values.status);
    setFilterStatus(nextStatus);
    setPageNum(1);
  };

  const handleReset = () => {
    searchForm.resetFields();
    setFilterStatus(undefined);
    setPageNum(1);
  };

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
        `/api/admin/adoption/${auditTarget.applyId}/review`,
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
          <Avatar src={record.applicant_avatar} icon={<UserOutlined />} />
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
      title: "宠物ID",
      dataIndex: "pet_id",
      key: "pet_id",
      width: 88,
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
    // {
    //   title: "操作",
    //   key: "action",
    //   render: (_, record) =>
    //     record.status === 0 ? (
    //       <Space>
    //         <Button
    //           type="primary"
    //           size="small"
    //           icon={<CheckCircleOutlined />}
    //           onClick={() => openAuditModal(record.apply_id, 1)}
    //           className="btn-primary"
    //         >
    //           通过
    //         </Button>
    //         <Button
    //           danger
    //           size="small"
    //           icon={<CloseCircleOutlined />}
    //           onClick={() => openAuditModal(record.apply_id, 2)}
    //         >
    //           拒绝
    //         </Button>
    //       </Space>
    //     ) : (
    //       <Text type="secondary" style={{ fontSize: 13 }}>
    //         {record.review_message || "-"}
    //       </Text>
    //     ),
    // },
  ];

  const filterList: SearchFilterItem[] = [
    {
      field: "status",
      component: (
        <Select
          allowClear
          placeholder="全部状态"
          prefix={<span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>状态</span>}
          options={[
            { label: "待审核", value: 0 },
            { label: "已通过", value: 1 },
            { label: "已拒绝", value: 2 },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="admin-layout-stack">
      <SearchFilterCard
        form={searchForm}
        onSearch={() => {
          void searchForm.submit();
        }}
        onReset={handleReset}
        filterList={filterList}
        marginBottom={16}
      />

      <Modal
        title={
          auditTarget?.status === 1 ? "确认通过申请？" : "确认拒绝申请？"
        }
        open={auditModalOpen}
        className="fancy-modal"
        okText="提交审核"
        cancelText="取消"
        confirmLoading={auditSubmitting}
        centered
        onCancel={() => {
          setAuditModalOpen(false);
          setAuditTarget(null);
        }}
        onOk={handleAuditSubmit}
        destroyOnHidden
        styles={{
          root: { borderRadius: 16, overflow: "hidden" },
          header: { borderRadius: "16px 16px 0 0" },
        }}
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

      <div className="admin-table-shell admin-table-wrap">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="apply_id"
          loading={loading}
          size="middle"
          scroll={{ x: 1040 }}
          pagination={{
            current: pageNum,
            pageSize: pageSize,
            total: total,
            onChange: (page, size) => {
              setPageNum(page);
              setPageSize(size);
            },
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (n) => <Text type="secondary">共 {n} 条</Text>,
          }}
        />
      </div>
    </div>
  );
}
