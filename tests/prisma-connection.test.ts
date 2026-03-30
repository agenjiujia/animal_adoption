import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("Prisma database (DATABASE_URL set)", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("runs a trivial query", async () => {
    const n = await prisma.user.count();
    expect(typeof n).toBe("number");
  });
});
