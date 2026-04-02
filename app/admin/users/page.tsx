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
  Descriptions,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAntdTable } from "ahooks";
import { request } from "@/utils/request";
import { UserRoleEnum, UserStatusEnum } from "@/types";
import { UserRoleMap, UserStatusMap } from "@/constant";
import SearchFilterCard, {
  type SearchFilterItem,
} from "@/app/_components/SearchFilterCard";
import { formatDateTime } from "@/lib/formatDate";

const { Text } = Typography;

type UserRow = {
  user_id: number;
  username: string;
  email: string;
  phone: string;
  role: number;
  status: number;
  real_name?: string;
  id_card?: string;
  address?: string;
  create_time: string;
  update_time?: string;
};

export default function AdminUsersPage() {
  const [form] = Form.useForm();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<UserRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchList = useCallback(
    async (
      { current, pageSize }: { current: number; pageSize: number },
      formData: Record<string, unknown>
    ) => {
      const res = await request.post<{ list: UserRow[]; total: number }>(
        "/api/admin/users",
        {
          pageNum: current,
          pageSize,
          username: formData.username || undefined,
          phone: formData.phone || undefined,
          role:
            formData.role === "" || formData.role === undefined
              ? undefined
              : formData.role,
          status:
            formData.status === "" || formData.status === undefined
              ? undefined
              : formData.status,
        }
      );
      const d = res.data as { list: UserRow[]; total: number } | undefined;
      return { list: d?.list ?? [], total: d?.total ?? 0 };
    },
    []
  );

  const { tableProps, search } = useAntdTable(fetchList, {
    defaultPageSize: 10,
    form,
  });
  const { submit, reset } = search;

  const loadDetail = async (id: number) => {
    setDetailId(id);
    setDetailLoading(true);
    try {
      const res = await request.get<UserRow>(`/api/admin/users/${id}`);
      setDetail((res.data as UserRow) ?? null);
    } catch {
      message.error("加载失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const toggle = (row: UserRow) => {
    const next =
      row.status === UserStatusEnum.Normal
        ? UserStatusEnum.Disabled
        : UserStatusEnum.Normal;
    const verb = next === UserStatusEnum.Normal ? "启用" : "禁用";
    Modal.confirm({
      centered: true,
      title: `确认${verb}用户 ${row.username}？`,
      onOk: async () => {
        await request.patch(`/api/admin/users/${row.user_id}/status`, {
          status: next,
        });
        message.success(`已${verb}`);
        submit();
      },
    });
  };

  const columns: ColumnsType<UserRow> = [
    { title: "ID", dataIndex: "user_id", width: 72 },
    { title: "用户名", dataIndex: "username" },
    { title: "手机", dataIndex: "phone", width: 120 },
    {
      title: "角色",
      dataIndex: "role",
      width: 100,
      render: (r: number) => UserRoleMap[r as UserRoleEnum]?.label ?? r,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 88,
      render: (s: number) => (
        <Tag
          color={s === UserStatusEnum.Normal ? "green" : "red"}
          bordered={false}
          style={{ borderRadius: 8 }}
        >
          {UserStatusMap[s as UserStatusEnum]?.label}
        </Tag>
      ),
    },
    {
      title: "注册时间",
      dataIndex: "create_time",
      width: 178,
      render: (t: string) => formatDateTime(t),
    },
    {
      title: "操作",
      key: "op",
      width: 180,
      render: (_, row) => (
        <Space wrap>
          <Button
            type="link"
            size="small"
            onClick={() => loadDetail(row.user_id)}
          >
            详情
          </Button>
          <Button type="link" size="small" onClick={() => toggle(row)}>
            {row.status === UserStatusEnum.Normal ? "禁用" : "启用"}
          </Button>
        </Space>
      ),
    },
  ];

  const filterList: SearchFilterItem[] = [
    {
      field: "username",
      component: (
        <Input
          allowClear
          placeholder="用户名"
          prefix={<span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>用户名</span>}
        />
      ),
      span: 4,
    },
    {
      field: "phone",
      component: (
        <Input
          allowClear
          placeholder="手机号"
          prefix={<span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>手机</span>}
        />
      ),
      span: 4,
    },
    {
      field: "role",
      component: (
        <Select
          allowClear
          placeholder="角色"
          prefix={<span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>角色</span>}
          options={[
            { label: "普通用户", value: UserRoleEnum.OrdinaryAdopter },
            { label: "管理员", value: UserRoleEnum.Admin },
          ]}
        />
      ),
      span: 4,
    },
    {
      field: "status",
      component: (
        <Select
          allowClear
          placeholder="状态"
          prefix={<span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>状态</span>}
          options={[
            { label: "禁用", value: UserStatusEnum.Disabled },
            { label: "正常", value: UserStatusEnum.Normal },
          ]}
        />
      ),
      span: 4,
    },
  ];

  return (
    <div className="admin-layout-stack">
      <SearchFilterCard
        form={form}
        onSearch={submit}
        onReset={reset}
        filterList={filterList}
        actionSpan={4}
        marginBottom={16}
      />

      <div className="admin-table-shell admin-table-wrap">
        <Table<UserRow>
          rowKey="user_id"
          columns={columns}
          {...tableProps}
          size="middle"
          pagination={{
            ...tableProps.pagination,
            showQuickJumper: true,
            showSizeChanger: true,
            showTotal: (total) => <Text type="secondary">共 {total} 条</Text>,
          }}
          scroll={{ x: 960 }}
        />
      </div>

      <Modal
        title="用户详情"
        open={detailId !== null}
        onCancel={() => {
          setDetailId(null);
          setDetail(null);
        }}
        footer={null}
        width={640}
        destroyOnHidden
        centered
        styles={{
          root: { borderRadius: 16, overflow: "hidden" },
          header: { borderRadius: "16px 16px 0 0" },
        }}
      >
        {detailLoading ? (
          <div style={{ padding: 24, textAlign: "center" }}>加载中…</div>
        ) : detail ? (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="用户ID">
              {detail.user_id}
            </Descriptions.Item>
            <Descriptions.Item label="用户名">
              {detail.username}
            </Descriptions.Item>
            <Descriptions.Item label="手机">{detail.phone}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{detail.email}</Descriptions.Item>
            <Descriptions.Item label="真实姓名">
              {detail.real_name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="证件号">
              {detail.id_card || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="地址">
              {detail.address || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="角色">
              {UserRoleMap[detail.role as UserRoleEnum]?.label}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {UserStatusMap[detail.status as UserStatusEnum]?.label}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {formatDateTime(detail.create_time)}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {formatDateTime(detail.update_time)}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>
    </div>
  );
}
