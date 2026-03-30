# 萌宠之家（animal_adoption）

基于 Next.js App Router 的宠物领养平台，包含用户端领养流程、发布者审批流程和后台管理模块。

## 功能概览

- 游客可浏览待领养宠物列表与详情
- 用户可注册/登录、收藏宠物、提交领养申请
- 发布者可查看并审批自己发布宠物的领养申请
- 管理后台包含宠物管理、用户管理、审批管理
- 个人中心支持头像上传与资料编辑

## 技术栈

- Next.js `16`
- React `19` + TypeScript
- Ant Design `6` + Framer Motion
- Prisma `5` + MySQL `8`
- ahooks
- Vitest（单测）

## 目录说明（核心）

- `app/`：页面与 API 路由（App Router）
- `app/api/`：后端接口
- `lib/`：数据库、鉴权、工具函数
- `utils/request.ts`：前端请求封装
- `prisma/`：Prisma schema 与迁移
- `scripts/`：数据库脚本与辅助工具
- `public/`：静态资源（含上传目录）

## 环境要求

- Node.js `20+`
- Yarn `1.22+`
- MySQL `8+`

## 本地快速启动

### 1) 安装依赖

```bash
yarn
```

### 2) 配置环境变量

复制 `.env.example` 为 `.env`，至少配置：

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`（当前建议：`animal_adoption`）
- `JWT_SECRET`

可选：直接配置 `DATABASE_URL`，格式如：

```bash
DATABASE_URL="mysql://root:YOUR_PASSWORD@127.0.0.1:3306/animal_adoption"
```

### 3) 初始化数据库（全新库）

项目已提供一份完整建库脚本：

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p < init_pet_adopt_db.sql
```

> 脚本当前默认库名已是 `animal_adoption`。

### 4) 启动开发环境

```bash
yarn dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 常用命令

```bash
yarn dev                 # 开发
yarn build               # 生产构建
yarn start               # 生产启动
yarn lint                # ESLint
yarn test                # 单测
yarn test:watch          # 监听测试

yarn db:generate         # prisma generate
yarn db:migrate          # prisma migrate deploy
yarn db:migrate:dev      # prisma migrate dev
yarn db:push             # prisma db push
yarn db:fix-adoption-apply # 历史库修复脚本（可选）
```

## 事务与一致性

- 所有表使用 `InnoDB`（支持事务）
- 关键业务（如领养审批）在服务端使用 Prisma 事务（`withTransaction`）保证一致性

## 上传说明

当前上传接口默认落盘到本地：

- 路径：`public/uploads`
- 接口：`/api/upload`

这适合本地开发。生产环境建议迁移到对象存储（如 OSS/S3/COS），避免单机磁盘和多实例同步问题。

## 兼容与注意事项

- 本项目使用的是较新 Next.js 版本，升级依赖前先评估兼容性
- 若你在新电脑启动，确保 `.env` 的数据库配置与实际库名一致
- 若历史数据库结构不一致，可按需使用 `scripts/fix_adoption_apply.sql`

## 许可证

仅供学习与内部使用；如需对外发布，请补充项目许可证与版权声明。
