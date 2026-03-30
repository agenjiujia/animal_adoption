# 萌宠之家 · Animal Adoption

宠物领养平台（全栈），支持游客浏览、用户申请领养、发布者审批、后台管理与个人中心。

- 仓库地址：`git@github.com:agenjiujia/animal_adoption.git`
- 技术架构：Next.js App Router + Prisma + MySQL + Ant Design

---

## 1. 项目能力

### 用户端

- 发现宠物（列表 + 详情）
- 收藏宠物、取消收藏
- 提交领养申请、查看“我的领养申请”
- 接收系统通知（申请通过/拒绝等）

### 发布者端

- 发布宠物领养信息
- 我的发布（查询/编辑/删除）
- 领养审批队列（审批自己发布宠物的申请）

### 管理后台

- 宠物管理
- 用户管理
- 审批管理（含筛选）

### 个人中心

- 查看个人资料
- 上传头像
- 编辑用户名/邮箱/真实姓名/地址

---

## 2. 技术栈

- Next.js `16.2.0`
- React `19.2.4`
- TypeScript `5`
- Ant Design `6.3.3`
- Framer Motion `12`
- Prisma `5.22.0`
- MySQL `8+`
- Vitest `3`

---

## 3. 目录结构（核心）

```txt
app/
  (auth)/               登录/注册页面
  _components/          全局壳组件（如 AppShell / AdminShell）
  admin/                后台页面
  api/                  接口路由（App Router Route Handlers）
  my/                   我的收藏/我的领养等
  pet/                  发布、编辑、我的发布
lib/                    鉴权、数据库、图片与错误处理等
utils/                  请求封装、响应包装
prisma/                 schema 与迁移
scripts/                数据库脚本与辅助脚本
public/                 静态资源与上传目录
```

---

## 4. 环境要求

- Node.js `20+`
- Yarn `1.22+`
- MySQL `8+`

---

## 5. 环境变量

1. 复制模板文件：

```bash
cp .env.example .env
```

2. 按本地环境填写 `.env`（最少）：

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE=animal_adoption`
- `JWT_SECRET`

可选：直接配置 `DATABASE_URL`，例如：

```bash
DATABASE_URL="mysql://root:YOUR_PASSWORD@127.0.0.1:3306/animal_adoption"
```

---

## 6. 数据库初始化（全新本地库）

本项目已提供完整初始化 SQL：`init_pet_adopt_db.sql`。  
脚本默认数据库名已设置为：`animal_adoption`。

执行命令：

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p < init_pet_adopt_db.sql
```

> 如果你要先清空再重建，可先执行：`DROP DATABASE IF EXISTS animal_adoption;`

---

## 7. 本地启动

```bash
yarn
yarn dev
```

浏览器访问：`http://localhost:3000`

---

## 8. 常用命令

```bash
yarn dev                  # 开发模式
yarn build                # 生产构建
yarn start                # 生产启动
yarn lint                 # 代码检查
yarn test                 # 单元测试
yarn test:watch           # 测试监听

yarn db:generate          # prisma generate
yarn db:migrate           # prisma migrate deploy
yarn db:migrate:dev       # prisma migrate dev
yarn db:push              # prisma db push
yarn test:db              # 数据库连通性 smoke test
```

---

## 9. 事务与一致性

- 数据库表均为 `InnoDB`（支持事务）
- 关键业务流程（如审批）使用 Prisma 事务封装，保证多表写入原子性

---

## 10. 上传与存储说明

当前上传实现为本地落盘：

- 上传接口：`/api/upload`
- 存储目录：`public/uploads`

适合开发与小规模部署。  
生产环境建议迁移到对象存储（OSS/S3/COS），避免磁盘膨胀与多实例文件不一致问题。

---

## 11. 新电脑迁移启动（最短流程）

```bash
git clone git@github.com:agenjiujia/animal_adoption.git
cd animal_adoption
yarn
cp .env.example .env
# 编辑 .env 填好 MySQL 和 JWT_SECRET
mysql -h 127.0.0.1 -P 3306 -u root -p < init_pet_adopt_db.sql
yarn dev
```

---

## 12. 备注

- 本 README 已基于当前工程实际状态重写，旧模板文档已废弃。
