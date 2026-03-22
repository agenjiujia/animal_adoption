import mysql from "mysql2/promise";

// 从环境变量读取配置
const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: Number(process.env.MYSQL_PORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// 创建连接池（性能优于单次连接）
const pool = mysql.createPool(dbConfig);

export default pool;
