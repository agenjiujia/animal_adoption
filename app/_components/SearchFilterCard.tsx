"use client";

import { Button, Col, Form, Row, Space } from "antd";
import type { FormInstance } from "antd/es/form";
import type { FormItemProps } from "antd/es/form";
import type { ReactNode } from "react";

export type SearchFilterItem = {
  field: string;
  component: ReactNode;
  span?: number;
  formItemProps?: Omit<FormItemProps, "name" | "children">;
};

type SearchFilterCardProps = {
  form: FormInstance;
  onSearch: () => void;
  onReset: () => void;
  filterList: SearchFilterItem[];
  actionSpan?: number;
  marginBottom?: number;
};

export default function SearchFilterCard({
  form,
  onSearch,
  onReset,
  filterList,
  actionSpan = 6,
  marginBottom = 24,
}: SearchFilterCardProps) {
  return (
    <div className="modern-card" style={{ padding: "16px 16px 0", marginBottom }}>
      <Form form={form} layout="vertical" onFinish={onSearch}>
        <Row gutter={16}>
          {filterList.map((item) => (
            <Col span={item.span ?? 6} key={item.field}>
              <Form.Item name={item.field} {...item.formItemProps} style={{marginBottom:16}}>
                {item.component}
              </Form.Item>
            </Col>
          ))}
          <Col span={actionSpan}>
              <Space>
                <Button type="primary" htmlType="submit" className="btn-primary">
                  查询
                </Button>
                <Button onClick={onReset}>重置</Button>
              </Space>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
