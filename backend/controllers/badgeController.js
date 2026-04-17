import db from '../config/db.js';

/* ─────────────────────────────────────────────────────────────
   Kiểm tra và trao huy hiệu cho user sau mỗi hoạt động học
────────────────────────────────────────────────────────────── */
export async function checkAndGrantBadges(userId) {
    const conn = await db.getConnection();
    try {
        const newlyGranted = [];

        // ── Lấy badges đã có ──────────────────────────────────────
        const [existingRows] = await conn.query(
            `SELECT badge_id FROM user_badges WHERE user_id = ?`, [userId]
        );
        const existingIds = new Set(existingRows.map((r) => r.badge_id));

        // ── Lấy thông tin tổng hợp của user ──────────────────────
        const [[activityRow]] = await conn.query(
            `SELECT COUNT(*) AS total_lessons,
                    SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS total_correct,
                    SUM(score) AS total_stars
             FROM user_activity_log WHERE user_id = ?`,
            [userId]
        );

        // ── Streak ────────────────────────────────────────────────
        const [dateRows] = await conn.query(
            `SELECT DISTINCT DATE(answered_at) AS play_date
             FROM user_activity_log
             WHERE user_id = ?
             ORDER BY play_date DESC`,
            [userId]
        );
        let streak = 0;
        if (dateRows.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const last = new Date(dateRows[0].play_date);
            last.setHours(0, 0, 0, 0);
            const diff = Math.floor((today - last) / (1000 * 3600 * 24));
            if (diff <= 1) {
                streak = 1;
                for (let i = 0; i < dateRows.length - 1; i++) {
                    const d1 = new Date(dateRows[i].play_date);
                    const d2 = new Date(dateRows[i + 1].play_date);
                    if (Math.round((d1 - d2) / (1000 * 3600 * 24)) === 1) streak++;
                    else break;
                }
            }
        }

        // ── Progress map (levels) ─────────────────────────────────
        const [progressRows] = await conn.query(
            `SELECT eg.id AS level_id, lt.code AS lesson_code,
                    COALESCE(ups.total_correct_count, 0) AS total_correct
             FROM emotion_group eg
             CROSS JOIN lesson_type lt
             LEFT JOIN user_progress_stat ups
                 ON ups.user_id = ? AND ups.emotion_group_id = eg.id AND ups.lesson_type_id = lt.id
             WHERE lt.code IN ('FLASHCARD','MATCHING','CONTEXT','TRAINING')
             ORDER BY eg.id`,
            [userId]
        );

        // Level hoàn thành: tất cả loại bài trong level đó có total_correct > 0
        const levelStatus = {};
        progressRows.forEach(({ level_id, total_correct }) => {
            if (!levelStatus[level_id]) levelStatus[level_id] = [];
            levelStatus[level_id].push(total_correct > 0);
        });

        const level1Done = levelStatus[1]?.every(Boolean);
        const level2Done = levelStatus[2]?.every(Boolean);
        const level3Done = levelStatus[3]?.every(Boolean);

        // ── Perfect score: kiểm tra session 5 phút gần nhất ──────
        const [sessionPerfect] = await conn.query(
            `SELECT lt.code,
                    COUNT(*) AS total,
                    SUM(CASE WHEN ual.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count
             FROM user_activity_log ual
             JOIN lesson_type lt ON ual.lesson_type_id = lt.id
             WHERE ual.user_id = ?
               AND ual.answered_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
             GROUP BY lt.code
             HAVING total > 0`,
            [userId]
        );

        // ── Lấy tất cả badge definitions ─────────────────────────
        const [allBadges] = await conn.query(
            `SELECT id, code FROM badge_definition ORDER BY sort_order`
        );
        const badgeMap = {};
        allBadges.forEach((b) => { badgeMap[b.code] = b.id; });

        const totalLessons = Number(activityRow?.total_lessons || 0);
        const totalStars   = Number(activityRow?.total_stars   || 0);

        // ── Kiểm tra từng badge ───────────────────────────────────
        const conditions = [
            { code: 'FIRST_LESSON',      met: totalLessons >= 1 },
            { code: 'LESSON_10',         met: totalLessons >= 10 },
            { code: 'LESSON_50',         met: totalLessons >= 50 },
            { code: 'STREAK_3',          met: streak >= 3 },
            { code: 'STREAK_7',          met: streak >= 7 },
            { code: 'STREAK_14',         met: streak >= 14 },
            { code: 'LEVEL1_COMPLETE',   met: Boolean(level1Done) },
            { code: 'LEVEL2_COMPLETE',   met: Boolean(level2Done) },
            { code: 'LEVEL3_COMPLETE',   met: Boolean(level3Done) },
            { code: 'STAR_10',           met: totalStars >= 10 },
            { code: 'STAR_50',           met: totalStars >= 50 },
            { code: 'STAR_100',          met: totalStars >= 100 },
        ];

        // Perfect score badges
        const perfectMap = {
            FLASHCARD: 'PERFECT_FLASHCARD',
            CONTEXT:   'PERFECT_CONTEXT',
            MATCHING:  'PERFECT_MATCHING',
        };
        sessionPerfect.forEach(({ code, total, correct_count }) => {
            const upperCode = code.toUpperCase();
            const badgeCode = perfectMap[upperCode];
            if (badgeCode && Number(total) > 0 && Number(total) === Number(correct_count)) {
                conditions.push({ code: badgeCode, met: true });
            }
        });

        // ── Trao badge còn thiếu ──────────────────────────────────
        await conn.beginTransaction();
        for (const { code, met } of conditions) {
            const badgeId = badgeMap[code];
            if (!badgeId || !met || existingIds.has(badgeId)) continue;

            await conn.query(
                `INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)`,
                [userId, badgeId]
            );

            const [def] = await conn.query(
                `SELECT name, icon_emoji, description FROM badge_definition WHERE id = ?`,
                [badgeId]
            );
            if (def.length > 0) {
                newlyGranted.push({ id: badgeId, code, ...def[0] });
            }
        }
        await conn.commit();

        return newlyGranted;
    } catch (err) {
        await conn.rollback();
        console.error('Badge check error:', err);
        return [];
    } finally {
        conn.release();
    }
}

/* ─────────────────────────────────────────────────────────────
   GET /api/badges — Lấy tất cả badge + trạng thái của user
────────────────────────────────────────────────────────────── */
export const getAllBadges = async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await db.query(
            `SELECT bd.id, bd.code, bd.name, bd.description, bd.icon_emoji, bd.category, bd.sort_order,
                    ub.earned_at
             FROM badge_definition bd
             LEFT JOIN user_badges ub ON ub.badge_id = bd.id AND ub.user_id = ?
             ORDER BY bd.sort_order ASC`,
            [userId]
        );

        const badges = rows.map((b) => ({
            id:          b.id,
            code:        b.code,
            name:        b.name,
            description: b.description,
            icon:        b.icon_emoji,
            category:    b.category,
            earned:      Boolean(b.earned_at),
            earnedAt:    b.earned_at || null,
        }));

        const earnedCount = badges.filter((b) => b.earned).length;

        res.status(200).json({ badges, earnedCount, totalCount: badges.length });
    } catch (error) {
        console.error('Lỗi lấy badges:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/badges/recent — Lấy badge mới nhất (cho dashboard)
────────────────────────────────────────────────────────────── */
export const getRecentBadges = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit  = Math.min(Number(req.query.limit) || 3, 10);

        const [rows] = await db.query(
            `SELECT bd.id, bd.code, bd.name, bd.icon_emoji, bd.category, ub.earned_at
             FROM user_badges ub
             JOIN badge_definition bd ON bd.id = ub.badge_id
             WHERE ub.user_id = ?
             ORDER BY ub.earned_at DESC
             LIMIT ?`,
            [userId, limit]
        );

        res.status(200).json(rows.map((b) => ({
            id:       b.id,
            code:     b.code,
            name:     b.name,
            icon:     b.icon_emoji,
            category: b.category,
            earnedAt: b.earned_at,
        })));
    } catch (error) {
        console.error('Lỗi lấy recent badges:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};
