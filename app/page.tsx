"use client";

import { useState } from "react";
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
  message,
  Spin,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { FormProps } from "antd";
import { request } from "@/utils/request";
import {
  PetGenderOptions,
  PetVaccineStatusOptions,
  PetNeuteredOptions,
  PetSpeciesOptions,
} from "@/constant";
import { PetStatusEnum } from "@/types";

const { Title, Text } = Typography;

// 1. 类型定义（贴合你的创建页风格）
interface PetItem {
  pet_id: number;
  user_id: number;
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
  status: number;
  create_time: string;
  update_time: string;
}

interface QueryParams {
  pet_id?: number;
  user_id?: number;
  name?: string;
  species?: string;
  breed?: string;
  age?: number;
  gender?: number;
  weight?: number;
  vaccine_status?: number;
  neutered?: number;
  status?: number;
  pageNum: number;
  pageSize: number;
}

interface PaginationResult {
  pageNum: number;
  pageSize: number;
  total: number;
}

interface PetListResponse {
  list: PetItem[];
  pagination: PaginationResult;
}

export default function PetList() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState<PaginationResult>({
    pageNum: 1,
    pageSize: 10,
    total: 0,
  });

  // 2. 列表查询请求（复用你的request工具 + ahooks useRequest）
  const {
    run: fetchPetList,
    loading,
    data,
  } = useRequest((params: QueryParams) =>
    request.post("/api/pet/list", params || {})
  );

  // 4. 表单查询/重置处理（贴合你的创建页逻辑）
  const handleSearch: FormProps["onFinish"] = (values) => {
    const queryParams: QueryParams = {
      ...values,
      pageNum: 1,
      pageSize: 10,
    };
    setPagination((prev) => ({ ...prev, pageNum: 1 }));
    fetchPetList(queryParams);
  };

  const handleReset = () => {
    form.resetFields();
    setPagination({ pageNum: 1, pageSize: 10, total: 0 });
    // 重置后清空数据（可选）
    fetchPetList({
      pageNum: 1,
      pageSize: 10,
    });
  };

  // 5. 分页切换处理
  const handlePageChange = (pageNum: number, pageSize?: number) => {
    const newPagination = {
      ...pagination,
      pageNum,
      ...(pageSize ? { pageSize } : {}),
    };
    setPagination(newPagination);

    // 获取当前表单查询条件
    const formValues = form.getFieldsValue();
    fetchPetList({
      ...formValues,
      pageNum: newPagination.pageNum,
      pageSize: newPagination.pageSize,
    });
  };

  // 6. 表格列定义（复用你的constant枚举选项）
  const columns: ColumnsType<PetItem> = [
    {
      title: "宠物ID",
      dataIndex: "pet_id",
      key: "pet_id",
      width: 80,
    },
    {
      title: "发布者ID",
      dataIndex: "user_id",
      key: "user_id",
      width: 80,
    },
    {
      title: "宠物名称",
      dataIndex: "name",
      key: "name",
      width: 120,
    },
    {
      title: "种类",
      dataIndex: "species",
      key: "species",
      width: 100,
    },
    {
      title: "品种",
      dataIndex: "breed",
      key: "breed",
      width: 120,
      render: (breed) => breed || "-",
    },
    {
      title: "年龄（月）",
      dataIndex: "age",
      key: "age",
      width: 100,
      render: (age) => age || "-",
    },
    {
      title: "性别",
      dataIndex: "gender",
      key: "gender",
      width: 80,
      render: (gender) => {
        const option = PetGenderOptions.find((item) => item.value === gender);
        return option?.label || "-";
      },
    },
    {
      title: "体重（kg）",
      dataIndex: "weight",
      key: "weight",
      width: 100,
      render: (weight) => (weight ? weight : "-"),
    },
    {
      title: "疫苗状态",
      dataIndex: "vaccine_status",
      key: "vaccine_status",
      width: 100,
      render: (status) => {
        const option = PetVaccineStatusOptions.find(
          (item) => item.value === status
        );
        return option?.label || "-";
      },
    },
    {
      title: "绝育状态",
      dataIndex: "neutered",
      key: "neutered",
      width: 100,
      render: (status) => {
        const option = PetNeuteredOptions.find((item) => item.value === status);
        return option?.label || "-";
      },
    },
    {
      title: "领养状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => {
        const statusOptions = [
          { label: "待领养", value: PetStatusEnum.Pending },
          { label: "已领养", value: PetStatusEnum.Adopted },
          { label: "下架", value: PetStatusEnum.Offline },
        ];
        const option = statusOptions.find((item) => item.value === status);
        return option?.label || "-";
      },
    },
    {
      title: "发布时间",
      dataIndex: "create_time",
      key: "create_time",
      width: 180,
    },
    {
      title: "更新时间",
      dataIndex: "update_time",
      key: "update_time",
      width: 180,
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      render: (_: unknown, record: PetItem) => (
        <Space size="small">
          <Button
            type="link"
            onClick={() => router.push(`/pet/detail/?pet_id=${record.pet_id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            onClick={() => router.push(`/pet/edit/?pet_id=${record.pet_id}`)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            onClick={() => handleDelete(record.pet_id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 7. 删除功能（可选扩展）
  const handleDelete = async (petId: number) => {
    try {
      await request.delete(`/api/pet/${petId}`);
      message.success("删除成功");
      handleSearch(form.getFieldsValue()); // 重新查询列表
    } catch (error) {
      message.error("删除失败");
    }
  };

  // 8. 页面渲染（完全匹配你的创建页样式）
  return (
    <div style={{ maxWidth: 1400, margin: "20px auto", padding: "0 20px" }}>
      <Card
        title={<Title level={4}>宠物发布单列表</Title>}
        style={{ boxShadow: "0 2px 12px 0 rgba(0,0,0,0.1)", marginBottom: 16 }}
      >
        {/* 查询表单 */}
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="pet_id" label="宠物ID">
            <InputNumber min={0} style={{ width: 120 }} placeholder="请输入" />
          </Form.Item>
          <Form.Item name="user_id" label="发布者ID">
            <InputNumber min={0} style={{ width: 120 }} placeholder="请输入" />
          </Form.Item>
          <Form.Item name="name" label="宠物名称">
            <Input placeholder="请输入关键词" style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="species" label="种类">
            <Select
              options={PetSpeciesOptions}
              placeholder="请选择"
              style={{ width: 120 }}
              allowClear
            />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select
              options={PetGenderOptions}
              placeholder="请选择"
              style={{ width: 100 }}
              allowClear
            />
          </Form.Item>
          <Form.Item name="status" label="领养状态">
            <Select
              options={[
                { label: "待领养", value: PetStatusEnum.Pending },
                { label: "已领养", value: PetStatusEnum.Adopted },
                { label: "下架", value: PetStatusEnum.Offline },
              ]}
              placeholder="请选择"
              style={{ width: 100 }}
              allowClear
            />
          </Form.Item>
          <Form.Item name="vaccine_status" label="疫苗状态">
            <Select
              options={PetVaccineStatusOptions}
              placeholder="请选择"
              style={{ width: 100 }}
              allowClear
            />
          </Form.Item>
          <Form.Item name="neutered" label="绝育状态">
            <Select
              options={PetNeuteredOptions}
              placeholder="请选择"
              style={{ width: 100 }}
              allowClear
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
              <Button type="default" onClick={() => router.push("/pet/new")}>
                新增发布单
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 列表区域 */}
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={(data?.data as any)?.list || []}
            rowKey="pet_id"
            pagination={false}
            scroll={{ x: "max-content" }}
          />

          {/* 分页控件 */}
          <div style={{ marginTop: 16, textAlign: "right" }}>
            <Pagination
              current={pagination.pageNum}
              pageSize={pagination.pageSize}
              total={pagination.total}
              showSizeChanger
              showQuickJumper
              showTotal={(total) => (
                <Text type="secondary">共 {total} 条记录</Text>
              )}
              onChange={handlePageChange}
              onShowSizeChange={(current, size) =>
                handlePageChange(current, size)
              }
            />
          </div>
        </Spin>
      </Card>
    </div>
  );
}
