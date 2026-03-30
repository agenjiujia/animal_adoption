import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/schemas/auth";

describe("auth schemas", () => {
  it("loginSchema accepts phone + password", () => {
    const r = loginSchema.safeParse({
      phone: "13800138000",
      password: "secret",
    });
    expect(r.success).toBe(true);
  });

  it("loginSchema rejects bad phone", () => {
    const r = loginSchema.safeParse({ phone: "123", password: "x" });
    expect(r.success).toBe(false);
  });

  it("registerSchema allows omitted email", () => {
    const r = registerSchema.safeParse({
      username: "u1",
      real_name: "张三",
      phone: "13800138000",
      password: "123456",
      identityCard: "110101199001011234",
      address: "北京",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBeUndefined();
  });

  it("registerSchema rejects invalid email when present", () => {
    const r = registerSchema.safeParse({
      username: "u1",
      real_name: "张三",
      phone: "13800138000",
      password: "123456",
      identityCard: "110101199001011234",
      address: "北京",
      email: "not-an-email",
    });
    expect(r.success).toBe(false);
  });
});
