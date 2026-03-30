-- 将 `adoption_apply` 对齐当前 Prisma / init 脚本（解决 apply_user_id、pet_user_id 等缺失）
-- 用法（在目标库执行）：
--   mysql -u root -p animal_adoption < scripts/fix_adoption_apply.sql
-- 或用客户端选中库后粘贴执行。
--
-- 说明：会暂时关闭外键检查、删掉本表上所有外键后再改结构并重建外键。
--       若表不存在，请先执行 prisma/migrations 或 init_pet_adopt_db.sql 建表。

SET NAMES utf8mb4;
SET @db := DATABASE();

DROP PROCEDURE IF EXISTS `patch_adoption_apply_structure`;

DELIMITER $$

CREATE PROCEDURE `patch_adoption_apply_structure`()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE fk_name VARCHAR(255);
  DECLARE cur CURSOR FOR
    SELECT CONSTRAINT_NAME
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = 'adoption_apply'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '表 adoption_apply 不存在，请先初始化数据库';
  END IF;

  SET FOREIGN_KEY_CHECKS = 0;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO fk_name;
    IF done THEN
      LEAVE read_loop;
    END IF;
    SET @s := CONCAT('ALTER TABLE `adoption_apply` DROP FOREIGN KEY `', fk_name, '`');
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END LOOP;
  CLOSE cur;

  -- 与被引用列完全一致（避免外键 3780：如 pet.pet_id 为 signed int、user.user_id 为 unsigned）
  SELECT IFNULL(COLUMN_TYPE, 'int unsigned') INTO @pet_ct
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'pet' AND COLUMN_NAME = 'pet_id'
  LIMIT 1;
  SELECT IFNULL(COLUMN_TYPE, 'int unsigned') INTO @user_ct
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user' AND COLUMN_NAME = 'user_id'
  LIMIT 1;

  -- 旧库：用 user_id 表示申请人 → 改名为 apply_user_id（类型与 user.user_id 一致）
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply' AND COLUMN_NAME = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply' AND COLUMN_NAME = 'apply_user_id'
  ) THEN
    SET @s := CONCAT(
      'ALTER TABLE `adoption_apply` CHANGE COLUMN `user_id` `apply_user_id` ',
      @user_ct,
      ' NOT NULL COMMENT ''申请人ID'''
    );
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;

  -- 补充 pet_user_id：从 pet.user_id 回填
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply' AND COLUMN_NAME = 'pet_user_id'
  ) THEN
    SET @s := CONCAT(
      'ALTER TABLE `adoption_apply` ADD COLUMN `pet_user_id` ',
      @user_ct,
      ' NULL COMMENT ''发布者ID'' AFTER `apply_user_id`'
    );
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    UPDATE `adoption_apply` aa
    INNER JOIN `pet` p ON p.`pet_id` = aa.`pet_id`
    SET aa.`pet_user_id` = p.`user_id`
    WHERE aa.`pet_user_id` IS NULL;
    IF EXISTS (SELECT 1 FROM `adoption_apply` WHERE `pet_user_id` IS NULL LIMIT 1) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '存在无法在 pet 表中找到对应行的 adoption_apply 记录，请先清理或补全 pet_id';
    END IF;
    SET @s := CONCAT(
      'ALTER TABLE `adoption_apply` MODIFY COLUMN `pet_user_id` ',
      @user_ct,
      ' NOT NULL COMMENT ''发布者ID'''
    );
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;

  -- 其它可能被旧表省略的列（存在则跳过）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply' AND COLUMN_NAME = 'review_admin_id'
  ) THEN
    SET @s := CONCAT(
      'ALTER TABLE `adoption_apply` ADD COLUMN `review_admin_id` ',
      @user_ct,
      ' NULL COMMENT ''审核管理员ID'' AFTER `status`'
    );
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply' AND COLUMN_NAME = 'review_message'
  ) THEN
    ALTER TABLE `adoption_apply`
      ADD COLUMN `review_message` TEXT NULL COMMENT '审核意见' AFTER `review_admin_id`;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply' AND COLUMN_NAME = 'review_time'
  ) THEN
    ALTER TABLE `adoption_apply`
      ADD COLUMN `review_time` TIMESTAMP NULL DEFAULT NULL COMMENT '审核时间' AFTER `review_message`;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply' AND COLUMN_NAME = 'is_read'
  ) THEN
    ALTER TABLE `adoption_apply`
      ADD COLUMN `is_read` TINYINT NOT NULL DEFAULT 0 COMMENT '申请人是否已读' AFTER `review_time`;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply' AND COLUMN_NAME = 'is_admin_read'
  ) THEN
    ALTER TABLE `adoption_apply`
      ADD COLUMN `is_admin_read` TINYINT NOT NULL DEFAULT 0 COMMENT '管理员是否已读' AFTER `is_read`;
  END IF;

  -- 申请留言：Prisma 字段名 apply_message（旧表常见为 message）
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply' AND COLUMN_NAME = 'message'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply' AND COLUMN_NAME = 'apply_message'
  ) THEN
    ALTER TABLE `adoption_apply`
      CHANGE COLUMN `message` `apply_message` TEXT NULL COMMENT '申请留言';
  ELSEIF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply' AND COLUMN_NAME = 'apply_message'
  ) THEN
    ALTER TABLE `adoption_apply`
      ADD COLUMN `apply_message` TEXT NULL COMMENT '申请留言' AFTER `pet_user_id`;
  END IF;

  -- create_time / update_time（旧表若缺则补，避免 Prisma @updatedAt 读写出错）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply' AND COLUMN_NAME = 'create_time'
  ) THEN
    ALTER TABLE `adoption_apply`
      ADD COLUMN `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply' AND COLUMN_NAME = 'update_time'
  ) THEN
    ALTER TABLE `adoption_apply`
      ADD COLUMN `update_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';
  END IF;

  -- 外键列类型必须与 pet.pet_id / user.user_id 完全一致
  SET @s := CONCAT(
    'ALTER TABLE `adoption_apply` ',
    'MODIFY COLUMN `pet_id` ', @pet_ct, ' NOT NULL, ',
    'MODIFY COLUMN `apply_user_id` ', @user_ct, ' NOT NULL, ',
    'MODIFY COLUMN `pet_user_id` ', @user_ct, ' NOT NULL, ',
    'MODIFY COLUMN `review_admin_id` ', @user_ct, ' NULL'
  );
  PREPARE stmt FROM @s;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;

  -- 复合唯一 (pet_id, apply_user_id)：Prisma 默认索引名见下；若 init 脚本建过 uk_pet_apply_user 等，可能不会重复添加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply'
      AND CONSTRAINT_TYPE = 'UNIQUE'
      AND CONSTRAINT_NAME = 'adoption_apply_pet_id_apply_user_id_key'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'adoption_apply'
      AND CONSTRAINT_TYPE = 'UNIQUE'
      AND CONSTRAINT_NAME = 'uk_pet_apply_user'
  ) THEN
    ALTER TABLE `adoption_apply`
      ADD UNIQUE INDEX `adoption_apply_pet_id_apply_user_id_key` (`pet_id`, `apply_user_id`);
  END IF;

  -- 重建外键（名称与 prisma migration 一致）
  ALTER TABLE `adoption_apply`
    ADD CONSTRAINT `fk_apply_pet_id`
      FOREIGN KEY (`pet_id`) REFERENCES `pet` (`pet_id`)
      ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `fk_apply_user_id`
      FOREIGN KEY (`apply_user_id`) REFERENCES `user` (`user_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `fk_apply_owner_id`
      FOREIGN KEY (`pet_user_id`) REFERENCES `user` (`user_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `fk_apply_admin_id`
      FOREIGN KEY (`review_admin_id`) REFERENCES `user` (`user_id`)
      ON DELETE SET NULL ON UPDATE CASCADE;

  SET FOREIGN_KEY_CHECKS = 1;
END$$

DELIMITER ;

CALL `patch_adoption_apply_structure`();
DROP PROCEDURE IF EXISTS `patch_adoption_apply_structure`;

SELECT 'adoption_apply 结构已对齐，可重新尝试提交领养申请。' AS result;
