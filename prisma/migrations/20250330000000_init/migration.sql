-- Initialize schema (aligned with init_pet_adopt_db.sql; run against existing database `pet_adopt`)

CREATE TABLE `user` (
    `user_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `email` VARCHAR(100) NULL,
    `phone` VARCHAR(20) NOT NULL,
    `avatar` VARCHAR(512) NULL,
    `real_name` VARCHAR(50) NULL,
    `id_card` VARCHAR(20) NULL,
    `address` VARCHAR(255) NULL,
    `role` TINYINT NOT NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 1,
    `create_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `user_username_key`(`username`),
    UNIQUE INDEX `user_phone_key`(`phone`),
    UNIQUE INDEX `user_email_key`(`email`),
    INDEX `user_role_status_idx`(`role`, `status`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `pet` (
    `pet_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `species` VARCHAR(30) NOT NULL,
    `breed` VARCHAR(50) NULL,
    `age` INTEGER NULL,
    `gender` TINYINT NULL DEFAULT 0,
    `weight` DECIMAL(10, 2) NULL,
    `health_status` TEXT NULL,
    `vaccine_status` TINYINT NULL DEFAULT 0,
    `neutered` TINYINT NULL DEFAULT 0,
    `description` TEXT NULL,
    `image_urls` JSON NULL,
    `status` TINYINT NOT NULL DEFAULT 0,
    `create_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    INDEX `pet_user_id_idx`(`user_id`),
    INDEX `pet_status_create_time_idx`(`status`, `create_time`),
    PRIMARY KEY (`pet_id`),
    CONSTRAINT `fk_pet_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `pet_history` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `pet_id` INT UNSIGNED NOT NULL,
    `old_data` JSON NULL,
    `new_data` JSON NULL,
    `operator_id` INT UNSIGNED NOT NULL,
    `operate_type` TINYINT UNSIGNED NOT NULL,
    `operate_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `pet_history_pet_id_operate_time_idx`(`pet_id`, `operate_time`),
    INDEX `pet_history_operator_id_idx`(`operator_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `chk_pet_history_operate_type` CHECK (`operate_type` IN (0, 1)),
    CONSTRAINT `fk_history_pet_id` FOREIGN KEY (`pet_id`) REFERENCES `pet` (`pet_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_history_operator_id` FOREIGN KEY (`operator_id`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `adoption_apply` (
    `apply_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `pet_id` INT UNSIGNED NOT NULL,
    `apply_user_id` INT UNSIGNED NOT NULL,
    `pet_user_id` INT UNSIGNED NOT NULL,
    `apply_message` TEXT NULL,
    `status` TINYINT NOT NULL DEFAULT 0,
    `review_admin_id` INT UNSIGNED NULL,
    `review_message` TEXT NULL,
    `review_time` TIMESTAMP(0) NULL,
    `is_read` TINYINT NOT NULL DEFAULT 0,
    `is_admin_read` TINYINT NOT NULL DEFAULT 0,
    `create_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    INDEX `adoption_apply_pet_id_idx`(`pet_id`),
    INDEX `adoption_apply_apply_user_id_idx`(`apply_user_id`),
    INDEX `adoption_apply_pet_user_id_idx`(`pet_user_id`),
    INDEX `adoption_apply_status_create_time_idx`(`status`, `create_time`),
    UNIQUE INDEX `adoption_apply_pet_id_apply_user_id_key`(`pet_id`, `apply_user_id`),
    PRIMARY KEY (`apply_id`),
    CONSTRAINT `fk_apply_pet_id` FOREIGN KEY (`pet_id`) REFERENCES `pet` (`pet_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_apply_user_id` FOREIGN KEY (`apply_user_id`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_apply_owner_id` FOREIGN KEY (`pet_user_id`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_apply_admin_id` FOREIGN KEY (`review_admin_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `pet_favorite` (
    `favorite_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `pet_id` INT UNSIGNED NOT NULL,
    `create_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `pet_favorite_user_id_idx`(`user_id`),
    INDEX `pet_favorite_pet_id_idx`(`pet_id`),
    UNIQUE INDEX `pet_favorite_user_id_pet_id_key`(`user_id`, `pet_id`),
    PRIMARY KEY (`favorite_id`),
    CONSTRAINT `fk_fav_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_fav_pet_id` FOREIGN KEY (`pet_id`) REFERENCES `pet` (`pet_id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
