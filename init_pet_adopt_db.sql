-- ============================================================
-- 萌宠之家领养平台 — 数据库初始化脚本（优化版）
-- 目标: MySQL 8.0+
-- 用法示例:
--   mysql -h <HOST> -P <PORT> -u <USER> -p < init_pet_adopt_db.sql
-- 说明: 将下方数据库名 pet_adopt 替换为实际库名时，请同步环境变量 MYSQL_DATABASE / DATABASE_URL
-- ============================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `pet_adopt`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `pet_adopt`;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 1. user（用户表）
-- 优化: email 可选时须存 NULL（勿用空串），以便 UNIQUE 语义清晰；时间与审计字段保持
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user` (
  `user_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名/昵称',
  `password` VARCHAR(255) NOT NULL COMMENT '加密后的密码(bcrypt等)',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱(可选，不用时请保持NULL)',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号(登录凭证)',
  `avatar` VARCHAR(512) DEFAULT NULL COMMENT '头像URL',
  `real_name` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
  `id_card` VARCHAR(20) DEFAULT NULL COMMENT '身份证号',
  `address` VARCHAR(255) DEFAULT NULL COMMENT '联系地址',
  `role` TINYINT NOT NULL DEFAULT 0 COMMENT '角色：0-普通用户，1-管理员',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-正常',
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_phone` (`phone`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_role_status` (`role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ---------------------------------------------------------------------------
-- 2. pet（宠物信息表）
-- 优化: image_urls 使用 JSON 类型约束为合法 JSON（建议存 string[]）；保留业务状态枚举
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pet` (
  `pet_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '宠物ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '发布者ID',
  `name` VARCHAR(50) NOT NULL COMMENT '宠物名字',
  `species` VARCHAR(30) NOT NULL COMMENT '物种 (如: 猫, 狗)',
  `breed` VARCHAR(50) DEFAULT NULL COMMENT '品种',
  `age` INT DEFAULT NULL COMMENT '年龄(月)，非负',
  `gender` TINYINT DEFAULT 0 COMMENT '性别：0-母，1-公',
  `weight` DECIMAL(10,2) DEFAULT NULL COMMENT '体重(kg)',
  `health_status` TEXT DEFAULT NULL COMMENT '健康状况',
  `vaccine_status` TINYINT DEFAULT 0 COMMENT '疫苗：0-未知，1-已打，2-未打',
  `neutered` TINYINT DEFAULT 0 COMMENT '绝育：0-未知，1-已绝育，2-未绝育',
  `description` TEXT DEFAULT NULL COMMENT '详细描述',
  `image_urls` JSON DEFAULT NULL COMMENT '图片URL列表(JSON数组，如 ["https://..."])',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0-待领养，1-已领养，2-下架',
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`pet_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status_create_time` (`status`, `create_time`),
  CONSTRAINT `fk_pet_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='宠物信息表';

-- ---------------------------------------------------------------------------
-- 3. pet_history（宠物修改历史）
-- 优化: operate_type 与需求对齐为 TINYINT — 0 管理员状态变更，1 发布者内容编辑；CHECK 约束防脏数据
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pet_history` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `pet_id` INT UNSIGNED NOT NULL COMMENT '宠物ID',
  `old_data` JSON DEFAULT NULL COMMENT '修改前数据快照',
  `new_data` JSON DEFAULT NULL COMMENT '修改后数据快照/增量',
  `operator_id` INT UNSIGNED NOT NULL COMMENT '操作人用户ID',
  `operate_type` TINYINT UNSIGNED NOT NULL COMMENT '0-状态变更(管理员) 1-内容编辑(发布者)',
  `operate_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_pet_operate_time` (`pet_id`, `operate_time`),
  KEY `idx_operator_id` (`operator_id`),
  CONSTRAINT `chk_pet_history_operate_type` CHECK (`operate_type` IN (0, 1)),
  CONSTRAINT `fk_history_pet_id` FOREIGN KEY (`pet_id`) REFERENCES `pet` (`pet_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_history_operator_id` FOREIGN KEY (`operator_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='宠物修改历史表';

-- ---------------------------------------------------------------------------
-- 4. adoption_apply（领养申请）
-- 优化: pet_user_id 冗余发布者ID便于列表/权限校验（避免每次关联 pet）；审核人外键 ON DELETE SET NULL
--       增加 (status, create_time) 满足后台筛选分页
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `adoption_apply` (
  `apply_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '申请ID',
  `pet_id` INT UNSIGNED NOT NULL COMMENT '宠物ID',
  `apply_user_id` INT UNSIGNED NOT NULL COMMENT '申请人ID',
  `pet_user_id` INT UNSIGNED NOT NULL COMMENT '发布者ID(冗余)',
  `apply_message` TEXT DEFAULT NULL COMMENT '申请留言',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0-待审核 1-通过 2-拒绝',
  `review_admin_id` INT UNSIGNED DEFAULT NULL COMMENT '审核管理员ID',
  `review_message` TEXT DEFAULT NULL COMMENT '审核意见',
  `review_time` TIMESTAMP NULL DEFAULT NULL COMMENT '审核时间',
  `is_read` TINYINT NOT NULL DEFAULT 0 COMMENT '申请人是否已读：0-否 1-是',
  `is_admin_read` TINYINT NOT NULL DEFAULT 0 COMMENT '管理员是否已读',
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`apply_id`),
  UNIQUE KEY `uk_pet_apply_user` (`pet_id`, `apply_user_id`),
  KEY `idx_pet_id` (`pet_id`),
  KEY `idx_apply_user_id` (`apply_user_id`),
  KEY `idx_pet_user_id` (`pet_user_id`),
  KEY `idx_status_create_time` (`status`, `create_time`),
  CONSTRAINT `fk_apply_pet_id` FOREIGN KEY (`pet_id`) REFERENCES `pet` (`pet_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_apply_user_id` FOREIGN KEY (`apply_user_id`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_apply_owner_id` FOREIGN KEY (`pet_user_id`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_apply_admin_id` FOREIGN KEY (`review_admin_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='领养申请表';

-- ---------------------------------------------------------------------------
-- 5. pet_favorite（收藏）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pet_favorite` (
  `favorite_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '收藏ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `pet_id` INT UNSIGNED NOT NULL COMMENT '宠物ID',
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  PRIMARY KEY (`favorite_id`),
  UNIQUE KEY `uk_user_pet` (`user_id`, `pet_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_pet_id` (`pet_id`),
  CONSTRAINT `fk_fav_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fav_pet_id` FOREIGN KEY (`pet_id`) REFERENCES `pet` (`pet_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='宠物收藏表';

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- 以下为旧库迁移时可按需手工执行的清理（初始化全新环境请勿随意执行 DROP）
-- DROP TABLE IF EXISTS `adoption_application`;
-- ---------------------------------------------------------------------------
