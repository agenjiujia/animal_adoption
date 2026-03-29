"use client";

import { useRequest } from "ahooks";
import { Card, Descriptions, Spin, Typography } from "antd";
import { request } from "@/utils/request";
import { UserRoleMap, UserStatusMap } from "@/constant";
import { UserRoleEnum, UserStatusEnum } from "@/types";
import dayjs from "dayjs";

const { Title } = Typography;

type Me = {
  user_id: number;
  username: string;
  email: string;
  phone: string;
  avatar?: string;
  real_name?: string;
  id_card?: string;
  address?: string;
  role: number;
  status: number;
  create_time: string;
  update_time?: string;
};

/** 个人中心：仅展示当前登录用户自身资料 */
export default function ProfilePage() {
  const { data, loading } = useRequest(() => request.get<Me>("/api/user/me"));

  const u = data?.data as Me | undefined;

  return (
    <Card
      title={
        <Title level={4} style={{ marginTop: 0, marginBottom: 0 }}>
          个人中心
        </Title>
      }
    >
      <Spin spinning={loading}>
        {u && (
          <Descriptions bordered column={1} size="middle">
            <Descriptions.Item label="用户名">{u.username}</Descriptions.Item>
            <Descriptions.Item label="手机">{u.phone}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{u.email}</Descriptions.Item>
            <Descriptions.Item label="真实姓名">
              {u.real_name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="证件号">
              {u.id_card || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="地址">
              {u.address || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="角色">
              {UserRoleMap[u.role as UserRoleEnum]?.label}
            </Descriptions.Item>
            <Descriptions.Item label="账号状态">
              {UserStatusMap[u.status as UserStatusEnum]?.label}
            </Descriptions.Item>
            <Descriptions.Item label="注册时间">
              {dayjs(u.create_time).format("YYYY-MM-DD HH:mm:ss")}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {dayjs(u.update_time).format("YYYY-MM-DD HH:mm:ss")}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Spin>
    </Card>
  );
}
