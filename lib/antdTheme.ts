// lib/antdTheme.ts
import type { ThemeConfig } from "antd";

const theme: ThemeConfig = {
  token: {
    // Colors
    colorPrimary: "#2A9D8F",
    colorInfo: "#3B82F6",
    colorSuccess: "#10B981",
    colorWarning: "#F59E0B",
    colorError: "#EF4444",
    colorTextBase: "#334155",
    colorTextHeading: "#0F172A",
    colorBgLayout: "#F8FAFC",
    colorBgContainer: "#FFFFFF",
    colorBorder: "#CBD5E1",

    // Typography
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    borderRadius: 6, // Standard for Buttons/Inputs
    lineHeight: 1.6,

    // Spacing
    controlHeight: 38,
  },
  components: {
    Button: {
      borderRadius: 6,
      fontWeight: 500,
      controlHeight: 38,
      paddingContentHorizontal: 20,
    },
    Card: {
      borderRadiusLG: 8,
    },
    Input: {
      borderRadius: 6,
      controlHeight: 38,
    },
    Select: {
      borderRadius: 6,
      controlHeight: 38,
    },
    Tag: {
      borderRadiusSM: 4,
      fontSize: 12,
    },
    Typography: {
      fontWeightStrong: 600,
    },
    Table: {
      headerBg: "#F8FAFC",
      headerColor: "#0F172A",
      headerBorderRadius: 0,
    },
    Modal: {
      borderRadiusLG: 12,
      paddingMD: 24,
      paddingContentHorizontalLG: 24,
    },
    Steps: {
      controlHeight: 32,
    },
  },
};

export default theme;
