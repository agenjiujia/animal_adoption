import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Prisma 单例与事务封装（替代原 mysql2 连接池）
 */
export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn);
}

export { prisma };
export default prisma;
