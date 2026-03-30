# 萌宠之家 数据库表结构说明文档

本项目采用 MySQL 8.0+ 数据库，核心业务围绕宠物领养展开，共包含 5 张核心表。

---

## 1. user (用户表)
存储平台所有用户信息，包括普通用户与管理员。

| 字段名 | 类型 | 说明 | 备注 |
| :--- | :--- | :--- | :--- |
| `user_id` | `INT UNSIGNED` | 用户ID | 主键，自增 |
| `username` | `VARCHAR(50)` | 用户名/昵称 | 唯一索引 |
| `password` | `VARCHAR(255)` | 加密后的密码 | 使用 bcrypt 加密 |
| `email` | `VARCHAR(100)` | 邮箱地址 | 唯一索引 |
| `phone` | `VARCHAR(20)` | 手机号 | 唯一索引，登录凭证 |
| `avatar` | `VARCHAR(255)` | 头像URL | |
| `real_name` | `VARCHAR(50)` | 真实姓名 | 用于领养审核认证 |
| `id_card` | `VARCHAR(20)` | 身份证号 | 用于领养审核认证 |
| `address` | `VARCHAR(255)` | 联系地址 | |
| `role` | `TINYINT` | 角色 | 0-普通用户，1-管理员 |
| `status` | `TINYINT` | 状态 | 0-禁用，1-正常 |
| `create_time` | `TIMESTAMP` | 创建时间 | |
| `update_time` | `TIMESTAMP` | 更新时间 | |

---

## 2. pet (宠物信息表)
存储待领养宠物的基础信息及状态。

| 字段名 | 类型 | 说明 | 备注 |
| :--- | :--- | :--- | :--- |
| `pet_id` | `INT UNSIGNED` | 宠物ID | 主键，自增 |
| `user_id` | `INT UNSIGNED` | 发布者ID | 外键关联 user 表 |
| `name` | `VARCHAR(50)` | 宠物名字 | |
| `species` | `VARCHAR(30)` | 物物种 | 如：猫, 狗 |
| `breed` | `VARCHAR(50)` | 品种 | |
| `age` | `INT` | 年龄 | 单位：月 |
| `gender` | `TINYINT` | 性别 | 0-母，1-公 |
| `weight` | `DECIMAL(10,2)` | 体重 | 单位：kg |
| `health_status` | `TEXT` | 健康状况 | |
| `vaccine_status` | `TINYINT` | 疫苗状态 | 0-未知，1-已打，2-未打 |
| `neutered` | `TINYINT` | 绝育状态 | 0-未知，1-已绝育，2-未绝育 |
| `description` | `TEXT` | 详细描述 | |
| `image_urls` | `TEXT` | 图片URL列表 | JSON字符串或逗号分隔 |
| `status` | `TINYINT` | 状态 | 0-待领养，1-已领养，2-下架 |
| `create_time` | `TIMESTAMP` | 创建时间 | |
| `update_time` | `TIMESTAMP` | 更新时间 | |

---

## 3. pet_history (宠物修改历史表)
记录宠物信息的修改历史及管理员的状态变更操作。

| 字段名 | 类型 | 说明 | 备注 |
| :--- | :--- | :--- | :--- |
| `id` | `INT UNSIGNED` | 主键ID | |
| `pet_id` | `INT UNSIGNED` | 宠物ID | 外键关联 pet 表 |
| `old_data` | `JSON` | 修改前数据 | |
| `new_data` | `JSON` | 修改后数据 | |
| `operator_id` | `INT UNSIGNED` | 操作人ID | 外键关联 user 表 |
| `operate_type` | `ENUM` | 操作类型 | STATUS_CHANGE / CONTENT_EDIT |
| `operate_time` | `TIMESTAMP` | 操作时间 | |

---

## 4. adoption_apply (领养申请表)
记录用户提交的领养申请及管理员的审核流程。

| 字段名 | 类型 | 说明 | 备注 |
| :--- | :--- | :--- | :--- |
| `apply_id` | `INT UNSIGNED` | 申请ID | 主键，自增 |
| `pet_id` | `INT UNSIGNED` | 宠物ID | 外键关联 pet 表 |
| `apply_user_id` | `INT UNSIGNED` | 申请人ID | 外键关联 user 表 |
| `pet_user_id` | `INT UNSIGNED` | 发布者ID | 外键关联 user 表 |
| `apply_message` | `TEXT` | 申请留言 | |
| `status` | `TINYINT` | 状态 | 0-待审核，1-审核通过，2-审核拒绝 |
| `review_admin_id` | `INT UNSIGNED` | 审核管理员ID | 外键关联 user 表 |
| `review_message` | `TEXT` | 审核意见 | |
| `review_time` | `TIMESTAMP` | 审核时间 | |
| `is_read` | `TINYINT` | 申请人是否已读 | 0-未读，1-已读 |
| `is_admin_read` | `TINYINT` | 管理员是否已读 | 0-未读，1-已读 |
| `create_time` | `TIMESTAMP` | 创建时间 | |
| `update_time` | `TIMESTAMP` | 更新时间 | |

---

## 5. pet_favorite (宠物收藏表)
记录用户收藏宠物的关系。

| 字段名 | 类型 | 说明 | 备注 |
| :--- | :--- | :--- | :--- |
| `favorite_id` | `INT UNSIGNED` | 收藏ID | 主键，自增 |
| `user_id` | `INT UNSIGNED` | 用户ID | 外键关联 user 表 |
| `pet_id` | `INT UNSIGNED` | 宠物ID | 外键关联 pet 表 |
| `create_time` | `TIMESTAMP` | 收藏时间 | |
