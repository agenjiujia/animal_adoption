import AppShell from "@/app/_components/AppShell";
import { Nunito_Sans, Varela_Round } from "next/font/google";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import theme from "@/lib/antdTheme";
import "./globals.css";
import type { Metadata } from "next";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});
const varelaRound = Varela_Round({
  variable: "--font-varela-round",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  icons: {
    icon: "/icon.svg?v=3",
    shortcut: "/icon.svg?v=3",
    apple: "/icon.svg?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      className={`${nunitoSans.variable} ${varelaRound.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ConfigProvider theme={theme} locale={zhCN}>
          <AppShell>{children}</AppShell>
        </ConfigProvider>
      </body>
    </html>
  );
}
