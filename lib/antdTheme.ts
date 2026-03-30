// lib/antdTheme.ts
import type { ThemeConfig } from "antd";

/**
 * 萌宠之家 - 4.0 温暖治愈与现代简约视觉规范
 * 设计理念：温暖、信任、清晰、灵动
 * 核心色：Indigo (#4F46E5) - 专业与信任
 * 辅助色：Rose (#F43F5E) - 爱心与关怀
 */
const theme: ThemeConfig = {
  token: {
    colorPrimary: "#4F46E5",
    colorInfo: "#4F46E5",
    colorSuccess: "#10B981",
    colorWarning: "#F59E0B",
    colorError: "#EF4444",

    colorTextBase: "#1E293B",
    colorTextHeading: "#0F172A",
    colorBgLayout: "#F8FAFC",
    colorBgContainer: "#FFFFFF",
    colorBorder: "#E2E8F0",
    colorBorderSecondary: "#F1F5F9",

    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    borderRadius: 12, // 温暖圆润的风格
    lineHeight: 1.6,
  },
  components: {
    Button: {
      borderRadius: 10,
      fontWeight: 600,
      controlHeight: 40,
      paddingContentHorizontal: 20,
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    },
    Card: {
      borderRadiusLG: 16,
      paddingLG: 24,
      colorBorderSecondary: "#F1F5F9",
    },
    Input: {
      borderRadius: 10,
      controlHeight: 40,
      colorBorder: "#E2E8F0",
      activeShadow: "0 0 0 2px rgba(79, 70, 229, 0.1)",
    },
    Select: {
      borderRadius: 10,
      controlHeight: 40,
    },
    Tag: {
      borderRadiusSM: 6,
      fontSize: 12,
      fontWeightStrong: 500,
    },
    Table: {
      headerBg: "#F8FAFC",
      headerColor: "#475569",
      headerBorderRadius: 8,
      rowHoverBg: "#F1F5F9",
    },
    Tabs: {
      colorPrimary: "#4F46E5",
      itemSelectedColor: "#4F46E5",
      titleFontSize: 15,
      horizontalItemPadding: "8px 16px",
    },
    Menu: {
      itemSelectedBg: "rgba(79, 70, 229, 0.08)",
      itemSelectedColor: "#4F46E5",
      borderRadius: 8,
    },
  },
};

export default theme;
