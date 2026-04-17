-- ========================================================
-- MIGRATION v2: Kho Truyện Cảm Xúc — Truyện dài, tương tác thật
-- DROP toàn bộ và tạo lại để tránh xung đột
-- ========================================================

USE empathykids_prod;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS user_story_progress;
DROP TABLE IF EXISTS story_choice;
DROP TABLE IF EXISTS story_page;
DROP TABLE IF EXISTS emotion_story;
SET FOREIGN_KEY_CHECKS = 1;

-- ── Bảng truyện ─────────────────────────────────────────────
CREATE TABLE emotion_story (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    emotion_tag VARCHAR(50) NOT NULL DEFAULT 'Vui vẻ',
    cover_emoji VARCHAR(20) NOT NULL DEFAULT '📖',
    cover_bg VARCHAR(50) NOT NULL DEFAULT '#DAEEFF',
    difficulty INT NOT NULL DEFAULT 1,
    estimated_minutes INT NOT NULL DEFAULT 5,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Bảng trang truyện (có next_page_order cho branching) ────
CREATE TABLE story_page (
    id INT AUTO_INCREMENT PRIMARY KEY,
    story_id INT NOT NULL,
    page_order INT NOT NULL,
    page_type ENUM('narration','dialogue','choice','consequence','ending') NOT NULL DEFAULT 'narration',
    scene_emoji VARCHAR(100) DEFAULT '🏠',
    scene_bg VARCHAR(50) DEFAULT '#FFF9F0',
    character_name VARCHAR(100),
    character_emoji VARCHAR(20),
    character_mood VARCHAR(50),          -- vui, buồn, tức giận, sợ hãi, thản nhiên
    content TEXT NOT NULL,
    emotion_hint VARCHAR(50),
    next_page_order INT DEFAULT NULL,    -- NULL = trang kế tiếp theo thứ tự
    is_ending TINYINT(1) NOT NULL DEFAULT 0,
    ending_type ENUM('good','neutral','learning') DEFAULT NULL,
    lesson_text TEXT,
    FOREIGN KEY (story_id) REFERENCES emotion_story(id) ON DELETE CASCADE
);

-- ── Bảng lựa chọn ───────────────────────────────────────────
CREATE TABLE story_choice (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id INT NOT NULL,
    choice_text VARCHAR(300) NOT NULL,
    choice_emoji VARCHAR(20) DEFAULT '👉',
    result_emoji VARCHAR(20) DEFAULT '💬',  -- emoji phản ứng khi chọn
    result_label VARCHAR(100),              -- nhãn ngắn kết quả
    next_page_order INT NOT NULL,
    FOREIGN KEY (page_id) REFERENCES story_page(id) ON DELETE CASCADE
);

-- ── Bảng tiến độ user (không có FK user để tránh lỗi type) ──
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

-- ============================================================
-- TRUYỆN 1: SINH NHẬT BẤT NGỜ (cảm xúc VUI VẺ)  —  15 trang
-- 3 điểm lựa chọn, 2 nhánh kết
-- ============================================================

INSERT INTO emotion_story (title, description, emotion_tag, cover_emoji, cover_bg, difficulty, estimated_minutes, sort_order)
VALUES ('Sinh nhật bất ngờ', 'Hôm nay là sinh nhật của Nam! Mẹ có một bí mật đặc biệt. Hãy giúp Nam học cách bày tỏ niềm vui của mình nhé!', 'Vui vẻ', '🎂', '#FFF8D6', 1, 6, 1);
SET @S1 = LAST_INSERT_ID();

INSERT INTO story_page (story_id, page_order, page_type, scene_emoji, scene_bg, character_name, character_emoji, character_mood, content, emotion_hint, next_page_order) VALUES
-- SETUP
(@S1,  1, 'narration',  '🌅', '#FFF8E8', NULL,    NULL,  NULL,        'Buổi sáng hôm nay, Nam thức dậy và thấy trong phòng có điều gì đó... khác thường. Những quả bóng bay treo khắp nơi!',                                    'Tò mò',     2),
(@S1,  2, 'narration',  '🎈', '#FFF8E8', NULL,    NULL,  NULL,        'Nam đếm: đỏ... vàng... xanh... Có đến 10 quả bóng bay! Hôm nay là ngày gì vậy?',                                                                             'Tò mò',     3),
(@S1,  3, 'dialogue',   '🏠', '#FFF0D6', 'Mẹ',   '👩',  'vui',       '«Chúc mừng sinh nhật con yêu! Con đã 7 tuổi rồi đấy! Mẹ có một món quà bí mật dành cho con!»',                                                              'Vui vẻ',    4),
-- CHOICE POINT 1: Phản ứng khi nhận tin có quà
(@S1,  4, 'choice',     '🎁', '#FFF0D6', NULL,    NULL,  NULL,        'Mẹ cầm ra một hộp quà to được bọc giấy đỏ với nơ vàng lấp lánh. Nam cảm thấy người nóng bừng, tim đập nhanh hơn... Nam nên làm gì?',                       'Hồi hộp',   NULL),
-- NHÁNH A: Phản ứng tốt
(@S1,  5, 'consequence','🎉', '#D8F5E8', 'Nam',  '👦',  'vui',       'Nam vỗ tay và nhảy lên: «Ôi quà! Quà! Con muốn mở ngay!» Mẹ cười thật to và ánh mắt mẹ sáng lên!',                                                         'Vui vẻ',    7),
-- NHÁNH B: Phản ứng chưa tốt
(@S1,  6, 'consequence','😶', '#EDE8FF', 'Mẹ',  '👩',  'nhẹ nhàng', 'Nam đứng im, không biết phải làm gì. Mẹ ngồi xuống ôm Nam: «Con có thích quà không? Nếu vui thì con có thể nhảy lên hoặc vỗ tay để mẹ biết nhé!»',          'Học cách bày tỏ', 7),
-- TIẾP TỤC: Mở quà
(@S1,  7, 'narration',  '🎁', '#FFF8D6', NULL,   NULL,  NULL,        'Nam từ từ mở hộp quà. Giấy đỏ xào xạo. Nơ vàng rơi xuống sàn. Và bên trong là...',                                                                          'Hồi hộp',   8),
(@S1,  8, 'dialogue',   '🧸', '#FFF8D6', 'Nam',  '👦', 'ngạc nhiên','«...một chú GẤU BÔNG to bằng nửa người Nam!» Nam ôm gấu bông, mặt áp vào bụng gấu. Mềm quá!',                                                                'Vui vẻ',    9),
(@S1,  9, 'narration',  '💛', '#FFF8D6', NULL,   NULL,  NULL,        'Trong bụng Nam có một cảm giác ấm áp, nhẹ bỗng. Như có ánh nắng chiếu vào trong lòng. Đây chính là cảm giác VUI VẺ!',                                        'Vui vẻ',    10),
-- CHOICE POINT 2: Nói cảm ơn
(@S1, 10, 'choice',     '🗣️', '#FFF0D6', NULL,   NULL,  NULL,        'Mẹ nhìn Nam và hỏi: «Con có thích con gấu không?» ——  Đây là lúc Nam nên nói điều gì?',                                                                     'Vui vẻ',    NULL),
-- NHÁNH A: Nói cảm ơn
(@S1, 11, 'consequence','😊', '#D8F5E8', 'Nam',  '👦', 'vui',       '«Con thích lắm! Cảm ơn mẹ nhiều nhiều ạ!» Nam ôm mẹ thật chặt. Mẹ cũng ôm Nam và hôn lên má. Khi mình nói lên niềm vui, mọi người đều hạnh phúc theo!',     'Vui vẻ',    13),
-- NHÁNH B: Im lặng
(@S1, 12, 'consequence','😕', '#EDE8FF', 'Mẹ',  '👩', 'lo lắng',  'Nam chỉ gật đầu và ôm gấu, không nói gì. Mẹ nhìn Nam với ánh mắt lo lắng: «Mẹ không biết con có vui không vì con không nói...» Hãy thử nói với mẹ nhé!',     'Học cách nói', 13),
-- TIẾP TỤC: Bố bước vào
(@S1, 13, 'dialogue',   '🚶', '#FFF8D6', 'Bố',  '👨', 'vui',       '«Ồ! Có tiệc sinh nhật mà không gọi bố à?» Bố bước vào, tay cầm bánh kem có 7 ngọn nến!',                                                                     'Ngạc nhiên', 14),
-- CHOICE POINT 3: Chia sẻ niềm vui với Bố
(@S1, 14, 'choice',     '🎂', '#FFF0D6', NULL,   NULL,  NULL,        'Bố hỏi: «Nam ơi, hôm nay sinh nhật vui không?» — Nam trả lời bố như thế nào?',                                                                               'Vui vẻ',    NULL),
-- NHÁNH A: GOOD ENDING
(@S1, 15, 'ending',     '🌟', '#FFF8D6', 'Nam',  '👦', 'vui',       '«Vui lắm bố ơi! Mẹ tặng con gấu bông này! Con yêu mẹ và bố nhiều lắm!» Cả nhà ôm nhau, cùng thổi nến và cười thật to. Tiệc sinh nhật tuyệt vời nhất!',     'Vui vẻ',    NULL),
-- NHÁNH B: LEARNING ENDING  
(@S1, 16, 'ending',     '💡', '#EDE8FF', NULL,   NULL,  NULL,        'Nam chỉ nhún vai. Bố và Mẹ nhìn nhau, không biết Nam có vui không... Khi mình không nói gì, người thân không biết cách chia vui cùng mình.',                'Học cách chia sẻ', NULL);

UPDATE story_page SET is_ending=1, ending_type='good',     lesson_text='Khi vui vẻ, hãy nói lên: "Con vui lắm!" hoặc "Cảm ơn!". Nụ cười và lời cảm ơn làm cho mọi người xung quanh cùng hạnh phúc!' WHERE story_id=@S1 AND page_order=15;
UPDATE story_page SET is_ending=1, ending_type='learning', lesson_text='Khi vui vẻ, con có thể: vỗ tay, nhảy lên, nói "Con vui lắm!", hoặc ôm người mình yêu. Hãy cho mọi người biết con đang vui nhé!' WHERE story_id=@S1 AND page_order=16;

-- Lựa chọn trang 4
SET @P = (SELECT id FROM story_page WHERE story_id=@S1 AND page_order=4);
INSERT INTO story_choice (page_id, choice_text, choice_emoji, result_emoji, result_label, next_page_order) VALUES
(@P, 'Vỗ tay và nhảy lên "Quà! Quà! Con muốn mở ngay!"', '🎉', '😄', 'Nam bày tỏ niềm vui!', 5),
(@P, 'Đứng im và không làm gì', '😶', '😕', 'Nam chưa biết làm gì...', 6);

-- Lựa chọn trang 10
SET @P = (SELECT id FROM story_page WHERE story_id=@S1 AND page_order=10);
INSERT INTO story_choice (page_id, choice_text, choice_emoji, result_emoji, result_label, next_page_order) VALUES
(@P, '"Con thích lắm! Cảm ơn mẹ nhiều nhiều ạ!" và ôm mẹ', '🤗', '😊', 'Nam nói lên niềm vui!', 11),
(@P, 'Gật đầu và ôm gấu, không nói gì', '😶', '😕', 'Mẹ không biết Nam vui không...', 12);

-- Lựa chọn trang 14
SET @P = (SELECT id FROM story_page WHERE story_id=@S1 AND page_order=14);
INSERT INTO story_choice (page_id, choice_text, choice_emoji, result_emoji, result_label, next_page_order) VALUES
(@P, '"Vui lắm bố! Mẹ tặng con gấu bông rồi! Con yêu mẹ và bố!"', '🌟', '🎉', 'Cả nhà cùng vui!', 15),
(@P, 'Nhún vai và không trả lời', '😶', '😕', 'Bố không biết Nam vui không...', 16);

-- ============================================================
-- TRUYỆN 2: GẤU BÔNG BỊ MẤT (cảm xúc BUỒN BÃ)  —  16 trang
-- 3 điểm lựa chọn, dạy trẻ nhận ra và nói ra cảm xúc buồn
-- ============================================================

INSERT INTO emotion_story (title, description, emotion_tag, cover_emoji, cover_bg, difficulty, estimated_minutes, sort_order)
VALUES ('Gấu bông bị mất', 'Lan không tìm thấy chú gấu bông yêu thích của mình. Trái tim Lan nặng trĩu. Hãy giúp Lan nhận ra cảm xúc và nói lên điều mình cần!', 'Buồn bã', '🧸', '#E0F2FF', 1, 7, 2);
SET @S2 = LAST_INSERT_ID();

INSERT INTO story_page (story_id, page_order, page_type, scene_emoji, scene_bg, character_name, character_emoji, character_mood, content, emotion_hint, next_page_order) VALUES
-- SETUP
(@S2,  1, 'narration',  '🌙', '#E8F4FF', NULL,   NULL,  NULL,       'Buổi tối, Lan chuẩn bị đi ngủ. Cô bé với tay lên gối để lấy chú gấu bông... nhưng gấu không có ở đó.',                                                      'Bình thường', 2),
(@S2,  2, 'narration',  '🔍', '#E8F4FF', NULL,   NULL,  NULL,       'Lan nhìn dưới gầm giường. Không có. Lan mở tủ đồ chơi. Không có. Lan chạy ra phòng khách. Cũng không có!',                                                   'Lo lắng',    3),
(@S2,  3, 'narration',  '💧', '#DAEEFF', NULL,   NULL,  NULL,       'Lan ngồi xuống sàn. Mắt bắt đầu cay cay. Cổ họng như có gì đó chặn lại. Bụng nặng nặng. Tim có tiếng thở dài...',                                            'Buồn bã',    4),
-- CHOICE POINT 1: Nhận ra cảm xúc buồn
(@S2,  4, 'choice',     '❓', '#DAEEFF', NULL,   NULL,  NULL,       'Cổ họng nghẹn, mắt cay, bụng nặng... Đây là cảm giác gì? Lan đang cảm thấy thế nào?',                                                                         'Buồn bã',    NULL),
-- NHÁNH A: Nhận ra đúng
(@S2,  5, 'consequence','💙', '#DAEEFF', NULL,   NULL,  NULL,       'Đúng rồi! Lan đang BUỒN. Cảm giác buồn khi mất thứ mình yêu thích là hoàn toàn bình thường. Tất cả mọi người đều có lúc buồn — kể cả người lớn!',             'Nhận ra cảm xúc', 7),
-- NHÁNH B: Không biết
(@S2,  6, 'consequence','💡', '#EDE8FF', NULL,   NULL,  NULL,       'Khi mắt cay, cổ nghẹn, muốn khóc — đó là cảm giác BUỒN. Buồn không phải là điều xấu. Buồn là lúc trái tim nói "mình đang cần giúp đỡ".',                     'Học nhận biết buồn', 7),
-- TIẾP TỤC
(@S2,  7, 'narration',  '🚶', '#E8F4FF', NULL,   NULL,  NULL,       'Cửa phòng mở ra. Mẹ bước vào, thấy Lan ngồi trên sàn với đôi mắt đỏ hoe...',                                                                                  'Lo lắng',    8),
(@S2,  8, 'dialogue',   '🏠', '#E8F4FF', 'Mẹ',  '👩', 'nhẹ nhàng','«Con sao vậy Lan? Mặt con đỏ hoe rồi. Có chuyện gì xảy ra với con không?»',                                                                                    'Quan tâm',   9),
-- CHOICE POINT 2: Có nói với Mẹ không?
(@S2,  9, 'choice',     '💬', '#DAEEFF', NULL,   NULL,  NULL,       'Mẹ đang hỏi thăm Lan. Lan sẽ làm gì? Đây là cơ hội để Lan nói lên điều mình cảm thấy!',                                                                       'Buồn bã',    NULL),
-- NHÁNH A: Nói với Mẹ
(@S2, 10, 'consequence','🗣️', '#D8F5E8', 'Lan',  '👧', 'buồn',    '«Mẹ ơi... con mất gấu bông rồi. Con buồn lắm...» Nước mắt chảy xuống má nhưng Lan cảm thấy bớt nặng hơn khi được nói ra.',                                    'Nói ra cảm xúc', 11),
-- NHÁNH B: Im lặng
(@S2, 12, 'consequence','😔', '#EDE8FF', 'Mẹ',  '👩', 'lo lắng', 'Lan lắc đầu và cúi mặt xuống. Mẹ không biết Lan cần gì, nên mẹ nghĩ Lan chỉ mệt, rồi đi ra ngoài. Lan vẫn ngồi một mình với nỗi buồn...',                     'Ở lại một mình', 13),
-- TIẾP TỤC NHÁNH A
(@S2, 11, 'dialogue',   '🤗', '#D8F5E8', 'Mẹ',  '👩', 'ấm áp',   '«Ôi con tội nghiệp! Để mẹ giúp con tìm nhé? Cảm ơn con đã nói cho mẹ biết. Khi con nói ra, mẹ mới hiểu con cần gì!»',                                         'Được giúp đỡ', 14),
-- TIẾP TỤC NHÁNH B (học lại)
(@S2, 13, 'choice',     '💬', '#DAEEFF', NULL,   NULL,  NULL,       'Lan vẫn ngồi một mình. Mẹ lại bước vào thêm lần nữa. «Con ơi, con có muốn mẹ giúp gì không?» — Lần này Lan thử nói nhé?',                                    'Thử lại',    NULL),
-- TIẾP TỤC: Tìm gấu cùng nhau
(@S2, 14, 'narration',  '🔦', '#D8F5E8', NULL,   NULL,  NULL,       'Mẹ và Lan cùng tìm. Mẹ rọi đèn vào gầm sofa... «Lan ơi! Lại đây xem này!» Chú gấu bông đang nằm kẹt dưới gối sofa!',                                         'Hy vọng',    15),
(@S2, 15, 'dialogue',   '🧸', '#D8F5E8', 'Lan',  '👧', 'vui',      '«Gấu bông!» Lan nhào đến ôm chú gấu thật chặt. Nước mắt vừa được lau, nhưng lần này là nước mắt vui!',                                                        'Nhẹ nhõm',   16),
-- CHOICE POINT 3: Học từ trải nghiệm
(@S2, 16, 'choice',     '💭', '#E8F4FF', NULL,   NULL,  NULL,       'Lan đã tìm được gấu bông! Điều gì đã giúp Lan?',                                                                                                               'Suy ngẫm',   NULL),
-- ENDING
(@S2, 17, 'ending',     '😊', '#D8F5E8', 'Lan',  '👧', 'vui',      '«Vì Lan đã nói với Mẹ!» Đúng rồi! Khi nói ra cảm xúc buồn và cần giúp đỡ, người thân mới biết cách giúp mình. Lan ôm gấu bông và mỉm cười.',                'Vui vẻ',     NULL),
(@S2, 18, 'ending',     '💡', '#EDE8FF', NULL,   NULL,  NULL,       'Lần sau khi buồn, hãy nhớ: nói ra cảm xúc không phải là yếu đuối. Đó là cách thông minh để được giúp đỡ! «Con buồn lắm. Con cần giúp đỡ.»',                'Học được bài học', NULL);

UPDATE story_page SET is_ending=1, ending_type='good',     lesson_text='Khi buồn, hãy nói: "Con buồn lắm" hoặc "Con cần giúp đỡ". Nói ra cảm xúc giúp người thân hiểu và cùng giải quyết với con!' WHERE story_id=@S2 AND page_order=17;
UPDATE story_page SET is_ending=1, ending_type='learning', lesson_text='Khi buồn bã, đừng im lặng một mình. Hãy nói với người mình tin tưởng: "Con buồn" hoặc "Con cần giúp đỡ". Đó là điều dũng cảm!' WHERE story_id=@S2 AND page_order=18;
-- next_page_order cho trang consequence để về đúng luồng
UPDATE story_page SET next_page_order=14 WHERE story_id=@S2 AND page_order=13 AND page_type='choice'; -- handled by choice

-- Lựa chọn trang 4
SET @P = (SELECT id FROM story_page WHERE story_id=@S2 AND page_order=4);
INSERT INTO story_choice (page_id, choice_text, choice_emoji, result_emoji, result_label, next_page_order) VALUES
(@P, 'Lan đang BUỒN vì mất gấu bông', '😢', '💙', 'Đúng rồi!', 5),
(@P, 'Lan không biết mình đang cảm thấy gì', '❓', '💡', 'Cùng khám phá nhé!', 6);

-- Lựa chọn trang 9
SET @P = (SELECT id FROM story_page WHERE story_id=@S2 AND page_order=9);
INSERT INTO story_choice (page_id, choice_text, choice_emoji, result_emoji, result_label, next_page_order) VALUES
(@P, '"Mẹ ơi... con mất gấu bông. Con buồn lắm..."', '🗣️', '🤗', 'Mẹ hiểu rồi!', 10),
(@P, 'Lắc đầu và không nói gì', '😶', '😔', 'Mẹ không biết giúp...', 12);

-- Lựa chọn trang 13 (lần 2)
SET @P = (SELECT id FROM story_page WHERE story_id=@S2 AND page_order=13);
INSERT INTO story_choice (page_id, choice_text, choice_emoji, result_emoji, result_label, next_page_order) VALUES
(@P, '"Mẹ ơi, con mất gấu bông. Con muốn mẹ giúp tìm..."', '🗣️', '🤗', 'Mẹ sẽ giúp!', 11),
(@P, 'Vẫn im lặng lắc đầu', '😶', '😔', 'Ở lại một mình buồn...', 18);

-- Lựa chọn trang 16
SET @P = (SELECT id FROM story_page WHERE story_id=@S2 AND page_order=16);
INSERT INTO story_choice (page_id, choice_text, choice_emoji, result_emoji, result_label, next_page_order) VALUES
(@P, 'Vì Lan đã nói với Mẹ khi cần giúp đỡ!', '🗣️', '🌟', 'Chính xác!', 17),
(@P, 'Vì Lan tự giải quyết được', '🤔', '💡', 'Thực ra là...', 18);

-- ============================================================
-- TRUYỆN 3: CHIA SẺ ĐỒ CHƠI (cảm xúc TỨC GIẬN)  —  17 trang
-- 3 điểm lựa chọn, dạy kiểm soát cơn giận
-- ============================================================

INSERT INTO emotion_story (title, description, emotion_tag, cover_emoji, cover_bg, difficulty, estimated_minutes, sort_order)
VALUES ('Chia sẻ đồ chơi', 'Bạn Tuấn lấy lego của Minh mà không hỏi. Minh tức giận lắm! Hãy giúp Minh học cách xử lý cơn giận đúng cách để mọi chuyện không tệ hơn!', 'Tức giận', '🎮', '#FFE8E0', 2, 8, 3);
SET @S3 = LAST_INSERT_ID();

INSERT INTO story_page (story_id, page_order, page_type, scene_emoji, scene_bg, character_name, character_emoji, character_mood, content, emotion_hint, next_page_order) VALUES
-- SETUP
(@S3,  1, 'narration',  '🏫', '#FFF5F0', NULL,   NULL,   NULL,         'Giờ ra chơi ở trường. Minh đang ngồi xếp bộ lego yêu thích — một tòa lâu đài to bằng cuốn sách!',                                                         'Bình thường',  2),
(@S3,  2, 'narration',  '🧱', '#FFF5F0', NULL,   NULL,   NULL,         'Minh rất cẩn thận. Xếp từng viên một. Tòa lâu đài gần xong rồi... cao đến đây... chỉ cần thêm mái thôi!',                                                  'Tập trung',    3),
(@S3,  3, 'dialogue',   '😮', '#FFE8E0', 'Tuấn', '👦',  'hào hứng',  '«Ồ! Trông hay quá!» Tuấn chạy đến, không hỏi gì cả, tự tay cầm lấy cả mảng tường lâu đài của Minh để ngắm.',                                                'Bất ngờ',      4),
-- SETUP CẢM XÚC GIẬN
(@S3,  4, 'narration',  '🌡️', '#FFE0D6', NULL,   NULL,   NULL,         'Minh cảm thấy mặt nóng bừng! Tay nắm chặt lại. Trong đầu có tiếng thét muốn bùng ra. Đây là cảm giác TỨC GIẬN — và nó đến rất nhanh!',                    'Tức giận',     5),
-- CHOICE POINT 1: Nhận biết và xử lý ban đầu
(@S3,  5, 'choice',     '🌡️', '#FFE0D6', NULL,   NULL,   NULL,         'Minh đang tức giận. Khi tức giận, điều đầu tiên cần làm là... HÍT THỞ. Nhưng Minh có làm được không?',                                                     'Tức giận',     NULL),
-- NHÁNH A: Hít thở
(@S3,  6, 'consequence','🌬️', '#D8F5E8', 'Minh', '👦',  'đang bình tĩnh', 'Minh nhắm mắt, hít vào thật sâu... 1... 2... 3... rồi thở ra chậm rãi. Cơn giận vẫn còn đó, nhưng bớt như lửa hơn một chút.',                          'Bình tĩnh dần', 7),
-- NHÁNH B: Không hít thở, bùng nổ
(@S3,  7, 'consequence','😡', '#FFE0D6', 'Minh', '👦',  'tức giận',   'Minh không kịp bình tĩnh. Cảm giác giận bùng lên như lửa! Mặt đỏ bừng, toàn thân run run. Đây là lúc cơn giận đang kiểm soát Minh!',                        'Mất kiểm soát', 8), -- sẽ dẫn đến choice 2 bản khó hơn
-- TIẾP TỤC (hội tụ) -- sau khi hít thở
(@S3,  8, 'narration',  '💭', '#FFF5F0', NULL,   NULL,   NULL,         'Dù tức giận thế nào, bước tiếp theo LUÔN LUÔN là: DÙNG LỜI NÓI, không dùng tay hay la hét.',                                                                'Học cách xử lý', 9),
-- CHOICE POINT 2: Nói hay là hành động bạo lực
(@S3,  9, 'choice',     '💬', '#FFE0D6', NULL,   NULL,   NULL,         'Tuấn vẫn đang cầm lego của Minh. Minh sẽ làm gì tiếp theo?',                                                                                                 'Tức giận',     NULL),
-- NHÁNH A: Dùng lời nói
(@S3, 10, 'consequence','🗣️', '#D8F5E8', 'Minh', '👦',  'dũng cảm',  '«Tuấn ơi! Đó là lego của mình! Mình không thích bạn lấy mà không hỏi. Mình đang tức giận lắm!» — Minh nói to nhưng không la hét, không dùng tay.',          'Dùng lời nói',  11),
-- NHÁNH B: Đẩy/la hét
(@S3, 13, 'consequence','💥', '#FFD6D6', 'Minh', '👦',  'mất kiểm soát', 'Minh hét to và đẩy mạnh vào tay Tuấn! Tuấn ngã xuống. Lego bay khắp nơi. Tòa lâu đài tan vỡ...', 'Hậu quả nghiêm trọng', 14),
-- TIẾP TỤC NHÁNH A: Tuấn phản ứng tốt
(@S3, 11, 'dialogue',   '😮', '#D8F5E8', 'Tuấn', '👦',  'xấu hổ',    '«Ồ... xin lỗi Minh! Mình không biết. Mình có thể mượn xem được không?» Tuấn đặt lego xuống và cúi đầu xin lỗi.',                                            'Được tôn trọng', 12),
(@S3, 12, 'narration',  '🤝', '#D8F5E8', NULL,   NULL,   NULL,         'Minh hít thêm một hơi thở sâu. Rồi gật đầu: «Được thôi. Nhưng lần sau nhớ hỏi mình trước nhé!» Tuấn cảm ơn và hai bạn tiếp tục chơi cùng nhau.',           'Hòa giải',    16),
-- TIẾP TỤC NHÁNH B: Hậu quả
(@S3, 14, 'narration',  '😢', '#FFD6D6', NULL,   NULL,   NULL,         'Cô giáo chạy đến. Tuấn đang khóc. Lego vỡ hết. Cô giáo dẫn Minh vào góc ngồi một mình...',                                                                  'Hối hận',     15),
(@S3, 15, 'dialogue',   '👩‍🏫', '#FFE8E0', 'Cô giáo', '👩‍🏫', 'nghiêm',  '«Minh ơi, dùng tay đẩy bạn là sai rồi. Khi tức giận, con phải nói bằng lời, không được dùng tay. Bây giờ con sẽ nói xin lỗi Tuấn nhé?»',               'Học bài học',  NULL), -- leads to choice 3
-- CHOICE POINT 3: Kết thúc
(@S3, 16, 'choice',     '🌈', '#D8F5E8', NULL,   NULL,   NULL,         'Vì đã dùng lời nói thay vì tay, mọi chuyện tốt hơn rất nhiều! Minh học được điều gì quan trọng nhất hôm nay?',                                              'Suy ngẫm',    NULL),
(@S3, 17, 'choice',     '🙏', '#FFE8E0', NULL,   NULL,   NULL,         'Cô giáo yêu cầu Minh nói xin lỗi Tuấn. Minh sẽ làm gì?',                                                                                                    'Hối hận',     NULL),
-- ENDINGS
(@S3, 18, 'ending',     '🌟', '#D8F5E8', 'Minh', '👦',  'tự hào',    '«Khi tức giận, mình phải HÍT THỞ rồi DÙNG LỜI NÓI!» Minh và Tuấn bắt tay nhau. Sau này hai bạn chơi cùng nhau suốt!',                                       'Tự hào',      NULL),
(@S3, 19, 'ending',     '💡', '#FFE8E0', NULL,   NULL,   NULL,         'Minh nói xin lỗi Tuấn. Tuấn tha lỗi. Cả hai cùng nhặt lego lên... Lần sau nhớ: DÙNG LỜI NÓI trước, đừng bao giờ dùng tay khi tức giận.',                  'Học được bài học', NULL),
(@S3, 20, 'ending',     '💔', '#FFD6D6', NULL,   NULL,   NULL,         'Minh không nói xin lỗi. Tuấn không chơi với Minh nữa... Khi mình làm người khác đau, cần phải nói xin lỗi để hàn gắn tình bạn.',                           'Tiếc nuối',   NULL);

UPDATE story_page SET is_ending=1, ending_type='good',     lesson_text='3 bước xử lý tức giận: 1️⃣ HÍT THỞ SÂU — 2️⃣ NÓI BẰNG LỜI "Mình không thích điều đó" — 3️⃣ HỎI Ý KIẾN thay vì lấy đồ của người khác!' WHERE story_id=@S3 AND page_order=18;
UPDATE story_page SET is_ending=1, ending_type='learning', lesson_text='Dùng lời nói thay vì tay luôn là cách tốt hơn. Nếu lỡ làm sai, hãy nói xin lỗi. Xin lỗi là điều dũng cảm!' WHERE story_id=@S3 AND page_order=19;
UPDATE story_page SET is_ending=1, ending_type='learning', lesson_text='Khi làm người khác đau dù có cố ý hay không — hãy nói XIN LỖI. Xin lỗi giúp tình bạn hàn gắn và cho thấy con là người tốt!' WHERE story_id=@S3 AND page_order=20;
UPDATE story_page SET next_page_order=9 WHERE story_id=@S3 AND page_order=6;  -- sau hít thở → choice 2
UPDATE story_page SET next_page_order=9 WHERE story_id=@S3 AND page_order=7;  -- sau giận → choice 2

-- Lựa chọn trang 5
SET @P = (SELECT id FROM story_page WHERE story_id=@S3 AND page_order=5);
INSERT INTO story_choice (page_id, choice_text, choice_emoji, result_emoji, result_label, next_page_order) VALUES
(@P, 'Hít vào thật sâu... đếm 1-2-3... rồi thở ra', '🌬️', '😌', 'Bình tĩnh hơn rồi!', 6),
(@P, 'Để mặc cơn giận và không làm gì', '😤', '🌡️', 'Cơn giận đang tăng...', 7);

-- Lựa chọn trang 9
SET @P = (SELECT id FROM story_page WHERE story_id=@S3 AND page_order=9);
INSERT INTO story_choice (page_id, choice_text, choice_emoji, result_emoji, result_label, next_page_order) VALUES
(@P, '«Tuấn ơi! Đó là lego của mình! Mình không thích bạn lấy!»', '🗣️', '😊', 'Dùng lời nói!', 10),
(@P, 'Hét to và đẩy tay Tuấn ra', '😡', '💥', 'Hậu quả nghiêm trọng...', 13);

-- Lựa chọn trang 15 (sau khi cô giáo nhắc)
SET @P = (SELECT id FROM story_page WHERE story_id=@S3 AND page_order=15);
INSERT INTO story_choice (page_id, choice_text, choice_emoji, result_emoji, result_label, next_page_order) VALUES
(@P, '«Tuấn ơi, mình xin lỗi vì đã đẩy bạn. Mình không nên làm vậy.»', '🙏', '🤝', 'Dũng cảm xin lỗi!', 19),
(@P, 'Không muốn xin lỗi, quay đi chỗ khác', '😤', '💔', 'Tình bạn sứt mẻ...', 20);

-- Lựa chọn trang 16 (good path)
SET @P = (SELECT id FROM story_page WHERE story_id=@S3 AND page_order=16);
INSERT INTO story_choice (page_id, choice_text, choice_emoji, result_emoji, result_label, next_page_order) VALUES
(@P, 'Hít thở sâu trước khi nói, không dùng tay khi tức giận', '🌬️', '🌟', 'Chính xác!', 18),
(@P, 'La to lên để bạn sợ và không dám lấy đồ nữa', '😤', '❌', 'Thực ra...', 18);

SELECT CONCAT('✅ Migration v2 hoàn thành! ', (SELECT COUNT(*) FROM emotion_story), ' truyện, ', (SELECT COUNT(*) FROM story_page), ' trang.') AS Status;
