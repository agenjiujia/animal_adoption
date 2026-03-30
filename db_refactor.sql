-- ------------------------------------------------------
-- 萌宠之家 数据库重构脚本
-- 目标：优化核心5张表结构，删除多余表
-- ------------------------------------------------------

SET FOREIGN_KEY_CHECKS = 0;

-- 1. user（用户表）
CREATE TABLE IF NOT EXISTS `user` (
  `user_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名/昵称',
  `password` VARCHAR(255) NOT NULL COMMENT '加密后的密码',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱地址',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
  `avatar` VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
  `real_name` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
  `id_card` VARCHAR(20) DEFAULT NULL COMMENT '身份证号',
  `address` VARCHAR(255) DEFAULT NULL COMMENT '联系地址',
  `role` TINYINT NOT NULL DEFAULT 0 COMMENT '角色：0-普通用户，1-管理员',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-正常',
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`),
  UNIQUE KEY `uk_phone` (`phone`),
  INDEX `idx_role` (`role`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. pet（宠物信息表）
CREATE TABLE IF NOT EXISTS `pet` (
  `pet_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '宠物ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '发布者ID',
  `name` VARCHAR(50) NOT NULL COMMENT '宠物名字',
  `species` VARCHAR(30) NOT NULL COMMENT '物种 (如: 猫, 狗)',
  `breed` VARCHAR(50) DEFAULT NULL COMMENT '品种',
  `age` INT DEFAULT NULL COMMENT '年龄 (月)',
  `gender` TINYINT DEFAULT 0 COMMENT '性别：0-母，1-公',
  `weight` DECIMAL(10,2) DEFAULT NULL COMMENT '体重 (kg)',
  `health_status` TEXT DEFAULT NULL COMMENT '健康状况',
  `vaccine_status` TINYINT DEFAULT 0 COMMENT '疫苗状态：0-未知，1-已打，2-未打',
  `neutered` TINYINT DEFAULT 0 COMMENT '绝育状态：0-未知，1-已绝育，2-未绝育',
  `description` TEXT DEFAULT NULL COMMENT '详细描述',
  `image_urls` TEXT DEFAULT NULL COMMENT '图片URL列表（JSON或逗号分隔）',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0-待领养，1-已领养，2-下架',
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`pet_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  CONSTRAINT `fk_pet_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='宠物信息表';

-- 3. pet_history（宠物修改历史表）
CREATE TABLE IF NOT EXISTS `pet_history` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `pet_id` INT UNSIGNED NOT NULL COMMENT '宠物ID',
  `old_data` JSON DEFAULT NULL COMMENT '修改前数据',
  `new_data` JSON DEFAULT NULL COMMENT '修改后数据',
  `operator_id` INT UNSIGNED NOT NULL COMMENT '操作人ID',
  `operate_type` ENUM('STATUS_CHANGE', 'CONTENT_EDIT') NOT NULL COMMENT '操作类型',
  `operate_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (`id`),
  INDEX `idx_pet_id` (`pet_id`),
  INDEX `idx_operator_id` (`operator_id`),
  CONSTRAINT `fk_history_pet_id` FOREIGN KEY (`pet_id`) REFERENCES `pet` (`pet_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_history_operator_id` FOREIGN KEY (`operator_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='宠物修改历史表';

-- 4. adoption_apply（领养申请表）
CREATE TABLE IF NOT EXISTS `adoption_apply` (
  `apply_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '申请ID',
  `pet_id` INT UNSIGNED NOT NULL COMMENT '宠物ID',
  `apply_user_id` INT UNSIGNED NOT NULL COMMENT '申请人ID',
  `pet_user_id` INT UNSIGNED NOT NULL COMMENT '发布者ID',
  `apply_message` TEXT DEFAULT NULL COMMENT '申请留言',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0-待审核，1-审核通过，2-审核拒绝',
  `review_admin_id` INT UNSIGNED DEFAULT NULL COMMENT '审核管理员ID',
  `review_message` TEXT DEFAULT NULL COMMENT '审核意见',
  `review_time` TIMESTAMP NULL DEFAULT NULL COMMENT '审核时间',
  `is_read` TINYINT NOT NULL DEFAULT 0 COMMENT '申请人是否已读：0-未读，1-已读',
  `is_admin_read` TINYINT NOT NULL DEFAULT 0 COMMENT '管理员是否已读：0-未读，1-已读',
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`apply_id`),
  UNIQUE KEY `uk_pet_user` (`pet_id`, `apply_user_id`),
  INDEX `idx_pet_id` (`pet_id`),
  INDEX `idx_apply_user_id` (`apply_user_id`),
  INDEX `idx_pet_user_id` (`pet_user_id`),
  INDEX `idx_status` (`status`),
  CONSTRAINT `fk_apply_pet_id` FOREIGN KEY (`pet_id`) REFERENCES `pet` (`pet_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_apply_user_id` FOREIGN KEY (`apply_user_id`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_apply_owner_id` FOREIGN KEY (`pet_user_id`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_apply_admin_id` FOREIGN KEY (`review_admin_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='领养申请表';

-- 5. pet_favorite（宠物收藏表）
CREATE TABLE IF NOT EXISTS `pet_favorite` (
  `favorite_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '收藏ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `pet_id` INT UNSIGNED NOT NULL COMMENT '宠物ID',
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  PRIMARY KEY (`favorite_id`),
  UNIQUE KEY `uk_user_pet` (`user_id`, `pet_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_pet_id` (`pet_id`),
  CONSTRAINT `fk_fav_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fav_pet_id` FOREIGN KEY (`pet_id`) REFERENCES `pet` (`pet_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='宠物收藏表';

-- 删除可能存在的多余表 (需要确认后再执行，此处列出潜在的多余表)
DROP TABLE IF EXISTS `adoption_application`; 
-- DROP TABLE IF EXISTS `notification`; (如果不需要的话)

SET FOREIGN_KEY_CHECKS = 1;
