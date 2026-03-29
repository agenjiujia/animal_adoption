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
  const [statusPet, setStatusPet] = useState<PetRow | null>(null);
  const [histPet, setHistPet] = useState<PetRow | null>(null);
  const [histRows, setHistRows] = useState<HistoryRow[]>([]);
  const [histLoading, setHistLoading] = useState(false);

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
            formData.status === "" || formData.status === undefined || formData.status === null
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

  const applyStatus = async (st: number) => {
    if (!statusPet) return;
    try {
      await request.patch(`/api/admin/pets/${statusPet.pet_id}/status`, {
        status: st,
      });
      message.success("已更新");
      setStatusPet(null);
      submit();
    } catch {
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
      width: 200,
      render: (_, row) => (
        <Space wrap>
          <Button type="link" size="small" onClick={() => setStatusPet(row)}>
            改状态
          </Button>
          <Button type="link" size="small" onClick={() => openHist(row)}>
            修改历史
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        状态变更写入 pet_history，operate_type = STATUS_CHANGE。
      </Text>
      <Form form={form} layout="inline" onFinish={submit} style={{ marginBottom: 16 }}>
        <Form.Item name="name" label="名称">
          <Input allowClear placeholder="模糊" style={{ width: 130 }} />
        </Form.Item>
        <Form.Item name="species" label="种类">
          <Input allowClear style={{ width: 110 }} />
        </Form.Item>
        <Form.Item name="user_id" label="发布者ID">
          <Input allowClear style={{ width: 100 }} />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select
            allowClear
            placeholder="全部"
            style={{ width: 120 }}
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

      <Table<PetRow> rowKey="pet_id" columns={columns} {...tableProps} scroll={{ x: 880 }} />

      <Modal
        title={statusPet ? `修改状态 — ${statusPet.name}` : ""}
        open={!!statusPet}
        onCancel={() => setStatusPet(null)}
        footer={null}
        destroyOnHidden
      >
        <Space wrap>
          <Button onClick={() => applyStatus(PetStatusEnum.ForAdoption)}>待领养</Button>
          <Button onClick={() => applyStatus(PetStatusEnum.Adopted)}>已领养</Button>
          <Button onClick={() => applyStatus(PetStatusEnum.Offline)}>下架</Button>
        </Space>
      </Modal>

      <Modal
        title={histPet ? `修改历史 — ${histPet.name}` : ""}
        open={!!histPet}
        onCancel={() => setHistPet(null)}
        width={700}
        footer={null}
        destroyOnHidden
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
                <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
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
