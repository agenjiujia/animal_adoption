import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // 避免 Turbopack 把 Prisma 打进 bundle 后 env / 二进制路径异常
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
