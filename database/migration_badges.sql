-- ========================================================
-- MIGRATION: Thêm hệ thống Huy Hiệu (Badge System)
-- Chạy file này một lần để cập nhật database
-- ========================================================

USE empathykids_prod;

-- Bảng định nghĩa huy hiệu
CREATE TABLE IF NOT EXISTS badge_definition (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_emoji VARCHAR(20) NOT NULL DEFAULT '🏅',
    category VARCHAR(50) DEFAULT 'general', -- 'streak', 'level', 'emotion', 'star', 'perfect'
    unlock_condition JSON,                   -- JSON mô tả điều kiện
    sort_order INT DEFAULT 0
);

-- Bảng huy hiệu người dùng đã đạt được
CREATE TABLE IF NOT EXISTS user_badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_badge (user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badge_definition(id) ON DELETE CASCADE
);

-- ========================================================
-- Dữ liệu huy hiệu mẫu
-- ========================================================

INSERT IGNORE INTO badge_definition (code, name, description, icon_emoji, category, sort_order) VALUES
-- Streak badges
('STREAK_3',   '🔥 Học 3 ngày liên tiếp',   'Duy trì học tập 3 ngày liên tiếp không nghỉ', '🔥',  'streak', 10),
('STREAK_7',   '🔥 Siêu liên tiếp 7 ngày',   'Duy trì học tập 7 ngày liên tiếp không nghỉ', '🔥🔥', 'streak', 11),
('STREAK_14',  '🔥 Anh hùng 2 tuần',          'Duy trì học tập 14 ngày liên tiếp',            '🌋',  'streak', 12),

-- First lesson
('FIRST_LESSON',  '🌱 Bước đầu tiên',       'Hoàn thành bài học đầu tiên', '🌱', 'general', 1),
('LESSON_10',     '📚 Người học chăm chỉ',  'Hoàn thành 10 bài học',        '📚', 'general', 2),
('LESSON_50',     '🎓 Học giả nhí',          'Hoàn thành 50 bài học',        '🎓', 'general', 3),

-- Level completion
('LEVEL1_COMPLETE', '🏆 Chinh phục Cấp 1',  'Hoàn thành tất cả bài học Cấp độ 1', '🥉', 'level', 20),
('LEVEL2_COMPLETE', '🏆 Chinh phục Cấp 2',  'Hoàn thành tất cả bài học Cấp độ 2', '🥈', 'level', 21),
('LEVEL3_COMPLETE', '🏆 Chinh phục Cấp 3',  'Hoàn thành tất cả bài học Cấp độ 3', '🥇', 'level', 22),

-- Star collection
('STAR_10',   '⭐ Thu thập sao',    'Tích lũy được 10 ngôi sao',  '⭐',  'star', 30),
('STAR_50',   '🌟 Ngôi sao vàng',   'Tích lũy được 50 ngôi sao',  '🌟',  'star', 31),
('STAR_100',  '💫 Siêu sao',        'Tích lũy được 100 ngôi sao', '💫',  'star', 32),

-- Emotion specific
('HAPPY_EXPERT',   '😊 Chuyên gia Vui vẻ',   'Trả lời đúng 5 câu Vui vẻ liên tiếp',  '😊', 'emotion', 40),
('SAD_EXPERT',     '😢 Thám tử Buồn bã',     'Trả lời đúng 5 câu Buồn bã liên tiếp', '😢', 'emotion', 41),
('ANGRY_EXPERT',   '😠 Hiểu Tức giận',       'Trả lời đúng 5 câu Tức giận liên tiếp','😠', 'emotion', 42),
('FEAR_EXPERT',    '😨 Vượt qua Sợ hãi',     'Trả lời đúng 5 câu Sợ hãi liên tiếp',  '😨', 'emotion', 43),

-- Perfect score
('PERFECT_FLASHCARD', '🃏 Flashcard Hoàn hảo', 'Trả lời đúng 100% một bài Flashcard', '🃏', 'perfect', 50),
('PERFECT_CONTEXT',   '📖 Ngữ cảnh Xuất sắc',  'Trả lời đúng 100% một bài Ngữ cảnh',  '📖', 'perfect', 51),
('PERFECT_MATCHING',  '🧩 Ghép cặp Điêu luyện','Hoàn thành Ghép cặp không sai lần nào','🧩', 'perfect', 52);

SELECT CONCAT('✅ Migration hoàn thành! Đã thêm ', COUNT(*), ' huy hiệu.') AS Status
FROM badge_definition;
