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
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAntdTable } from "ahooks";
import { request } from "@/utils/request";
import { PetStatusEnum, PetOperateTypeEnum } from "@/types";
import { PetOperateTypeMap } from "@/constant";

const { Text } = Typography;

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
            <Button
              style={{ padding: 0 }}
              type="link"
              loading={
                loading && statusPet.status === PetStatusEnum.ForAdoption
              }
              onClick={() => applyStatus(PetStatusEnum.ForAdoption, row.pet_id)}
            >
              待领养
            </Button>
            <Button
              style={{ padding: 0 }}
              type="link"
              loading={loading && statusPet.status === PetStatusEnum.Adopted}
              onClick={() => applyStatus(PetStatusEnum.Adopted, row.pet_id)}
            >
              已领养
            </Button>
            <Button
              style={{ padding: 0 }}
              type="link"
              loading={loading && statusPet.status === PetStatusEnum.Offline}
              onClick={() => applyStatus(PetStatusEnum.Offline, row.pet_id)}
            >
              下架
            </Button>
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
    <div style={{ paddingTop: 16 }}>
      <Form
        form={form}
        layout="inline"
        onFinish={submit}
        style={{
          marginBottom: 16,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        <Form.Item name="name" label="名称">
          <Input allowClear placeholder="模糊" />
        </Form.Item>
        <Form.Item name="species" label="种类">
          <Input allowClear />
        </Form.Item>
        <Form.Item name="user_id" label="发布者ID">
          <Input allowClear />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select
            allowClear
            placeholder="全部"
            options={[
              { label: "待领养", value: PetStatusEnum.ForAdoption },
              { label: "已领养", value: PetStatusEnum.Adopted },
              { label: "下架", value: PetStatusEnum.Offline },
            ]}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button onClick={reset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table<PetRow>
        rowKey="pet_id"
        columns={columns}
        {...tableProps}
        scroll={{ x: 880 }}
        pagination={{
          ...tableProps.pagination,
          showQuickJumper: true,
          showSizeChanger: true,
          showTotal: (total) => <Text type="secondary">共 {total} 条</Text>,
        }}
      />

      <Modal
        title={histPet ? `修改历史 — ${histPet.name}` : ""}
        open={!!histPet}
        onCancel={() => setHistPet(null)}
        width={700}
        footer={null}
        destroyOnHidden
        centered
      >
        <Table<HistoryRow>
          loading={histLoading}
          rowKey="id"
          size="small"
          dataSource={histRows}
          pagination={false}
          columns={[
            { title: "时间", dataIndex: "operate_time", width: 170 },
            {
              title: "类型",
              dataIndex: "operate_type",
              width: 120,
              render: (t: string) =>
                PetOperateTypeMap[t as PetOperateTypeEnum] ?? t,
            },
            { title: "操作人", dataIndex: "operator_id", width: 80 },
            {
              title: "new_data",
              render: (_, r) => (
                <pre
                  style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}
                >
                  {JSON.stringify(r.new_data, null, 2)}
                </pre>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}
