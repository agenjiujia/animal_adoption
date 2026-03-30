"use client";

import { useCallback, useState } from "react";
import {
  Table,
  Button,
  Space,
  Form,
  Input,
  Select,
  Modal,
  message,
  Typography,
  Tag,
  Row,
  Col,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAntdTable } from "ahooks";
import { request } from "@/utils/request";
import { PetStatusEnum, PetOperateTypeEnum } from "@/types";
import { PetOperateTypeMap } from "@/constant";
import { motion } from "framer-motion";
import { ArrowRightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text, Title } = Typography;

type PetRow = {
  pet_id: number;
  user_id: number;
  name: string;
  species: string;
  breed?: string;
  status: number;
  update_time: string;
};

type HistoryRow = {
  id: number;
  operate_type: string;
  operate_time: string;
  operator_id: number;
  new_data: Record<string, unknown>;
};

const statusTag: Record<number, { text: string; color: string }> = {
  [PetStatusEnum.ForAdoption]: { text: "待领养", color: "blue" },
  [PetStatusEnum.Adopted]: { text: "已领养", color: "green" },
  [PetStatusEnum.Offline]: { text: "下架", color: "orange" },
};

export default function AdminPetsPage() {
  const [form] = Form.useForm();
  const [statusPet, setStatusPet] = useState<{
    rowId?: PetRow["pet_id"];
    status?: PetStatusEnum;
  }>({});
  const [histPet, setHistPet] = useState<PetRow | null>(null);
  const [histRows, setHistRows] = useState<HistoryRow[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  const fetchList = useCallback(
    async (
      { current, pageSize }: { current: number; pageSize: number },
      formData: Record<string, unknown>
    ) => {
      const res = await request.post<{ list: PetRow[]; total: number }>(
        "/api/admin/pets",
        {
          pageNum: current,
          pageSize,
          name: formData.name || undefined,
          species: formData.species || undefined,
          user_id: formData.user_id || undefined,
          status:
            formData.status === "" ||
            formData.status === undefined ||
            formData.status === null
              ? undefined
              : formData.status,
        }
      );
      const d = res.data as { list: PetRow[]; total: number } | undefined;
      return { list: d?.list ?? [], total: d?.total ?? 0 };
    },
    []
  );

  const { tableProps, search } = useAntdTable(fetchList, {
    defaultPageSize: 10,
    form,
  });
  const { submit, reset } = search;

  const openHist = async (row: PetRow) => {
    setHistPet(row);
    setHistLoading(true);
    try {
      const res = await request.get<{ list: HistoryRow[] }>(
        `/api/admin/pets/${row.pet_id}/history?pageNum=1&pageSize=50`
      );
      const d = res.data as { list: HistoryRow[] } | undefined;
      setHistRows(d?.list ?? []);
    } catch {
      message.error("加载历史失败");
    } finally {
      setHistLoading(false);
    }
  };

  const applyStatus = async (status: number, rowId: PetRow["pet_id"]) => {
    setUpdateLoading(true);
    setStatusPet({ status, rowId });
    try {
      await request.patch(`/api/admin/pets/${rowId}/status`, {
        status,
      });
      message.success("已更新");
      setStatusPet({});
      setUpdateLoading(false);
      submit();
    } catch {
      setStatusPet({});
      setUpdateLoading(false);
      /* request 已 toast */
    }
  };

  const columns: ColumnsType<PetRow> = [
    { title: "ID", dataIndex: "pet_id", width: 70 },
    { title: "发布者", dataIndex: "user_id", width: 80 },
    { title: "名称", dataIndex: "name" },
    { title: "种类", dataIndex: "species", width: 100 },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: number) => {
        const m = statusTag[s] ?? { text: String(s), color: "default" };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    { title: "更新时间", dataIndex: "update_time", width: 170 },
    {
      title: "操作",
      key: "op",
      width: 240,
      render: (_, row) => {
        const loading = updateLoading && statusPet.rowId === row.pet_id;
        return (
          <Space wrap>
            {row?.status !== PetStatusEnum.Offline && (
              <Button
                style={{ padding: 0 }}
                type="link"
                loading={loading && statusPet.status === PetStatusEnum.Offline}
                onClick={() => applyStatus(PetStatusEnum.Offline, row.pet_id)}
              >
                下架
              </Button>
            )}
            <Button
              style={{ padding: 0 }}
              type="link"
              size="small"
              onClick={() => openHist(row)}
            >
              修改历史
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: "32px" }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ marginBottom: 32 }}>
          <Title style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            宠物档案管理
          </Title>
          <Text type="secondary">
            管理全站宠物的上下架状态、修改历史与基本信息
          </Text>
        </div>

        <div className="modern-card" style={{ padding: 24, marginBottom: 32 }}>
          <Form form={form} onFinish={submit} layout="vertical">
            <Row gutter={24}>
              <Col span={6}>
                <Form.Item name="name" label="宠物名称">
                  <Input allowClear placeholder="输入名称搜索" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="species" label="宠物种类">
                  <Input allowClear placeholder="如：猫、狗" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="status" label="当前状态">
                  <Select
                    allowClear
                    placeholder="全部状态"
                    options={[
                      { label: "待领养", value: PetStatusEnum.ForAdoption },
                      { label: "已领养", value: PetStatusEnum.Adopted },
                      { label: "下架", value: PetStatusEnum.Offline },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label=" ">
                  <Space>
                    <Button
                      type="primary"
                      className="btn-primary"
                      onClick={submit}
                      icon={<ArrowRightOutlined />}
                    >
                      查询
                    </Button>
                    <Button onClick={reset}>重置</Button>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>

        <div className="modern-card" style={{ padding: 0, overflow: "hidden" }}>
          <Table<PetRow>
            rowKey="pet_id"
            columns={columns}
            {...tableProps}
            scroll={{ x: 880 }}
            pagination={{
              ...tableProps.pagination,
              showQuickJumper: true,
              showSizeChanger: true,
              showTotal: (total) => (
                <Text type="secondary" style={{ marginLeft: 16 }}>
                  共 {total} 条记录
                </Text>
              ),
            }}
          />
        </div>
      </motion.div>

      <Modal
        title={
          <Title level={4} style={{ margin: 0 }}>
            修改历史 — {histPet?.name}
          </Title>
        }
        open={!!histPet}
        onCancel={() => setHistPet(null)}
        width={800}
        footer={null}
        destroyOnClose
        centered
        style={{ borderRadius: 24 }}
      >
        <Table<HistoryRow>
          loading={histLoading}
          rowKey="id"
          size="middle"
          dataSource={histRows}
          pagination={false}
          columns={[
            {
              title: "时间",
              dataIndex: "operate_time",
              width: 180,
              render: (t) => dayjs(t).format("YYYY-MM-DD HH:mm:ss"),
            },
            {
              title: "操作类型",
              dataIndex: "operate_type",
              width: 120,
              render: (t: number) => (
                <Tag
                  color="processing"
                  bordered={false}
                  style={{ borderRadius: 4 }}
                >
                  {PetOperateTypeMap[t as PetOperateTypeEnum] ?? t}
                </Tag>
              ),
            },
            { title: "操作人 ID", dataIndex: "operator_id", width: 100 },
            {
              title: "变更数据",
              render: (_, r) => (
                <div
                  style={{
                    background: "var(--bg-main)",
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <pre
                    style={{
                      margin: 0,
                      fontSize: 12,
                      whiteSpace: "pre-wrap",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {JSON.stringify(r.new_data, null, 2)}
                  </pre>
                </div>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}
