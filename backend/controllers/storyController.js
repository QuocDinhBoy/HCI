import db from '../config/db.js';

/* ─────────────────────────────────────────────────────────────
   GET /api/stories  — Danh sách truyện + trạng thái của user
────────────────────────────────────────────────────────────── */
export const getStoryList = async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await db.query(
            `SELECT es.id, es.title, es.description, es.emotion_tag,
                    es.cover_emoji, es.cover_bg, es.difficulty, es.estimated_minutes,
                    es.sort_order,
                    usp.completed, usp.last_page_order, usp.ending_type, usp.completed_at,
                    (SELECT COUNT(*) FROM story_page sp WHERE sp.story_id = es.id) AS total_pages
             FROM emotion_story es
             LEFT JOIN user_story_progress usp
                 ON usp.story_id = es.id AND usp.user_id = ?
             WHERE es.is_active = 1
             ORDER BY es.sort_order ASC`,
            [userId]
        );

        res.status(200).json(rows.map((r) => ({
            id:               r.id,
            title:            r.title,
            description:      r.description,
            emotionTag:       r.emotion_tag,
            coverEmoji:       r.cover_emoji,
            coverBg:          r.cover_bg,
            difficulty:       r.difficulty,
            estimatedMinutes: r.estimated_minutes,
            totalPages:       Number(r.total_pages),
            progress: {
                completed:      Boolean(r.completed),
                lastPageOrder:  r.last_page_order || 1,
                endingType:     r.ending_type || null,
                completedAt:    r.completed_at || null,
            },
        })));
    } catch (error) {
        console.error('Lỗi lấy story list:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/stories/:id  — Chi tiết truyện + tất cả trang
────────────────────────────────────────────────────────────── */
export const getStoryDetail = async (req, res) => {
    try {
        const userId  = req.user.id;
        const storyId = Number(req.params.id);

        // Thông tin truyện
        const [[storyRows]] = await db.query(
            `SELECT es.*, usp.completed, usp.last_page_order, usp.ending_type
             FROM emotion_story es
             LEFT JOIN user_story_progress usp ON usp.story_id = es.id AND usp.user_id = ?
             WHERE es.id = ? AND es.is_active = 1`,
            [userId, storyId]
        );
        if (!storyRows) return res.status(404).json({ message: 'Không tìm thấy truyện' });

        // Tất cả trang
        const [pages] = await db.query(
            `SELECT id, page_order, page_type, scene_emoji, scene_bg,
                    character_name, character_emoji, character_mood, content, emotion_hint,
                    next_page_order, is_ending, ending_type, lesson_text
             FROM story_page WHERE story_id = ? ORDER BY page_order ASC`,
            [storyId]
        );

        // Tất cả lựa chọn (gộp luôn)
        const [allChoices] = await db.query(
            `SELECT sc.id, sc.page_id, sc.choice_text, sc.choice_emoji,
                    sc.result_emoji, sc.result_label, sc.next_page_order
             FROM story_choice sc
             JOIN story_page sp ON sp.id = sc.page_id
             WHERE sp.story_id = ?
             ORDER BY sc.id ASC`,
            [storyId]
        );

        // Gắn choices vào đúng trang
        const choiceMap = {};
        allChoices.forEach((c) => {
            if (!choiceMap[c.page_id]) choiceMap[c.page_id] = [];
            choiceMap[c.page_id].push({
                id:            c.id,
                text:          c.choice_text,
                emoji:         c.choice_emoji,
                resultEmoji:   c.result_emoji,
                resultLabel:   c.result_label,
                nextPageOrder: c.next_page_order,
            });
        });

        const pagesWithChoices = pages.map((p) => ({
            id:             p.id,
            pageOrder:      p.page_order,
            pageType:       p.page_type,
            sceneEmoji:     p.scene_emoji,
            sceneBg:        p.scene_bg,
            characterName:  p.character_name,
            characterEmoji: p.character_emoji,
            characterMood:  p.character_mood,
            content:        p.content,
            emotionHint:    p.emotion_hint,
            nextPageOrder:  p.next_page_order,
            isEnding:       Boolean(p.is_ending),
            endingType:     p.ending_type,
            lessonText:     p.lesson_text,
            choices:        choiceMap[p.id] || [],
        }));

        res.status(200).json({
            id:               storyRows.id,
            title:            storyRows.title,
            description:      storyRows.description,
            emotionTag:       storyRows.emotion_tag,
            coverEmoji:       storyRows.cover_emoji,
            coverBg:          storyRows.cover_bg,
            difficulty:       storyRows.difficulty,
            estimatedMinutes: storyRows.estimated_minutes,
            progress: {
                completed:     Boolean(storyRows.completed),
                lastPageOrder: storyRows.last_page_order || 1,
                endingType:    storyRows.ending_type || null,
            },
            pages: pagesWithChoices,
        });
    } catch (error) {
        console.error('Lỗi lấy story detail:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/stories/:id/complete  — Lưu tiến độ / hoàn thành
────────────────────────────────────────────────────────────── */
export const completeStory = async (req, res) => {
    try {
        const userId    = req.user.id;
        const storyId   = Number(req.params.id);
        const { lastPageOrder = 1, completed = false, endingType = null } = req.body;

        await db.query(
            `INSERT INTO user_story_progress (user_id, story_id, completed, last_page_order, ending_type, completed_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                completed      = VALUES(completed),
                last_page_order = VALUES(last_page_order),
                ending_type    = VALUES(ending_type),
                completed_at   = VALUES(completed_at)`,
            [userId, storyId, completed ? 1 : 0, lastPageOrder, endingType,
             completed ? new Date() : null]
        );

        res.status(200).json({ message: 'Đã lưu tiến độ', completed });
    } catch (error) {
        console.error('Lỗi lưu story progress:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};
