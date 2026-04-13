-- ========================================
-- EmpathyKids v2 — Database Migration
-- Chạy sau khi import db2.sql
-- ========================================

-- 1. Emotion Sessions (lưu phiên tracking cảm xúc)
CREATE TABLE IF NOT EXISTS emotion_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_type ENUM('REALTIME', 'PRACTICE', 'GAME') NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    dominant_emotion VARCHAR(20),
    avg_confidence TINYINT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 2. Emotion Snapshots (từng frame detect)
CREATE TABLE IF NOT EXISTS emotion_snapshots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    dominant VARCHAR(20) NOT NULL,
    neutral TINYINT DEFAULT 0,
    happy TINYINT DEFAULT 0,
    sad TINYINT DEFAULT 0,
    angry TINYINT DEFAULT 0,
    fearful TINYINT DEFAULT 0,
    disgusted TINYINT DEFAULT 0,
    surprised TINYINT DEFAULT 0,
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES emotion_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_time (session_id, captured_at)
);

-- 3. Badges (huy hiệu gamification)
CREATE TABLE IF NOT EXISTS badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_emoji VARCHAR(20),
    criteria_type ENUM('STREAK', 'SCORE', 'LEVEL', 'GAMES_PLAYED', 'EMOTION_PRACTICE') NOT NULL,
    criteria_value INT NOT NULL,
    xp_reward INT DEFAULT 10
);

-- 4. User Badges (user đã đạt badge nào)
CREATE TABLE IF NOT EXISTS user_badges (
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id)
);

-- 5. Daily Quests (nhiệm vụ hàng ngày)
CREATE TABLE IF NOT EXISTS daily_quests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quest_date DATE NOT NULL,
    quest_type ENUM('COMPLETE_LESSON', 'PRACTICE_EMOTION', 'TRACKING_SESSION', 'PERFECT_SCORE') NOT NULL,
    quest_description TEXT,
    xp_reward INT DEFAULT 10,
    is_completed TINYINT DEFAULT 0,
    completed_at DATETIME,
    UNIQUE KEY (user_id, quest_date, quest_type),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 6. Emotion Alerts (cảnh báo cảm xúc bất thường)
CREATE TABLE IF NOT EXISTS emotion_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    alert_type ENUM('PROLONGED_SADNESS', 'HIGH_ANGER', 'LOW_ENGAGEMENT', 'SUDDEN_CHANGE', 'PROLONGED_NEGATIVE', 'EMOTION_DIFFICULTY') NOT NULL,
    description TEXT,
    session_id INT,
    is_read TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Mở rộng enum cho hệ thống cảnh báo rule-based mới (an toàn với DB đã có bảng).
ALTER TABLE emotion_alerts
MODIFY COLUMN alert_type ENUM('PROLONGED_SADNESS', 'HIGH_ANGER', 'LOW_ENGAGEMENT', 'SUDDEN_CHANGE', 'PROLONGED_NEGATIVE', 'EMOTION_DIFFICULTY') NOT NULL;

-- Thay thế đoạn cuối file migration_v2.sql bằng đoạn này:

-- 7. Thêm XP & Level vào bảng user
-- Nếu bạn chạy lệnh này bị báo "Duplicate column", nghĩa là cột đã tồn tại rồi, bạn có thể bỏ qua.
ALTER TABLE user ADD COLUMN xp INT DEFAULT 0;
ALTER TABLE user ADD COLUMN user_level INT DEFAULT 1;

-- ========================================
-- SEED DATA: Badges
-- ========================================
INSERT IGNORE INTO badges (code, name, description, icon_emoji, criteria_type, criteria_value, xp_reward) VALUES
('FIRST_LESSON', 'Bước Đầu Tiên', 'Hoàn thành bài học đầu tiên', '🎯', 'GAMES_PLAYED', 1, 10),
('STREAK_3', 'Ngôi Sao Kiên Trì', 'Học 3 ngày liên tiếp', '🔥', 'STREAK', 3, 20),
('STREAK_7', 'Siêu Bền Bỉ', 'Học 7 ngày liên tiếp', '💪', 'STREAK', 7, 50),
('LEVEL_1_DONE', 'Đảo Vui Vẻ', 'Hoàn thành Level 1', '🏝️', 'LEVEL', 1, 30),
('LEVEL_2_DONE', 'Đảo Dũng Cảm', 'Hoàn thành Level 2', '🏔️', 'LEVEL', 2, 50),
('LEVEL_3_DONE', 'Đảo Kỳ Diệu', 'Hoàn thành Level 3', '🌈', 'LEVEL', 3, 100),
('PERFECT_SCORE', 'Hoàn Hảo', '100% trong 1 bài', '⭐', 'SCORE', 100, 30),
('EMOTION_MASTER', 'Bậc Thầy', 'Luyện biểu cảm 10 lần', '🎭', 'EMOTION_PRACTICE', 10, 40),
('GAMES_10', 'Chăm Chỉ', '10 bài học hoàn thành', '🎮', 'GAMES_PLAYED', 10, 25),
('GAMES_50', 'Chiến Binh', '50 bài học hoàn thành', '⚔️', 'GAMES_PLAYED', 50, 100);

