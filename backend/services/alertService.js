import db from '../config/db.js';

/**
 * Alert Service — Phát hiện cảm xúc bất thường
 * Chạy khi kết thúc emotion session
 */

const NEGATIVE_EMOTIONS = new Set(['sad', 'angry', 'fearful', 'disgusted']);

const EMOTION_LABELS = {
    sad: 'buồn bã',
    angry: 'tức giận',
    fearful: 'lo lắng/sợ hãi',
    disgusted: 'khó chịu',
    happy: 'vui vẻ',
    neutral: 'trung tính'
};

const LESSON_TYPE_NAMES = {
    flashcard: 'Thẻ học',
    matching: 'Ghép cặp',
    context: 'Ngữ cảnh',
    ai: 'Biểu cảm AI',
    training: 'Biểu cảm AI',
    emotion_training: 'Biểu cảm AI'
};

function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function getNegativePeak(snapshot) {
    return Math.max(
        toNumber(snapshot.sad),
        toNumber(snapshot.angry),
        toNumber(snapshot.fearful),
        toNumber(snapshot.disgusted)
    );
}

function getDominantNegativeKey(snapshot) {
    const entries = [
        ['sad', toNumber(snapshot.sad)],
        ['angry', toNumber(snapshot.angry)],
        ['fearful', toNumber(snapshot.fearful)],
        ['disgusted', toNumber(snapshot.disgusted)]
    ];

    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
}

function diffDaysFromNow(dateInput) {
    if (!dateInput) return null;

    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return null;

    return Math.floor((Date.now() - date.getTime()) / (1000 * 3600 * 24));
}

function normalizeLessonType(type) {
    const lessonType = String(type || '').toLowerCase();
    if (lessonType === 'training' || lessonType === 'ai') return 'emotion_training';
    return lessonType;
}

function lessonTypeLabel(type) {
    const normalized = normalizeLessonType(type);
    return LESSON_TYPE_NAMES[normalized] || normalized;
}

/**
 * Kiểm tra & tạo alerts sau khi kết thúc session
 */
export async function checkForAlerts(userId, sessionId) {
    try {
        // Lấy snapshots của session vừa xong
        const [snapshots] = await db.query(`
            SELECT dominant, captured_at,
                   sad, angry, fearful, disgusted, happy, neutral
            FROM emotion_snapshots 
            WHERE session_id = ?
            ORDER BY captured_at ASC
        `, [sessionId]);

        if (snapshots.length < 5) return; // Quá ít data

        // === CHECK 1: PROLONGED_NEGATIVE ===
        // Nếu cảm xúc tiêu cực duy trì liên tục hoặc chiếm đa số phiên.
        let consecutiveNegative = 0;
        let negativeCount = 0;
        const dominantNegativeCounter = {
            sad: 0,
            angry: 0,
            fearful: 0,
            disgusted: 0
        };

        for (const snap of snapshots) {
            if (getNegativePeak(snap) >= 60) {
                consecutiveNegative++;
                negativeCount++;

                const key = getDominantNegativeKey(snap);
                dominantNegativeCounter[key] += 1;
            } else {
                consecutiveNegative = 0;
            }
        }

        const negativeRatio = snapshots.length > 0 ? negativeCount / snapshots.length : 0;
        const topNegativeEmotion = Object.entries(dominantNegativeCounter)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'sad';

        if (consecutiveNegative >= 8 || (snapshots.length >= 8 && negativeRatio >= 0.65)) {
            const ratioPct = Math.round(negativeRatio * 100);
            await createAlert(
                userId,
                'PROLONGED_NEGATIVE',
                `Con có dấu hiệu cảm xúc tiêu cực kéo dài (${ratioPct}% phiên theo dõi, nổi bật: ${EMOTION_LABELS[topNegativeEmotion]}). Nên nghỉ ngắn, trấn an và chuyển sang bài dễ hơn.`,
                sessionId
            );
        }

        // === CHECK 2: HIGH_ANGER ===
        // Angry > 70% liên tục > 6 snapshots (~3 phút)
        let consecutiveAngry = 0;
        for (const snap of snapshots) {
            if (snap.angry >= 70) {
                consecutiveAngry++;
            } else {
                consecutiveAngry = 0;
            }
            if (consecutiveAngry >= 6) {
                await createAlert(userId, 'HIGH_ANGER',
                    'Con có biểu hiện tức giận kéo dài. Nên kiểm tra và hỗ trợ.', sessionId);
                break;
            }
        }

        // === CHECK 3: SUDDEN_CHANGE ===
        // Happy → Sad/Angry trong vòng 3 snapshots liên tiếp
        for (let i = 3; i < snapshots.length; i++) {
            const prev = snapshots[i - 3];
            const curr = snapshots[i];
            if (prev.happy >= 50 && (curr.sad >= 50 || curr.angry >= 50)) {
                await createAlert(userId, 'SUDDEN_CHANGE',
                    'Cảm xúc thay đổi đột ngột từ vui vẻ sang tiêu cực. Có thể có yếu tố kích thích.', sessionId);
                break;
            }
        }

        // === CHECK 4: NEGATIVE TREND (recent sessions) ===
        // Theo dõi xu hướng tiêu cực trên nhiều phiên gần đây.
        await checkNegativeTrend(userId);

        // === CHECK 5: SPECIFIC EMOTION DIFFICULTY ===
        // Cảnh báo khi khó khăn kéo dài với một cảm xúc cụ thể.
        await checkEmotionDifficulty(userId);

    } catch (error) {
        console.error('Alert check error:', error);
    }
}

/**
 * Chạy bộ rule cảnh báo theo lịch sử khi user mở trang báo cáo/cảnh báo
 */
export async function evaluateBehavioralAlerts(userId) {
    try {
        await Promise.all([
            checkEngagement(userId),
            checkNegativeTrend(userId),
            checkEmotionDifficulty(userId)
        ]);
    } catch (error) {
        console.error('Behavioral alert evaluation error:', error);
    }
}

async function checkNegativeTrend(userId) {
    const [sessions] = await db.query(`
        SELECT dominant_emotion, avg_confidence
        FROM emotion_sessions
        WHERE user_id = ? AND ended_at IS NOT NULL
        ORDER BY ended_at DESC
        LIMIT 7
    `, [userId]);

    if (sessions.length < 4) return;

    const negativeSessions = sessions.filter(
        (s) => NEGATIVE_EMOTIONS.has(String(s.dominant_emotion || '').toLowerCase()) && toNumber(s.avg_confidence) >= 45
    );

    const ratio = negativeSessions.length / sessions.length;
    if (ratio < 0.6) return;

    const emotionCounter = {};
    negativeSessions.forEach((session) => {
        const key = String(session.dominant_emotion || '').toLowerCase();
        emotionCounter[key] = (emotionCounter[key] || 0) + 1;
    });

    const topEmotion = Object.entries(emotionCounter)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'sad';

    await createAlert(
        userId,
        'PROLONGED_NEGATIVE',
        `Trong 7 phiên gần nhất, ${Math.round(ratio * 100)}% phiên có cảm xúc tiêu cực (thường gặp: ${EMOTION_LABELS[topEmotion]}). Nên giảm cường độ bài và tăng thời gian hỗ trợ cảm xúc trước khi học.`,
        null
    );
}

async function checkEmotionDifficulty(userId) {
    const [difficultyRows] = await db.query(`
        SELECT
            e.name AS emotion_name,
            LOWER(lt.code) AS lesson_type,
            COUNT(*) AS attempts,
            SUM(CASE WHEN ual.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
            ROUND(
                SUM(CASE WHEN ual.is_correct = 1 THEN 1 ELSE 0 END)
                / NULLIF(COUNT(*), 0) * 100
            ) AS accuracy
        FROM user_activity_log ual
        JOIN lesson_type lt ON ual.lesson_type_id = lt.id
        LEFT JOIN lesson_core lc
            ON ual.lesson_ref_id = lc.id
            AND lt.code IN ('FLASHCARD', 'CONTEXT')
        LEFT JOIN lesson_training_ai lta
            ON ual.lesson_ref_id = lta.id
            AND lt.code IN ('TRAINING', 'AI')
        LEFT JOIN emotion e ON e.id = COALESCE(lc.correct_emotion_id, lta.target_emotion_id)
        WHERE ual.user_id = ?
          AND ual.lesson_ref_id > 0
          AND ual.answered_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
          AND e.id IS NOT NULL
        GROUP BY e.id, e.name, lt.code
        HAVING COUNT(*) >= 4
        ORDER BY accuracy ASC, attempts DESC
        LIMIT 1
    `, [userId]);

    if (difficultyRows.length === 0) return;

    const weakest = difficultyRows[0];
    const accuracy = toNumber(weakest.accuracy);
    const attempts = toNumber(weakest.attempts);

    if (accuracy > 55 || attempts < 4) return;

    await createAlert(
        userId,
        'EMOTION_DIFFICULTY',
        `Con đang gặp khó với cảm xúc "${weakest.emotion_name}" (${accuracy}% đúng trên ${attempts} lượt, chủ yếu ở bài ${lessonTypeLabel(weakest.lesson_type)}). Nên luyện lại bằng ví dụ gần gũi và phản hồi ngắn, tích cực.`,
        null
    );
}

/**
 * Kiểm tra LOW_ENGAGEMENT (gọi khi user login)
 */
export async function checkEngagement(userId) {
    try {
        const [[activityMeta], [sessionMeta], [lastActivityRow], [lastSessionRow]] = await Promise.all([
            db.query(`
                SELECT
                    COUNT(*) AS total_activities,
                    COUNT(DISTINCT DATE(answered_at)) AS active_days
                FROM user_activity_log
                WHERE user_id = ?
                  AND answered_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            `, [userId]),
            db.query(`
                SELECT
                    COUNT(*) AS total_sessions,
                    COUNT(DISTINCT DATE(started_at)) AS session_days
                FROM emotion_sessions
                WHERE user_id = ?
                  AND started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            `, [userId]),
            db.query(`
                SELECT MAX(answered_at) AS last_activity
                FROM user_activity_log
                WHERE user_id = ?
            `, [userId]),
            db.query(`
                SELECT MAX(started_at) AS last_session
                FROM emotion_sessions
                WHERE user_id = ?
            `, [userId])
        ]);

        const activity = activityMeta[0] || {};
        const session = sessionMeta[0] || {};
        const lastActivity = lastActivityRow[0]?.last_activity;
        const lastSession = lastSessionRow[0]?.last_session;

        const lastDate = [lastActivity, lastSession]
            .map((value) => (value ? new Date(value) : null))
            .filter((value) => value && !Number.isNaN(value.getTime()))
            .sort((a, b) => b.getTime() - a.getTime())[0] || null;

        const inactiveDays = diffDaysFromNow(lastDate);
        const activeDays = toNumber(activity.active_days) + toNumber(session.session_days);
        const totalTouches = toNumber(activity.total_activities) + toNumber(session.total_sessions);

        if (inactiveDays !== null && inactiveDays >= 3) {
            await createAlert(
                userId,
                'LOW_ENGAGEMENT',
                `Con đã gián đoạn ${inactiveDays} ngày. Nên quay lại với buổi ngắn 8-10 phút để giữ nhịp học đều.`,
                null
            );
            return;
        }

        if (activeDays <= 2 && totalTouches < 8) {
            await createAlert(
                userId,
                'LOW_ENGAGEMENT',
                'Tần suất học tuần này còn thấp. Nên đặt lịch cố định mỗi ngày 1-2 phiên ngắn để tăng tính ổn định.',
                null
            );
        }
    } catch (error) {
        console.error('Engagement check error:', error);
    }
}

/**
 * Tạo alert (tránh duplicate)
 */
async function createAlert(userId, alertType, description, sessionId) {
    try {
        // Kiểm tra đã có alert tương tự trong 24h chưa
        const [existing] = await db.query(`
            SELECT id FROM emotion_alerts 
            WHERE user_id = ? AND alert_type = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            LIMIT 1
        `, [userId, alertType]);

        if (existing.length > 0) return; // Đã có rồi

        await db.query(`
            INSERT INTO emotion_alerts (user_id, alert_type, description, session_id)
            VALUES (?, ?, ?, ?)
        `, [userId, alertType, description, sessionId]);

        console.log(`⚠️ Alert created: ${alertType} for user ${userId}`);
    } catch (error) {
        console.error('Create alert error:', error);
    }
}

export default { checkForAlerts, checkEngagement, evaluateBehavioralAlerts };
