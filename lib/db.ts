import mysql, { type PoolConnection } from "mysql2/promise";

const port = Number(process.env.MYSQL_PORT) || 3306;

/** MySQL 连接池（单例） */
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  database: process.env.MYSQL_DATABASE,
  port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
export { pool };

/**
 * 事务封装：自动 commit / rollback
 */
export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
