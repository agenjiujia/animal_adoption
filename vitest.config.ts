import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/types": path.resolve(__dirname, "app/_types"),
      "@/constant": path.resolve(__dirname, "app/_constant"),
    },
  },
});
