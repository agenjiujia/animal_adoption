"use client";

import { useEffect, useState } from "react";
import { useRequest } from "ahooks";
import { useRouter } from "next/navigation";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Table,
  Pagination,
  Space,
  Typography,
  Card,
  Modal,
  Spin,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { FormProps } from "antd";
import { request } from "@/utils/request";
import {
  PetGenderOptions,
  PetVaccineStatusOptions,
  PetNeuteredOptions,
  PetSpeciesOptions,
} from "@/constant";
import { PetStatusEnum } from "@/types"; // ✅ 已删除 UserRoleEnum 导入

const { Title, Text } = Typography;

interface PetItem {
  pet_id: number;
  user_id: number;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  gender: number;
  weight?: number;
  vaccine_status: number;
  neutered: number;
  status: number;
  create_time: string;
  update_time: string;
}

interface QueryParams {
  pet_id?: number;
  name?: string;
  species?: string;
  gender?: number;
  status?: number;
  vaccine_status?: number;
  neutered?: number;
  pageNum: number;
  pageSize: number;
}

export default function PublishPet() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // ✅ 核心改动：仅保留 currentUserId，删除 isAdmin 相关逻辑
  useEffect(() => {
    try {
      const raw = localStorage.getItem("userInfo");
      if (raw) {
        const u = JSON.parse(raw) as { user_id?: number };
        setCurrentUserId(u.user_id ?? null);
      }
    } catch {
      setCurrentUserId(null);
    }
  }, []);

  const {
    run: load,
    loading,
    data,
  } = useRequest((p: QueryParams) => request.post("/api/pet/list", p), {
    manual: true,
  });

  useEffect(() => {
    const d = data?.data as
      | { list: PetItem[]; total: number; pageNum: number; pageSize: number }
      | undefined;
    if (d && "total" in d) {
      setTotal(d.total);
      setPageNum(d.pageNum);
      setPageSize(d.pageSize);
    }
  }, [data]);

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    load({ pageNum: 1, pageSize: 10 });
  }, [load]);

  const onSearch: FormProps["onFinish"] = (values) => {
    load({ ...values, pageNum: 1, pageSize });
    setPageNum(1);
  };

  const onReset = () => {
    form.resetFields();
    setPageNum(1);
    setPageSize(10);
    load({ pageNum: 1, pageSize: 10 });
  };

  const onPageChange = (pn: number, ps?: number) => {
    const nextPs = ps ?? pageSize;
    setPageNum(pn);
    setPageSize(nextPs);
    load({ ...form.getFieldsValue(), pageNum: pn, pageSize: nextPs });
  };

  // ✅ 核心改动：删除管理员删除权限，仅自己的记录可删除
  const remove = (record: PetItem) => {
    const can = currentUserId !== null && record.user_id === currentUserId;
    if (!can) return;
    Modal.confirm({
      title: "确认删除该宠物发布单？",
      onOk: async () => {
        await request.delete(`/api/pet/${record.pet_id}`);
        load({ ...form.getFieldsValue(), pageNum, pageSize });
      },
    });
  };

  const list = (data?.data as { list?: PetItem[] })?.list ?? [];

  // ✅ 核心改动：删除管理员专属的「发布者」列
  const columns: ColumnsType<PetItem> = [
    { title: "宠物ID", dataIndex: "pet_id", width: 80 },
    { title: "名称", dataIndex: "name", width: 120 },
    { title: "种类", dataIndex: "species", width: 100 },
    {
      title: "性别",
      dataIndex: "gender",
      width: 72,
      render: (g) => PetGenderOptions.find((o) => o.value === g)?.label ?? "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 88,
      render: (s) => {
        const opts = [
          { l: "待领养", v: PetStatusEnum.ForAdoption },
          { l: "已领养", v: PetStatusEnum.Adopted },
          { l: "下架", v: PetStatusEnum.Offline },
        ];
        return opts.find((o) => o.v === s)?.l ?? "-";
      },
    },
    { title: "更新时间", dataIndex: "update_time", width: 170 },
    {
      title: "操作",
      key: "op",
      width: 180,
      fixed: "right",
      render: (_, row) => {
        const owner = currentUserId !== null && row.user_id === currentUserId;
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              onClick={() => router.push(`/pet/detail/?pet_id=${row.pet_id}`)}
            >
              详情
            </Button>
            {owner ? (
              <Button
                type="link"
                size="small"
                onClick={() => router.push(`/pet/edit/?pet_id=${row.pet_id}`)}
              >
                编辑
              </Button>
            ) : null}
            {owner ? (
              <Button
                type="link"
                size="small"
                danger
                onClick={() => remove(row)}
              >
                删除
              </Button>
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      title={
        <Title level={4} style={{ marginBottom: 0 }}>
          宠物发布单
        </Title>
      }
    >
      <Form
        form={form}
        layout="inline"
        onFinish={onSearch}
        style={{
          marginBottom: 16,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
        labelCol={{ span: 4 }}
      >
        <Form.Item name="pet_id" label="宠物ID">
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>
        {/* ✅ 已删除：管理员专属的「发布者ID」表单项 */}
        <Form.Item name="name" label="名称">
          <Input allowClear />
        </Form.Item>
        <Form.Item name="species" label="种类">
          <Select allowClear options={PetSpeciesOptions} />
        </Form.Item>
        <Form.Item name="gender" label="性别">
          <Select allowClear options={PetGenderOptions} />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select
            allowClear
            options={[
              { label: "待领养", value: PetStatusEnum.ForAdoption },
              { label: "已领养", value: PetStatusEnum.Adopted },
              { label: "下架", value: PetStatusEnum.Offline },
            ]}
          />
        </Form.Item>
        <Form.Item name="vaccine_status" label="疫苗">
          <Select allowClear options={PetVaccineStatusOptions} />
        </Form.Item>
        <Form.Item name="neutered" label="绝育">
          <Select allowClear options={PetNeuteredOptions} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              查询
            </Button>
            <Button onClick={onReset}>重置</Button>
            <Button onClick={() => router.push("/pet/new")}>发布宠物</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        loading={loading}
        rowKey="pet_id"
        columns={columns}
        dataSource={list}
        pagination={{
          current: pageNum,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t) => <Text type="secondary">共 {t} 条</Text>,
          onChange: onPageChange,
          onShowSizeChange: (c, s) => onPageChange(c, s),
        }}
        scroll={{ x: 1100 }}
      />
    </Card>
  );
}
