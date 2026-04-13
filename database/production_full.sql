-- ==========================================================
-- EmpathyKids Production Bootstrap (MySQL 8+)
-- Purpose:
--   1) Create a production-ready schema.
--   2) Seed enough learning data for all core modules.
--   3) Keep seed idempotent with business-key upserts.
-- ==========================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS empathykids_prod
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE empathykids_prod;

SET FOREIGN_KEY_CHECKS = 0;

-- ==========================================================
-- 1) MASTER TABLES
-- ==========================================================

CREATE TABLE IF NOT EXISTS emotion_group (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS emotion (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    group_id INT UNSIGNED NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_emotion_group (group_id),
    CONSTRAINT fk_emotion_group
        FOREIGN KEY (group_id) REFERENCES emotion_group(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lesson_type (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS media_asset (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    type ENUM('IMAGE', 'VIDEO', 'AUDIO') NOT NULL,
    url VARCHAR(512) NOT NULL,
    emotion_id INT UNSIGNED NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_media_emotion (emotion_id),
    CONSTRAINT fk_media_emotion
        FOREIGN KEY (emotion_id) REFERENCES emotion(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==========================================================
-- 2) LEARNING CONTENT
-- ==========================================================

CREATE TABLE IF NOT EXISTS lesson_core (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    lesson_type_id INT UNSIGNED NOT NULL,
    emotion_group_id INT UNSIGNED NOT NULL,
    image_id BIGINT UNSIGNED NULL,
    situation_text TEXT NOT NULL,
    correct_emotion_id INT UNSIGNED NOT NULL,
    difficulty ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'EASY',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_lesson_core_type_group (lesson_type_id, emotion_group_id),
    INDEX idx_lesson_core_group (emotion_group_id),
    CONSTRAINT fk_lesson_core_type
        FOREIGN KEY (lesson_type_id) REFERENCES lesson_type(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_lesson_core_group
        FOREIGN KEY (emotion_group_id) REFERENCES emotion_group(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_lesson_core_image
        FOREIGN KEY (image_id) REFERENCES media_asset(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_lesson_core_correct_emotion
        FOREIGN KEY (correct_emotion_id) REFERENCES emotion(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lesson_option (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    core_lesson_id BIGINT UNSIGNED NOT NULL,
    emotion_id INT UNSIGNED NOT NULL,
    option_text VARCHAR(255) NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    display_order TINYINT UNSIGNED NOT NULL DEFAULT 1,
    UNIQUE KEY uq_lesson_option (core_lesson_id, emotion_id),
    INDEX idx_lesson_option_correct (core_lesson_id, is_correct),
    CONSTRAINT fk_lesson_option_core
        FOREIGN KEY (core_lesson_id) REFERENCES lesson_core(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_lesson_option_emotion
        FOREIGN KEY (emotion_id) REFERENCES emotion(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS matching_card (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    emotion_group_id INT UNSIGNED NOT NULL,
    image_id BIGINT UNSIGNED NOT NULL,
    emotion_id INT UNSIGNED NOT NULL,
    pair_key VARCHAR(80) NOT NULL,
    display_order INT UNSIGNED NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_matching_group (emotion_group_id),
    INDEX idx_matching_pair (emotion_group_id, pair_key),
    CONSTRAINT fk_matching_group
        FOREIGN KEY (emotion_group_id) REFERENCES emotion_group(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_matching_image
        FOREIGN KEY (image_id) REFERENCES media_asset(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_matching_emotion
        FOREIGN KEY (emotion_id) REFERENCES emotion(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lesson_training_ai (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    lesson_type_id INT UNSIGNED NOT NULL,
    emotion_group_id INT UNSIGNED NOT NULL,
    target_emotion_id INT UNSIGNED NOT NULL,
    instruction TEXT,
    media_guide_id BIGINT UNSIGNED NULL,
    video_url VARCHAR(512) NULL,
    success_message TEXT NULL,
    tips TEXT NULL,
    difficulty ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'EASY',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_training_lookup (lesson_type_id, emotion_group_id),
    CONSTRAINT fk_training_type
        FOREIGN KEY (lesson_type_id) REFERENCES lesson_type(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_training_group
        FOREIGN KEY (emotion_group_id) REFERENCES emotion_group(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_training_target
        FOREIGN KEY (target_emotion_id) REFERENCES emotion(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_training_media
        FOREIGN KEY (media_guide_id) REFERENCES media_asset(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==========================================================
-- 3) USERS + LEARNING LOGS
-- ==========================================================

CREATE TABLE IF NOT EXISTS `user` (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    parent_name VARCHAR(100) DEFAULT '',
    avatar VARCHAR(512) DEFAULT NULL,
    xp INT UNSIGNED NOT NULL DEFAULT 0,
    user_level INT UNSIGNED NOT NULL DEFAULT 1,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_activity_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    lesson_type_id INT UNSIGNED NOT NULL,
    lesson_ref_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
    chosen_emotion_id INT UNSIGNED NULL,
    is_correct TINYINT(1) DEFAULT NULL,
    score INT NOT NULL DEFAULT 0,
    session_duration INT UNSIGNED DEFAULT 0,
    answered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata_json JSON NULL,
    INDEX idx_ual_user_time (user_id, answered_at),
    INDEX idx_ual_user_type (user_id, lesson_type_id),
    INDEX idx_ual_lesson_ref (lesson_ref_id),
    CONSTRAINT fk_ual_user
        FOREIGN KEY (user_id) REFERENCES `user`(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ual_lesson_type
        FOREIGN KEY (lesson_type_id) REFERENCES lesson_type(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_ual_chosen_emotion
        FOREIGN KEY (chosen_emotion_id) REFERENCES emotion(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_progress_stat (
    user_id INT UNSIGNED NOT NULL,
    lesson_type_id INT UNSIGNED NOT NULL,
    emotion_group_id INT UNSIGNED NOT NULL,
    total_play INT UNSIGNED NOT NULL DEFAULT 0,
    total_correct_count INT UNSIGNED NOT NULL DEFAULT 0,
    avg_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    last_played_at DATETIME NULL,
    PRIMARY KEY (user_id, lesson_type_id, emotion_group_id),
    INDEX idx_ups_user (user_id),
    CONSTRAINT fk_ups_user
        FOREIGN KEY (user_id) REFERENCES `user`(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ups_type
        FOREIGN KEY (lesson_type_id) REFERENCES lesson_type(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_ups_group
        FOREIGN KEY (emotion_group_id) REFERENCES emotion_group(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ==========================================================
-- 4) EMOTION TRACKING + ALERTS
-- ==========================================================

CREATE TABLE IF NOT EXISTS emotion_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    session_type ENUM('REALTIME', 'PRACTICE', 'GAME') NOT NULL,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME NULL,
    dominant_emotion VARCHAR(20) NULL,
    avg_confidence TINYINT UNSIGNED NOT NULL DEFAULT 0,
    metadata_json JSON NULL,
    INDEX idx_session_user_time (user_id, started_at),
    INDEX idx_session_user_end (user_id, ended_at),
    INDEX idx_session_user_emotion (user_id, dominant_emotion),
    CONSTRAINT fk_session_user
        FOREIGN KEY (user_id) REFERENCES `user`(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS emotion_snapshots (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT UNSIGNED NOT NULL,
    dominant VARCHAR(20) NOT NULL,
    neutral TINYINT UNSIGNED NOT NULL DEFAULT 0,
    happy TINYINT UNSIGNED NOT NULL DEFAULT 0,
    sad TINYINT UNSIGNED NOT NULL DEFAULT 0,
    angry TINYINT UNSIGNED NOT NULL DEFAULT 0,
    fearful TINYINT UNSIGNED NOT NULL DEFAULT 0,
    disgusted TINYINT UNSIGNED NOT NULL DEFAULT 0,
    surprised TINYINT UNSIGNED NOT NULL DEFAULT 0,
    captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_snapshot_session_time (session_id, captured_at),
    INDEX idx_snapshot_dominant (dominant),
    CONSTRAINT fk_snapshot_session
        FOREIGN KEY (session_id) REFERENCES emotion_sessions(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS emotion_alerts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    alert_type ENUM(
        'PROLONGED_SADNESS',
        'HIGH_ANGER',
        'LOW_ENGAGEMENT',
        'SUDDEN_CHANGE',
        'PROLONGED_NEGATIVE',
        'EMOTION_DIFFICULTY'
    ) NOT NULL,
    description TEXT,
    session_id BIGINT UNSIGNED NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_alert_user_time (user_id, created_at),
    INDEX idx_alert_user_unread (user_id, is_read, created_at),
    CONSTRAINT fk_alert_user
        FOREIGN KEY (user_id) REFERENCES `user`(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_alert_session
        FOREIGN KEY (session_id) REFERENCES emotion_sessions(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==========================================================
-- 5) GAMIFICATION
-- ==========================================================

CREATE TABLE IF NOT EXISTS badges (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_emoji VARCHAR(20),
    criteria_type ENUM('STREAK', 'SCORE', 'LEVEL', 'GAMES_PLAYED', 'EMOTION_PRACTICE') NOT NULL,
    criteria_value INT UNSIGNED NOT NULL,
    xp_reward INT UNSIGNED NOT NULL DEFAULT 10,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_badges (
    user_id INT UNSIGNED NOT NULL,
    badge_id INT UNSIGNED NOT NULL,
    earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id),
    CONSTRAINT fk_user_badges_user
        FOREIGN KEY (user_id) REFERENCES `user`(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_badges_badge
        FOREIGN KEY (badge_id) REFERENCES badges(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS daily_quests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    quest_date DATE NOT NULL,
    quest_type ENUM('COMPLETE_LESSON', 'PRACTICE_EMOTION', 'TRACKING_SESSION', 'PERFECT_SCORE') NOT NULL,
    quest_description TEXT,
    xp_reward INT UNSIGNED NOT NULL DEFAULT 10,
    is_completed TINYINT(1) NOT NULL DEFAULT 0,
    completed_at DATETIME NULL,
    UNIQUE KEY uq_daily_quest (user_id, quest_date, quest_type),
    INDEX idx_daily_quest_user (user_id, quest_date),
    CONSTRAINT fk_daily_quest_user
        FOREIGN KEY (user_id) REFERENCES `user`(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================================
-- 6) MASTER SEED DATA (UPSERT)
-- ==========================================================

INSERT INTO emotion_group (code, name, description, sort_order)
VALUES
('LEVEL_1', 'Cap do 1', 'Co ban: Vui ve, Buon ba, Tuc gian, So hai', 1),
('LEVEL_2', 'Cap do 2', 'Nang cao: So hai, Tuc gian, Ghe tom', 2),
('LEVEL_3', 'Cap do 3', 'Phuc hop: Ngac nhien, Ghe tom, So hai', 3)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
description = VALUES(description),
sort_order = VALUES(sort_order);

INSERT INTO lesson_type (code, name, description)
VALUES
('FLASHCARD', 'Hoc Flashcard', 'Nhan dien cam xuc qua hinh anh'),
('MATCHING', 'Noi cap cam xuc', 'Ghep cap the co cung cam xuc'),
('CONTEXT', 'Tinh huong ngu canh', 'Chon cam xuc phu hop theo boi canh'),
('TRAINING', 'Luyen bieu cam', 'Bat chuoc bieu cam theo huong dan camera'),
('AI', 'Thu thach AI', 'AI danh gia kha nang the hien cam xuc')
ON DUPLICATE KEY UPDATE
name = VALUES(name),
description = VALUES(description),
is_active = 1;

INSERT INTO emotion (code, name, group_id)
VALUES
('HAPPY', 'Vui ve', (SELECT id FROM emotion_group WHERE code = 'LEVEL_1')),
('SAD', 'Buon ba', (SELECT id FROM emotion_group WHERE code = 'LEVEL_1')),
('ANGRY', 'Tuc gian', (SELECT id FROM emotion_group WHERE code = 'LEVEL_1')),
('FEARFUL', 'So hai', (SELECT id FROM emotion_group WHERE code = 'LEVEL_2')),
('SURPRISED', 'Ngac nhien', (SELECT id FROM emotion_group WHERE code = 'LEVEL_3')),
('DISGUSTED', 'Ghe tom', (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'))
ON DUPLICATE KEY UPDATE
name = VALUES(name),
group_id = VALUES(group_id),
is_active = 1;

-- ==========================================================
-- 7) MEDIA SEED DATA
-- ==========================================================

INSERT INTO media_asset (code, type, url, emotion_id)
VALUES
('IMG_FL_L1_HAPPY_1', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L1+Happy+1', (SELECT id FROM emotion WHERE code = 'HAPPY')),
('IMG_FL_L1_HAPPY_2', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L1+Happy+2', (SELECT id FROM emotion WHERE code = 'HAPPY')),
('IMG_FL_L1_SAD_1', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L1+Sad+1', (SELECT id FROM emotion WHERE code = 'SAD')),
('IMG_FL_L1_ANGRY_1', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L1+Angry+1', (SELECT id FROM emotion WHERE code = 'ANGRY')),

('IMG_CT_L1_BIRTHDAY', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L1+Birthday', (SELECT id FROM emotion WHERE code = 'HAPPY')),
('IMG_CT_L1_TOY_BREAK', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L1+Toy+Break', (SELECT id FROM emotion WHERE code = 'SAD')),
('IMG_CT_L1_SHARE', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L1+Share', (SELECT id FROM emotion WHERE code = 'HAPPY')),
('IMG_CT_L1_LOST', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L1+Lost', (SELECT id FROM emotion WHERE code = 'FEARFUL')),

('IMG_MC_L1_HAPPY_FACE', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L1+Happy+Face', (SELECT id FROM emotion WHERE code = 'HAPPY')),
('IMG_MC_L1_HAPPY_ICON', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L1+Happy+Icon', (SELECT id FROM emotion WHERE code = 'HAPPY')),
('IMG_MC_L1_SAD_FACE', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L1+Sad+Face', (SELECT id FROM emotion WHERE code = 'SAD')),
('IMG_MC_L1_SAD_ICON', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L1+Sad+Icon', (SELECT id FROM emotion WHERE code = 'SAD')),
('IMG_MC_L1_ANGRY_FACE', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L1+Angry+Face', (SELECT id FROM emotion WHERE code = 'ANGRY')),
('IMG_MC_L1_ANGRY_ICON', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L1+Angry+Icon', (SELECT id FROM emotion WHERE code = 'ANGRY')),
('IMG_MC_L1_FEAR_FACE', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L1+Fear+Face', (SELECT id FROM emotion WHERE code = 'FEARFUL')),
('IMG_MC_L1_FEAR_ICON', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L1+Fear+Icon', (SELECT id FROM emotion WHERE code = 'FEARFUL')),

('IMG_TR_L1_HAPPY', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L1+Guide+Happy', (SELECT id FROM emotion WHERE code = 'HAPPY')),

('IMG_FL_L2_FEAR_1', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L2+Fear+1', (SELECT id FROM emotion WHERE code = 'FEARFUL')),
('IMG_FL_L2_ANGRY_2', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L2+Angry+2', (SELECT id FROM emotion WHERE code = 'ANGRY')),
('IMG_FL_L2_DISGUST_1', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L2+Disgust+1', (SELECT id FROM emotion WHERE code = 'DISGUSTED')),
('IMG_FL_L2_SAD_2', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L2+Sad+2', (SELECT id FROM emotion WHERE code = 'SAD')),

('IMG_CT_L2_THUNDER', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L2+Thunder', (SELECT id FROM emotion WHERE code = 'FEARFUL')),
('IMG_CT_L2_NOISE', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L2+Loud+Noise', (SELECT id FROM emotion WHERE code = 'FEARFUL')),
('IMG_CT_L2_SPILLED', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L2+Spilled+Drink', (SELECT id FROM emotion WHERE code = 'ANGRY')),
('IMG_CT_L2_BAD_SMELL', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L2+Bad+Smell', (SELECT id FROM emotion WHERE code = 'DISGUSTED')),

('IMG_MC_L2_ANGRY_FACE', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L2+Angry+Face', (SELECT id FROM emotion WHERE code = 'ANGRY')),
('IMG_MC_L2_ANGRY_ICON', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L2+Angry+Icon', (SELECT id FROM emotion WHERE code = 'ANGRY')),
('IMG_MC_L2_FEAR_FACE', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L2+Fear+Face', (SELECT id FROM emotion WHERE code = 'FEARFUL')),
('IMG_MC_L2_FEAR_ICON', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L2+Fear+Icon', (SELECT id FROM emotion WHERE code = 'FEARFUL')),
('IMG_MC_L2_DISGUST_FACE', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L2+Disgust+Face', (SELECT id FROM emotion WHERE code = 'DISGUSTED')),
('IMG_MC_L2_DISGUST_ICON', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L2+Disgust+Icon', (SELECT id FROM emotion WHERE code = 'DISGUSTED')),
('IMG_MC_L2_SAD_FACE', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L2+Sad+Face', (SELECT id FROM emotion WHERE code = 'SAD')),
('IMG_MC_L2_SAD_ICON', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L2+Sad+Icon', (SELECT id FROM emotion WHERE code = 'SAD')),

('IMG_TR_L2_ANGRY', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L2+Guide+Angry', (SELECT id FROM emotion WHERE code = 'ANGRY')),

('IMG_FL_L3_SURPRISED_1', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L3+Surprised+1', (SELECT id FROM emotion WHERE code = 'SURPRISED')),
('IMG_FL_L3_DISGUST_2', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L3+Disgust+2', (SELECT id FROM emotion WHERE code = 'DISGUSTED')),
('IMG_FL_L3_HAPPY_3', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L3+Happy+3', (SELECT id FROM emotion WHERE code = 'HAPPY')),
('IMG_FL_L3_FEAR_2', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L3+Fear+2', (SELECT id FROM emotion WHERE code = 'FEARFUL')),

('IMG_CT_L3_SURPRISE_GIFT', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L3+Surprise+Gift', (SELECT id FROM emotion WHERE code = 'SURPRISED')),
('IMG_CT_L3_STAGE', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L3+Stage+Crowd', (SELECT id FROM emotion WHERE code = 'FEARFUL')),
('IMG_CT_L3_SMELL', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L3+Strong+Smell', (SELECT id FROM emotion WHERE code = 'DISGUSTED')),
('IMG_CT_L3_FIREWORK', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L3+Firework', (SELECT id FROM emotion WHERE code = 'SURPRISED')),

('IMG_MC_L3_SURPRISE_FACE', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L3+Surprise+Face', (SELECT id FROM emotion WHERE code = 'SURPRISED')),
('IMG_MC_L3_SURPRISE_ICON', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L3+Surprise+Icon', (SELECT id FROM emotion WHERE code = 'SURPRISED')),
('IMG_MC_L3_DISGUST_FACE', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L3+Disgust+Face', (SELECT id FROM emotion WHERE code = 'DISGUSTED')),
('IMG_MC_L3_DISGUST_ICON', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L3+Disgust+Icon', (SELECT id FROM emotion WHERE code = 'DISGUSTED')),
('IMG_MC_L3_HAPPY_FACE', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L3+Happy+Face', (SELECT id FROM emotion WHERE code = 'HAPPY')),
('IMG_MC_L3_HAPPY_ICON', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L3+Happy+Icon', (SELECT id FROM emotion WHERE code = 'HAPPY')),
('IMG_MC_L3_FEAR_FACE', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L3+Fear+Face', (SELECT id FROM emotion WHERE code = 'FEARFUL')),
('IMG_MC_L3_FEAR_ICON', 'IMAGE', 'https://via.placeholder.com/320x320.png?text=L3+Fear+Icon', (SELECT id FROM emotion WHERE code = 'FEARFUL')),

('IMG_TR_L3_SURPRISED', 'IMAGE', 'https://via.placeholder.com/640x480.png?text=L3+Guide+Surprised', (SELECT id FROM emotion WHERE code = 'SURPRISED'))
ON DUPLICATE KEY UPDATE
url = VALUES(url),
emotion_id = VALUES(emotion_id),
is_active = 1;

-- ==========================================================
-- 8) LESSON CORE SEED DATA
-- ==========================================================

INSERT INTO lesson_core (
    code,
    lesson_type_id,
    emotion_group_id,
    image_id,
    situation_text,
    correct_emotion_id,
    difficulty
)
VALUES
('FC_L1_01', (SELECT id FROM lesson_type WHERE code = 'FLASHCARD'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_FL_L1_HAPPY_1'), 'Ban nho nay dang cam thay gi?', (SELECT id FROM emotion WHERE code = 'HAPPY'), 'EASY'),
('FC_L1_02', (SELECT id FROM lesson_type WHERE code = 'FLASHCARD'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_FL_L1_SAD_1'), 'Khuon mat nay cho thay cam xuc nao?', (SELECT id FROM emotion WHERE code = 'SAD'), 'EASY'),
('FC_L1_03', (SELECT id FROM lesson_type WHERE code = 'FLASHCARD'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_FL_L1_ANGRY_1'), 'Con doan ban ay dang vui hay buc boi?', (SELECT id FROM emotion WHERE code = 'ANGRY'), 'EASY'),
('FC_L1_04', (SELECT id FROM lesson_type WHERE code = 'FLASHCARD'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_FL_L1_HAPPY_2'), 'Nhin net mat nay, cam xuc nao dung nhat?', (SELECT id FROM emotion WHERE code = 'HAPPY'), 'EASY'),

('FC_L2_01', (SELECT id FROM lesson_type WHERE code = 'FLASHCARD'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_FL_L2_FEAR_1'), 'Mat mo to, co ve hoi hoang so. Cam xuc nao?', (SELECT id FROM emotion WHERE code = 'FEARFUL'), 'MEDIUM'),
('FC_L2_02', (SELECT id FROM lesson_type WHERE code = 'FLASHCARD'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_FL_L2_ANGRY_2'), 'Ban ay dang nhin rat gat, day la cam xuc gi?', (SELECT id FROM emotion WHERE code = 'ANGRY'), 'MEDIUM'),
('FC_L2_03', (SELECT id FROM lesson_type WHERE code = 'FLASHCARD'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_FL_L2_DISGUST_1'), 'Neu con thay rat kho chiu, do la cam xuc nao?', (SELECT id FROM emotion WHERE code = 'DISGUSTED'), 'MEDIUM'),
('FC_L2_04', (SELECT id FROM lesson_type WHERE code = 'FLASHCARD'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_FL_L2_SAD_2'), 'Bieu cam nay cho thay ban ay dang ra sao?', (SELECT id FROM emotion WHERE code = 'SAD'), 'MEDIUM'),

('FC_L3_01', (SELECT id FROM lesson_type WHERE code = 'FLASHCARD'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_FL_L3_SURPRISED_1'), 'Khi gap dieu bat ngo, con se co cam xuc nao?', (SELECT id FROM emotion WHERE code = 'SURPRISED'), 'HARD'),
('FC_L3_02', (SELECT id FROM lesson_type WHERE code = 'FLASHCARD'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_FL_L3_DISGUST_2'), 'Khuon mat nay dang the hien su kho chiu nao?', (SELECT id FROM emotion WHERE code = 'DISGUSTED'), 'HARD'),
('FC_L3_03', (SELECT id FROM lesson_type WHERE code = 'FLASHCARD'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_FL_L3_HAPPY_3'), 'Neu con rat vui sau khi hoan thanh bai hoc, con thay sao?', (SELECT id FROM emotion WHERE code = 'HAPPY'), 'HARD'),
('FC_L3_04', (SELECT id FROM lesson_type WHERE code = 'FLASHCARD'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_FL_L3_FEAR_2'), 'Trong tinh huong moi la, cam xuc nao de xuat hien?', (SELECT id FROM emotion WHERE code = 'FEARFUL'), 'HARD'),

('CTX_L1_01', (SELECT id FROM lesson_type WHERE code = 'CONTEXT'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_CT_L1_BIRTHDAY'), 'Hom nay duoc tang qua sinh nhat, ban nho cam thay the nao?', (SELECT id FROM emotion WHERE code = 'HAPPY'), 'EASY'),
('CTX_L1_02', (SELECT id FROM lesson_type WHERE code = 'CONTEXT'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_CT_L1_TOY_BREAK'), 'Do choi yeu thich bi hong, cam xuc nao phu hop nhat?', (SELECT id FROM emotion WHERE code = 'SAD'), 'EASY'),
('CTX_L1_03', (SELECT id FROM lesson_type WHERE code = 'CONTEXT'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_CT_L1_SHARE'), 'Ban chia se do an cho con, con co the thay gi?', (SELECT id FROM emotion WHERE code = 'HAPPY'), 'EASY'),
('CTX_L1_04', (SELECT id FROM lesson_type WHERE code = 'CONTEXT'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_CT_L1_LOST'), 'Con bi lac trong noi dong nguoi, cam xuc nao de xuat hien?', (SELECT id FROM emotion WHERE code = 'FEARFUL'), 'EASY'),

('CTX_L2_01', (SELECT id FROM lesson_type WHERE code = 'CONTEXT'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_CT_L2_THUNDER'), 'Troi mua to va co tieng sam lon, con co the thay the nao?', (SELECT id FROM emotion WHERE code = 'FEARFUL'), 'MEDIUM'),
('CTX_L2_02', (SELECT id FROM lesson_type WHERE code = 'CONTEXT'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_CT_L2_NOISE'), 'Tieng dong bat ngo qua lon lam con giat minh. Cam xuc nao dung?', (SELECT id FROM emotion WHERE code = 'FEARFUL'), 'MEDIUM'),
('CTX_L2_03', (SELECT id FROM lesson_type WHERE code = 'CONTEXT'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_CT_L2_SPILLED'), 'Ban khac vo y lam do uong do vao vo cua con. Con thay sao?', (SELECT id FROM emotion WHERE code = 'ANGRY'), 'MEDIUM'),
('CTX_L2_04', (SELECT id FROM lesson_type WHERE code = 'CONTEXT'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_CT_L2_BAD_SMELL'), 'Mui kho chiu xuat hien gan cho con. Cam xuc nao phu hop?', (SELECT id FROM emotion WHERE code = 'DISGUSTED'), 'MEDIUM'),

('CTX_L3_01', (SELECT id FROM lesson_type WHERE code = 'CONTEXT'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_CT_L3_SURPRISE_GIFT'), 'Con mo hop qua va thay mon do rat bat ngo. Cam xuc nao xuat hien?', (SELECT id FROM emotion WHERE code = 'SURPRISED'), 'HARD'),
('CTX_L3_02', (SELECT id FROM lesson_type WHERE code = 'CONTEXT'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_CT_L3_STAGE'), 'Con sap len san khau truoc dong nguoi. Cam xuc nao de co?', (SELECT id FROM emotion WHERE code = 'FEARFUL'), 'HARD'),
('CTX_L3_03', (SELECT id FROM lesson_type WHERE code = 'CONTEXT'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_CT_L3_SMELL'), 'Mui qua nong trong lop hoc lam con rat kho chiu. Cam xuc nao?', (SELECT id FROM emotion WHERE code = 'DISGUSTED'), 'HARD'),
('CTX_L3_04', (SELECT id FROM lesson_type WHERE code = 'CONTEXT'), (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_CT_L3_FIREWORK'), 'Phao hoa bat ngo no tren troi. Cam xuc phu hop nhat la?', (SELECT id FROM emotion WHERE code = 'SURPRISED'), 'HARD')
ON DUPLICATE KEY UPDATE
lesson_type_id = VALUES(lesson_type_id),
emotion_group_id = VALUES(emotion_group_id),
image_id = VALUES(image_id),
situation_text = VALUES(situation_text),
correct_emotion_id = VALUES(correct_emotion_id),
difficulty = VALUES(difficulty),
is_active = 1;

-- Auto-create options for all flashcard/context lessons (6 emotion choices each).
INSERT INTO lesson_option (core_lesson_id, emotion_id, option_text, is_correct, display_order)
SELECT
    lc.id,
    e.id,
    e.name,
    CASE WHEN e.id = lc.correct_emotion_id THEN 1 ELSE 0 END AS is_correct,
    FIELD(e.code, 'HAPPY', 'SAD', 'ANGRY', 'FEARFUL', 'SURPRISED', 'DISGUSTED')
FROM lesson_core lc
JOIN emotion e
WHERE lc.lesson_type_id IN (
    SELECT id FROM lesson_type WHERE code IN ('FLASHCARD', 'CONTEXT')
)
ON DUPLICATE KEY UPDATE
option_text = VALUES(option_text),
is_correct = VALUES(is_correct),
display_order = VALUES(display_order);

-- ==========================================================
-- 9) MATCHING SEED DATA
-- ==========================================================

INSERT INTO matching_card (code, emotion_group_id, image_id, emotion_id, pair_key, display_order)
VALUES
('MC_L1_01_A', (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L1_HAPPY_FACE'), (SELECT id FROM emotion WHERE code = 'HAPPY'), 'L1_HAPPY_01', 1),
('MC_L1_01_B', (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L1_HAPPY_ICON'), (SELECT id FROM emotion WHERE code = 'HAPPY'), 'L1_HAPPY_01', 2),
('MC_L1_02_A', (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L1_SAD_FACE'), (SELECT id FROM emotion WHERE code = 'SAD'), 'L1_SAD_01', 3),
('MC_L1_02_B', (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L1_SAD_ICON'), (SELECT id FROM emotion WHERE code = 'SAD'), 'L1_SAD_01', 4),
('MC_L1_03_A', (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L1_ANGRY_FACE'), (SELECT id FROM emotion WHERE code = 'ANGRY'), 'L1_ANGRY_01', 5),
('MC_L1_03_B', (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L1_ANGRY_ICON'), (SELECT id FROM emotion WHERE code = 'ANGRY'), 'L1_ANGRY_01', 6),
('MC_L1_04_A', (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L1_FEAR_FACE'), (SELECT id FROM emotion WHERE code = 'FEARFUL'), 'L1_FEAR_01', 7),
('MC_L1_04_B', (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L1_FEAR_ICON'), (SELECT id FROM emotion WHERE code = 'FEARFUL'), 'L1_FEAR_01', 8),

('MC_L2_01_A', (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L2_ANGRY_FACE'), (SELECT id FROM emotion WHERE code = 'ANGRY'), 'L2_ANGRY_01', 1),
('MC_L2_01_B', (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L2_ANGRY_ICON'), (SELECT id FROM emotion WHERE code = 'ANGRY'), 'L2_ANGRY_01', 2),
('MC_L2_02_A', (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L2_FEAR_FACE'), (SELECT id FROM emotion WHERE code = 'FEARFUL'), 'L2_FEAR_01', 3),
('MC_L2_02_B', (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L2_FEAR_ICON'), (SELECT id FROM emotion WHERE code = 'FEARFUL'), 'L2_FEAR_01', 4),
('MC_L2_03_A', (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L2_DISGUST_FACE'), (SELECT id FROM emotion WHERE code = 'DISGUSTED'), 'L2_DISGUST_01', 5),
('MC_L2_03_B', (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L2_DISGUST_ICON'), (SELECT id FROM emotion WHERE code = 'DISGUSTED'), 'L2_DISGUST_01', 6),
('MC_L2_04_A', (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L2_SAD_FACE'), (SELECT id FROM emotion WHERE code = 'SAD'), 'L2_SAD_01', 7),
('MC_L2_04_B', (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L2_SAD_ICON'), (SELECT id FROM emotion WHERE code = 'SAD'), 'L2_SAD_01', 8),

('MC_L3_01_A', (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L3_SURPRISE_FACE'), (SELECT id FROM emotion WHERE code = 'SURPRISED'), 'L3_SURPRISE_01', 1),
('MC_L3_01_B', (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L3_SURPRISE_ICON'), (SELECT id FROM emotion WHERE code = 'SURPRISED'), 'L3_SURPRISE_01', 2),
('MC_L3_02_A', (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L3_DISGUST_FACE'), (SELECT id FROM emotion WHERE code = 'DISGUSTED'), 'L3_DISGUST_01', 3),
('MC_L3_02_B', (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L3_DISGUST_ICON'), (SELECT id FROM emotion WHERE code = 'DISGUSTED'), 'L3_DISGUST_01', 4),
('MC_L3_03_A', (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L3_HAPPY_FACE'), (SELECT id FROM emotion WHERE code = 'HAPPY'), 'L3_HAPPY_01', 5),
('MC_L3_03_B', (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L3_HAPPY_ICON'), (SELECT id FROM emotion WHERE code = 'HAPPY'), 'L3_HAPPY_01', 6),
('MC_L3_04_A', (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L3_FEAR_FACE'), (SELECT id FROM emotion WHERE code = 'FEARFUL'), 'L3_FEAR_01', 7),
('MC_L3_04_B', (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'), (SELECT id FROM media_asset WHERE code = 'IMG_MC_L3_FEAR_ICON'), (SELECT id FROM emotion WHERE code = 'FEARFUL'), 'L3_FEAR_01', 8)
ON DUPLICATE KEY UPDATE
emotion_group_id = VALUES(emotion_group_id),
image_id = VALUES(image_id),
emotion_id = VALUES(emotion_id),
pair_key = VALUES(pair_key),
display_order = VALUES(display_order),
is_active = 1;

-- ==========================================================
-- 10) TRAINING + AI LESSON SEED DATA
-- ==========================================================

INSERT INTO lesson_training_ai (
    code,
    lesson_type_id,
    emotion_group_id,
    target_emotion_id,
    instruction,
    media_guide_id,
    video_url,
    success_message,
    tips,
    difficulty
)
VALUES
(
    'TR_L1_HAPPY',
    (SELECT id FROM lesson_type WHERE code = 'TRAINING'),
    (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'),
    (SELECT id FROM emotion WHERE code = 'HAPPY'),
    'Hay cuoi tuoi va mo khoe mat de the hien su vui ve.',
    (SELECT id FROM media_asset WHERE code = 'IMG_TR_L1_HAPPY'),
    NULL,
    'Rat tot! Con da the hien duoc su vui ve.',
    'Nho nang khoe moi va giu nu cuoi 2-3 giay.',
    'EASY'
),
(
    'TR_L2_ANGRY',
    (SELECT id FROM lesson_type WHERE code = 'TRAINING'),
    (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'),
    (SELECT id FROM emotion WHERE code = 'ANGRY'),
    'Thu nheo may nhe va giu guong mat nghiem tuc.',
    (SELECT id FROM media_asset WHERE code = 'IMG_TR_L2_ANGRY'),
    NULL,
    'Tot! Con da biet cach the hien su buc boi.',
    'Khong can la het, chi can bieu cam tren khuon mat.',
    'MEDIUM'
),
(
    'TR_L3_SURPRISED',
    (SELECT id FROM lesson_type WHERE code = 'TRAINING'),
    (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'),
    (SELECT id FROM emotion WHERE code = 'SURPRISED'),
    'Mo to mat va mieng de the hien su bat ngo.',
    (SELECT id FROM media_asset WHERE code = 'IMG_TR_L3_SURPRISED'),
    NULL,
    'Xuat sac! Bieu cam bat ngo rat ro rang.',
    'Tap trung vao doi mat de AI nhan dien de hon.',
    'HARD'
),
(
    'AI_L1_SAD',
    (SELECT id FROM lesson_type WHERE code = 'AI'),
    (SELECT id FROM emotion_group WHERE code = 'LEVEL_1'),
    (SELECT id FROM emotion WHERE code = 'SAD'),
    'Xem mau va the hien cam xuc buon ba truoc camera.',
    NULL,
    'https://www.youtube.com/embed/2iWfV5xU0c8',
    'Con da mo ta cam xuc buon ba kha tot.',
    'Ha nhe khoe mieng va nhin cham vao camera.',
    'EASY'
),
(
    'AI_L2_FEARFUL',
    (SELECT id FROM lesson_type WHERE code = 'AI'),
    (SELECT id FROM emotion_group WHERE code = 'LEVEL_2'),
    (SELECT id FROM emotion WHERE code = 'FEARFUL'),
    'The hien su so hai bang anh mat va net mat.',
    NULL,
    'https://www.youtube.com/embed/6X7R71f7z-0',
    'Con da tien bo ro khi the hien su so hai.',
    'Mat mo to hon va giu guong mat trong 2 giay.',
    'MEDIUM'
),
(
    'AI_L3_DISGUSTED',
    (SELECT id FROM lesson_type WHERE code = 'AI'),
    (SELECT id FROM emotion_group WHERE code = 'LEVEL_3'),
    (SELECT id FROM emotion WHERE code = 'DISGUSTED'),
    'Thu the hien cam xuc ghe tom trong tinh huong kho chiu.',
    NULL,
    'https://www.youtube.com/embed/e8A9J94UWI8',
    'Con da biet cach the hien cam xuc kho chiu rat ro.',
    'Nho bieu cam o mui va mieng de giong hon.',
    'HARD'
)
ON DUPLICATE KEY UPDATE
lesson_type_id = VALUES(lesson_type_id),
emotion_group_id = VALUES(emotion_group_id),
target_emotion_id = VALUES(target_emotion_id),
instruction = VALUES(instruction),
media_guide_id = VALUES(media_guide_id),
video_url = VALUES(video_url),
success_message = VALUES(success_message),
tips = VALUES(tips),
difficulty = VALUES(difficulty),
is_active = 1;

-- ==========================================================
-- 11) GAMIFICATION SEED DATA
-- ==========================================================

INSERT INTO badges (code, name, description, icon_emoji, criteria_type, criteria_value, xp_reward)
VALUES
('FIRST_LESSON', 'Buoc dau tien', 'Hoan thanh bai hoc dau tien', 'TARGET', 'GAMES_PLAYED', 1, 10),
('STREAK_3', 'Ngoi sao kien tri', 'Hoc 3 ngay lien tiep', 'FIRE', 'STREAK', 3, 20),
('STREAK_7', 'Sieu ben bi', 'Hoc 7 ngay lien tiep', 'STRONG', 'STREAK', 7, 50),
('LEVEL_1_DONE', 'Dao vui ve', 'Hoan thanh Level 1', 'ISLAND', 'LEVEL', 1, 30),
('LEVEL_2_DONE', 'Dao dung cam', 'Hoan thanh Level 2', 'MOUNTAIN', 'LEVEL', 2, 50),
('LEVEL_3_DONE', 'Dao ky dieu', 'Hoan thanh Level 3', 'RAINBOW', 'LEVEL', 3, 100),
('PERFECT_SCORE', 'Hoan hao', 'Dat 100% trong 1 bai', 'STAR', 'SCORE', 100, 30),
('EMOTION_MASTER', 'Bac thay bieu cam', 'Luyen bieu cam 10 lan', 'MASK', 'EMOTION_PRACTICE', 10, 40),
('GAMES_10', 'Cham chi', 'Hoan thanh 10 bai hoc', 'GAMEPAD', 'GAMES_PLAYED', 10, 25),
('GAMES_50', 'Chien binh', 'Hoan thanh 50 bai hoc', 'SWORD', 'GAMES_PLAYED', 50, 100)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
description = VALUES(description),
icon_emoji = VALUES(icon_emoji),
criteria_type = VALUES(criteria_type),
criteria_value = VALUES(criteria_value),
xp_reward = VALUES(xp_reward),
is_active = 1;

-- ==========================================================
-- 12) QUICK CHECK
-- ==========================================================

SELECT 'emotion_group' AS table_name, COUNT(*) AS total_rows FROM emotion_group
UNION ALL
SELECT 'emotion', COUNT(*) FROM emotion
UNION ALL
SELECT 'lesson_type', COUNT(*) FROM lesson_type
UNION ALL
SELECT 'media_asset', COUNT(*) FROM media_asset
UNION ALL
SELECT 'lesson_core', COUNT(*) FROM lesson_core
UNION ALL
SELECT 'lesson_option', COUNT(*) FROM lesson_option
UNION ALL
SELECT 'matching_card', COUNT(*) FROM matching_card
UNION ALL
SELECT 'lesson_training_ai', COUNT(*) FROM lesson_training_ai
UNION ALL
SELECT 'badges', COUNT(*) FROM badges;

-- End of file
