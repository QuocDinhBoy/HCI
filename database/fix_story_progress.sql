-- ========================================================
-- FIX: Tạo bảng user_story_progress (không có FK user_id)
-- Chạy file này nếu migration_stories.sql bị lỗi ở bảng này
-- ========================================================

USE empathykids_prod;

-- Xóa nếu đã tạo lỗi trước đó
DROP TABLE IF EXISTS user_story_progress;

CREATE TABLE user_story_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    story_id INT NOT NULL,
    completed TINYINT(1) NOT NULL DEFAULT 0,
    last_page_order INT NOT NULL DEFAULT 1,
    ending_type VARCHAR(20),
    completed_at DATETIME,
    UNIQUE KEY uq_user_story (user_id, story_id),
    FOREIGN KEY (story_id) REFERENCES emotion_story(id) ON DELETE CASCADE
);

SELECT '✅ user_story_progress tạo thành công!' AS Status;
