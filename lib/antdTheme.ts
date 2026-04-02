// lib/antdTheme.ts
import type { ThemeConfig } from "antd";

/**
 * 萌宠之家 - ui-ux-pro-max 主题规范
 * 柔和奶紫粉主题
 * 核心色：#7C6EE6 / #6D5FDD
 * 辅助色：#F38FB2
 */
const theme: ThemeConfig = {
  token: {
    colorPrimary: "#7C6EE6",
    colorInfo: "#7C6EE6",
    colorLink: "#6D5FDD",
    colorSuccess: "#35BFA6",
    colorWarning: "#F59E0B",
    colorError: "#EF4444",

    colorTextBase: "#0F172A",
    colorTextHeading: "#0F172A",
    colorBgLayout: "#FAF8FF",
    colorBgContainer: "#FFFFFF",
    colorBorder: "#E2E8F0",
    colorBorderSecondary: "#F1F5F9",

    fontFamily:
      '"Nunito Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    borderRadius: 12,
    lineHeight: 1.6,
  },
  components: {
    Button: {
      colorPrimary: "#7C6EE6",
      colorPrimaryHover: "#6D5FDD",
      colorPrimaryActive: "#6D5FDD",
      primaryShadow: "0 8px 18px rgba(124, 110, 230, 0.24)",
      borderRadius: 12,
      fontWeight: 600,
      controlHeight: 40,
      paddingContentHorizontal: 18,
      boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
    },
    Card: {
      borderRadiusLG: 16,
      paddingLG: 20,
      colorBorderSecondary: "#E8EDF8",
    },
    Input: {
      borderRadius: 12,
      controlHeight: 40,
      colorBorder: "#D9E2F0",
      activeBorderColor: "#6D5FDD",
      activeShadow: "0 0 0 2px rgba(109, 95, 221, 0.14)",
    },
    Select: {
      borderRadius: 12,
      controlHeight: 40,
    },
    Tag: {
      borderRadiusSM: 8,
      fontSize: 12,
      fontWeightStrong: 600,
    },
    Table: {
      headerBg: "#F8FAFC",
      headerColor: "#475569",
      headerBorderRadius: 12,
      rowHoverBg: "#F5F8FF",
    },
    Tabs: {
      colorPrimary: "#7C6EE6",
      itemSelectedColor: "#7C6EE6",
      titleFontSize: 15,
      horizontalItemPadding: "8px 16px",
    },
    Menu: {
      itemSelectedBg: "rgba(124, 110, 230, 0.1)",
      itemSelectedColor: "#7C6EE6",
      borderRadius: 10,
    },
  },
};

export default theme;
