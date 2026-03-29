"use client";

import { useState, useEffect } from "react";
import { Table, Tag, Button, Space, Modal, Input, message, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Title } = Typography;
const { TextArea } = Input;

interface AdoptionApplication {
  app_id: number;
  pet_id: number;
  pet_name: string;
  user_id: number;
  applicant_name: string;
  applicant_real_name: string;
  applicant_phone: string;
  reason: string;
  status: number;
  apply_time: string;
  audit_time: string;
  audit_remark: string;
}

export default function AdminAdoptionsPage() {
  const [data, setData] = useState<AdoptionApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchData = async (page = pageNum, size = pageSize) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/adoption/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageNum: page, pageSize: size }),
      });
      const json = await res.json();
      if (json.businessCode === 0) {
        setData(json.data.list);
        setTotal(json.data.total);
      } else {
        message.error(json.message || "获取列表失败");
      }
    } catch (error) {
      message.error("网络请求失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pageNum, pageSize]);

  const handleAudit = (app_id: number, status: number) => {
    let remark = "";
    Modal.confirm({
      title: status === 1 ? "确认通过申请？" : "确认拒绝申请？",
      content: (
        <div style={{ marginTop: 16 }}>
          <p>备注信息（可选）：</p>
          <TextArea
            rows={4}
            placeholder="请输入备注..."
            onChange={(e) => (remark = e.target.value)}
          />
        </div>
      ),
      onOk: async () => {
        try {
          const res = await fetch("/api/admin/adoption/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ app_id, status, audit_remark: remark }),
          });
          const json = await res.json();
          if (json.businessCode === 0) {
            message.success("操作成功");
            fetchData();
          } else {
            message.error(json.message || "操作失败");
          }
        } catch (error) {
          message.error("网络请求失败");
        }
      },
    });
  };

  const getStatusTag = (status: number) => {
    switch (status) {
      case 0: return <Tag color="processing">待审核</Tag>;
      case 1: return <Tag color="success">通过</Tag>;
      case 2: return <Tag color="error">已拒绝</Tag>;
      case 3: return <Tag color="gold">已领养</Tag>;
      default: return <Tag>未知</Tag>;
    }
  };

  const columns: ColumnsType<AdoptionApplication> = [
    {
      title: "ID",
      dataIndex: "app_id",
      key: "app_id",
      width: 60,
    },
    {
      title: "宠物信息",
      key: "pet",
      render: (_, record) => (
        <div>
          <div>{record.pet_name}</div>
          <div style={{ fontSize: "12px", color: "#999" }}>ID: {record.pet_id}</div>
        </div>
      ),
    },
    {
      title: "申请人",
      key: "applicant",
      render: (_, record) => (
        <div>
          <div>{record.applicant_real_name || record.applicant_name}</div>
          <div style={{ fontSize: "12px", color: "#999" }}>{record.applicant_phone}</div>
        </div>
      ),
    },
    {
      title: "申请理由",
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
    },
    {
      title: "申请时间",
      dataIndex: "apply_time",
      key: "apply_time",
      render: (time) => dayjs(time).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          {record.status === 0 && (
            <>
              <Button type="link" onClick={() => handleAudit(record.app_id, 1)}>
                通过
              </Button>
              <Button type="link" danger onClick={() => handleAudit(record.app_id, 2)}>
                拒绝
              </Button>
            </>
          )}
          {record.status !== 0 && (
            <Button type="link" onClick={() => {
              Modal.info({
                title: "审批详情",
                content: (
                  <div>
                    <p><b>审核时间：</b>{record.audit_time ? dayjs(record.audit_time).format("YYYY-MM-DD HH:mm") : "-"}</p>
                    <p><b>审核备注：</b>{record.audit_remark || "无"}</p>
                  </div>
                ),
              });
            }}>
              详情
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Title level={4} style={{ marginBottom: "24px" }}>领养申请审批管理</Title>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="app_id"
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
    </div>
  );
}
