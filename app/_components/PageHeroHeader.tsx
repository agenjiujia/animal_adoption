"use client";

import { Typography } from "antd";
import type { ReactNode } from "react";

const { Title, Text } = Typography;

export type PageHeroHeaderProps = {
  title: string;
  subtitle: string;
  action?: ReactNode;
};

/**
 * 与「我的发布」等页统一的渐变顶栏：左标题+副标题，右侧主操作（可选）。
 */
export default function PageHeroHeader({
  title,
  subtitle,
  action,
}: PageHeroHeaderProps) {
  return (
    <div
      className="modern-card"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        padding: "10px 16px",
        background:
          "linear-gradient(90deg, rgba(124, 110, 230, 0.08) 0%, rgba(243, 143, 178, 0.08) 100%)",
        border: "1px solid rgba(124, 110, 230, 0.14)",
      }}
    >
      <div>
        <Title level={2} style={{ margin: 0 }}>
          {title}
        </Title>
        <Text className="page-title-sub">{subtitle}</Text>
      </div>
      {action != null ? action : null}
    </div>
  );
}
