import db from '../config/db.js';

/**
 * Adaptive Engine — Đề xuất cá nhân hoá dựa trên behavior
 */

const LESSON_ORDER = ['flashcard', 'matching', 'context', 'emotion_training'];

const LESSON_LABELS = {
    flashcard: 'Thẻ học',
    matching: 'Ghép cặp',
    context: 'Ngữ cảnh',
    emotion_training: 'Biểu cảm AI'
};

const NEGATIVE_EMOTIONS = new Set(['sad', 'angry', 'fearful', 'disgusted']);

function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function normalizeLessonType(type) {
    const lessonType = String(type || '').toLowerCase();
    if (lessonType === 'training' || lessonType === 'ai') return 'emotion_training';
    return lessonType;
}

function lessonLabel(type) {
    return LESSON_LABELS[normalizeLessonType(type)] || String(type || 'Bài học');
}

function lessonRoute(type, levelId = 1) {
    const normalized = normalizeLessonType(type);
    const safeLevel = Number(levelId) > 0 ? Number(levelId) : 1;
    return `/learn/${safeLevel}/${normalized}`;
}

function pickNextActivity(progressMatrix) {
    if (!Array.isArray(progressMatrix) || progressMatrix.length === 0) return null;

    const orderValue = (item) => {
        const lessonOrder = LESSON_ORDER.indexOf(item.lessonType);
        return lessonOrder >= 0 ? lessonOrder : 99;
    };

    const byPriority = (a, b) => {
        if (a.levelId !== b.levelId) return a.levelId - b.levelId;
        return orderValue(a) - orderValue(b);
    };

    const weakAccuracy = progressMatrix
        .filter((item) => item.totalPlay >= 3 && toNumber(item.accuracy) < 60)
        .sort((a, b) => (toNumber(a.accuracy) - toNumber(b.accuracy)) || byPriority(a, b))[0];

    if (weakAccuracy) {
        return {
            ...weakAccuracy,
            reason: 'weak_accuracy'
        };
    }

    const notStarted = progressMatrix
        .filter((item) => item.totalPlay === 0)
        .sort(byPriority)[0];

    if (notStarted) {
        return {
            ...notStarted,
            reason: 'not_started'
        };
    }

    const needMorePractice = progressMatrix
        .filter((item) => item.totalPlay > 0 && item.totalPlay < 3)
        .sort((a, b) => (a.totalPlay - b.totalPlay) || byPriority(a, b))[0];

    if (needMorePractice) {
        return {
            ...needMorePractice,
            reason: 'more_repetition'
        };
    }

    const weakestCompleted = progressMatrix
        .filter((item) => item.totalPlay > 0)
        .sort((a, b) => (toNumber(a.accuracy) - toNumber(b.accuracy)) || byPriority(a, b))[0];

    if (weakestCompleted && toNumber(weakestCompleted.accuracy) < 85) {
        return {
            ...weakestCompleted,
            reason: 'maintain_skill'
        };
    }

    return null;
}

function getDurationSuggestion(avgDurationSec, activeDays14d) {
    if (avgDurationSec <= 0) {
        return '8-10 phút/buổi để tạo nhịp học ổn định';
    }

    if (avgDurationSec < 18 || activeDays14d <= 3) {
        return '8-10 phút/buổi, chia thành các chặng ngắn có nghỉ';
    }

    if (avgDurationSec <= 45) {
        return '12-15 phút/buổi với 1-2 lần đổi hoạt động';
    }

    return '15-20 phút/buổi nếu con vẫn giữ tập trung tốt';
}

function getDifficultySuggestion(overallAccuracy, completionRatio) {
    if (overallAccuracy < 55 || completionRatio < 0.3) {
        return 'mức Dễ (ưu tiên củng cố nền tảng)';
    }

    if (overallAccuracy < 80 || completionRatio < 0.7) {
        return 'mức Trung bình (xen kẽ 1 bài dễ + 1 bài thử thách)';
    }

    return 'mức Nâng cao (tăng dần độ khó và đa dạng tình huống)';
}

function getFeedbackStyleSuggestion(overallAccuracy, negativeRatio) {
    if (overallAccuracy < 55 || negativeRatio >= 0.5) {
        return 'phản hồi dịu, từng bước: khen ngay khi đúng và gợi ý 1 bước nhỏ khi sai';
    }

    if (overallAccuracy < 80) {
        return 'phản hồi cân bằng: khen nỗ lực + nhắc mẹo ngắn để sửa lỗi';
    }

    return 'phản hồi thử thách: đặt mục tiêu điểm và khuyến khích tự giải thích đáp án';
}

function buildParentTip({ negativeRatio, weakestEmotion, activeDays14d, daysInactive }) {
    const tips = [];

    if (negativeRatio >= 0.5) {
        tips.push('Dành 3-5 phút trước giờ học để con hít thở sâu và gọi tên cảm xúc hiện tại.');
    }

    if (weakestEmotion && toNumber(weakestEmotion.accuracy) < 60) {
        tips.push(`Luyện cảm xúc "${weakestEmotion.emotion_name}" qua 2-3 tình huống đời thường mỗi ngày.`);
    }

    if ((daysInactive !== null && daysInactive >= 2) || activeDays14d <= 3) {
        tips.push('Giữ khung giờ cố định hằng ngày với buổi ngắn để tăng tính đều đặn.');
    }

    if (tips.length === 0) {
        tips.push('Tiếp tục duy trì nhịp học hiện tại và ưu tiên khen nỗ lực thay vì chỉ khen điểm.');
    }

    return tips.slice(0, 2).join(' ');
}

function pushUniqueRecommendation(list, recommendation) {
    if (!recommendation?.type) return;
    if (list.some((item) => item.type === recommendation.type)) return;
    list.push(recommendation);
}

/**
 * Tạo recommendations cho user
 */
export async function getRecommendations(userId) {
    const recommendations = [];

    try {
        const queryResults = await Promise.all([
            db.query(`
                SELECT
                    LOWER(lt.code) AS lesson_type,
                    COUNT(*) AS total,
                    SUM(CASE WHEN ual.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
                    ROUND(
                        SUM(CASE WHEN ual.is_correct = 1 THEN 1 ELSE 0 END)
                        / NULLIF(COUNT(*), 0) * 100
                    ) AS accuracy
                FROM user_activity_log ual
                JOIN lesson_type lt ON ual.lesson_type_id = lt.id
                WHERE ual.user_id = ?
                GROUP BY lt.id, lt.code
            `, [userId]),
            db.query(`
                SELECT
                    eg.id AS level_id,
                    eg.name AS level_name,
                    LOWER(lt.code) AS lesson_type,
                    COALESCE(ups.total_play, 0) AS total_play,
                    COALESCE(ups.total_correct_count, 0) AS total_correct_count
                FROM emotion_group eg
                CROSS JOIN lesson_type lt
                LEFT JOIN user_progress_stat ups
                    ON ups.user_id = ?
                    AND ups.emotion_group_id = eg.id
                    AND ups.lesson_type_id = lt.id
                WHERE lt.code IN ('FLASHCARD', 'MATCHING', 'CONTEXT', 'TRAINING')
                ORDER BY eg.id ASC, FIELD(lt.code, 'FLASHCARD', 'MATCHING', 'CONTEXT', 'TRAINING')
            `, [userId]),
            db.query(`
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
                  AND e.id IS NOT NULL
                GROUP BY e.id, e.name, lt.code
                HAVING COUNT(*) >= 3
                ORDER BY accuracy ASC, attempts DESC
                LIMIT 1
            `, [userId]),
            db.query(`
                SELECT
                    COUNT(*) AS activities_14d,
                    COUNT(DISTINCT DATE(answered_at)) AS active_days_14d,
                    ROUND(AVG(NULLIF(session_duration, 0))) AS avg_duration_sec,
                    COALESCE(SUM(session_duration), 0) AS total_duration_sec
                FROM user_activity_log
                WHERE user_id = ?
                  AND answered_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
            `, [userId]),
            db.query(`
                SELECT
                    COUNT(*) AS total_attempts,
                    SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS total_correct
                FROM user_activity_log
                WHERE user_id = ?
            `, [userId]),
            db.query(`
                SELECT LOWER(dominant_emotion) AS emotion, COUNT(*) AS count
                FROM emotion_sessions
                WHERE user_id = ?
                  AND ended_at IS NOT NULL
                  AND started_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
                GROUP BY dominant_emotion
                ORDER BY count DESC
            `, [userId]),
            db.query(`
                SELECT MAX(last_touch) AS last_touch
                FROM (
                    SELECT MAX(answered_at) AS last_touch
                    FROM user_activity_log
                    WHERE user_id = ?
                    UNION ALL
                    SELECT MAX(started_at) AS last_touch
                    FROM emotion_sessions
                    WHERE user_id = ?
                ) AS last_events
            `, [userId, userId])
        ]);

        const [gameAccuracyRaw] = queryResults[0];
        const [progressRaw] = queryResults[1];
        const [weakestEmotionRaw] = queryResults[2];
        const [usageRaw] = queryResults[3];
        const [overallRaw] = queryResults[4];
        const [sessionTrendRaw] = queryResults[5];
        const [lastTouchRaw] = queryResults[6];

        const gameAccuracy = gameAccuracyRaw.map((item) => ({
            lesson_type: normalizeLessonType(item.lesson_type),
            total: toNumber(item.total),
            correct_count: toNumber(item.correct_count),
            accuracy: toNumber(item.accuracy)
        }));

        const progressMatrix = progressRaw.map((item) => {
            const totalPlay = toNumber(item.total_play);
            const totalCorrect = toNumber(item.total_correct_count);

            return {
                levelId: toNumber(item.level_id),
                levelName: item.level_name,
                lessonType: normalizeLessonType(item.lesson_type),
                totalPlay,
                totalCorrect,
                accuracy: totalPlay > 0 ? Math.round((totalCorrect / totalPlay) * 100) : null
            };
        });

        const weakestEmotion = weakestEmotionRaw[0] || null;
        const usage = usageRaw[0] || {};
        const overall = overallRaw[0] || {};
        const lastTouch = lastTouchRaw[0]?.last_touch || null;

        const activities14d = toNumber(usage.activities_14d);
        const activeDays14d = toNumber(usage.active_days_14d);
        const avgDurationSec = toNumber(usage.avg_duration_sec);

        const overallAttempts = toNumber(overall.total_attempts);
        const overallCorrect = toNumber(overall.total_correct);
        const overallAccuracy = overallAttempts > 0
            ? Math.round((overallCorrect / overallAttempts) * 100)
            : 0;

        const completedUnits = progressMatrix.filter(
            (item) => item.totalPlay >= 3 && toNumber(item.accuracy) >= 60
        ).length;
        const completionRatio = progressMatrix.length > 0
            ? completedUnits / progressMatrix.length
            : 0;

        const totalTrendSessions = sessionTrendRaw.reduce((sum, item) => sum + toNumber(item.count), 0);
        const negativeTrendSessions = sessionTrendRaw.reduce((sum, item) => {
            if (NEGATIVE_EMOTIONS.has(String(item.emotion || '').toLowerCase())) {
                return sum + toNumber(item.count);
            }
            return sum;
        }, 0);
        const negativeRatio = totalTrendSessions > 0
            ? (negativeTrendSessions / totalTrendSessions)
            : 0;

        const lastTouchDate = lastTouch ? new Date(lastTouch) : null;
        const daysInactive = lastTouchDate && !Number.isNaN(lastTouchDate.getTime())
            ? Math.floor((Date.now() - lastTouchDate.getTime()) / (1000 * 3600 * 24))
            : null;

        // 1. Đề xuất bài tập tiếp theo theo điểm yếu + mức độ hoàn thành
        const nextActivity = pickNextActivity(progressMatrix);
        if (nextActivity) {
            const reasonText = {
                weak_accuracy: `Độ chính xác hiện tại ${toNumber(nextActivity.accuracy)}% còn thấp`,
                not_started: 'Con chưa bắt đầu hoạt động này',
                more_repetition: `Mới luyện ${nextActivity.totalPlay} lượt, cần thêm lặp lại để ổn định kỹ năng`,
                maintain_skill: `Đây là kỹ năng yếu tương đối (${toNumber(nextActivity.accuracy)}%) cần ôn duy trì`
            };

            const emotionHint = weakestEmotion
                ? ` Ưu tiên cảm xúc yếu: ${weakestEmotion.emotion_name}.`
                : '';

            pushUniqueRecommendation(recommendations, {
                type: 'NEXT_EXERCISE',
                icon: '🧭',
                title: `Bài tiếp theo: ${lessonLabel(nextActivity.lessonType)} (${nextActivity.levelName})`,
                description: `${reasonText[nextActivity.reason] || 'Nên tiếp tục luyện theo lộ trình.'}.${emotionHint}`,
                action: {
                    route: lessonRoute(nextActivity.lessonType, nextActivity.levelId),
                    label: 'Bắt đầu bài này'
                }
            });
        }

        // 2. Đề xuất thời lượng / độ khó / kiểu phản hồi
        pushUniqueRecommendation(recommendations, {
            type: 'SESSION_PLAN',
            icon: '⏱️',
            title: 'Thời lượng và độ khó phù hợp',
            description: `Nên học ${getDurationSuggestion(avgDurationSec, activeDays14d)}; chọn ${getDifficultySuggestion(overallAccuracy, completionRatio)}; áp dụng ${getFeedbackStyleSuggestion(overallAccuracy, negativeRatio)}.`,
            action: {
                route: '/app',
                label: 'Áp dụng trong buổi tới'
            }
        });

        // 3. Đề xuất theo cảm xúc yếu cụ thể
        if (weakestEmotion && toNumber(weakestEmotion.accuracy) < 65) {
            const fallbackLevel = nextActivity?.levelId || 1;
            pushUniqueRecommendation(recommendations, {
                type: 'WEAK_EMOTION_FOCUS',
                icon: '🎯',
                title: `Tập trung cảm xúc yếu: ${weakestEmotion.emotion_name}`,
                description: `Độ chính xác hiện tại ${toNumber(weakestEmotion.accuracy)}% trên ${toNumber(weakestEmotion.attempts)} lượt. Nên luyện lại bằng bài ${lessonLabel(weakestEmotion.lesson_type)} với phản hồi ngắn từng bước.`,
                action: {
                    route: lessonRoute(weakestEmotion.lesson_type, fallbackLevel),
                    label: 'Luyện ngay'
                }
            });
        }

        // 4. Gợi ý ngắn cho phụ huynh
        pushUniqueRecommendation(recommendations, {
            type: 'PARENT_TIP',
            icon: '👨‍👩‍👧',
            title: 'Gợi ý ngắn cho phụ huynh',
            description: buildParentTip({
                negativeRatio,
                weakestEmotion,
                activeDays14d,
                daysInactive
            }),
            action: {
                route: '/report',
                label: 'Xem báo cáo chi tiết'
            }
        });

        // 5. Wellbeing theo lịch sử cảm xúc
        if (totalTrendSessions >= 4 && negativeRatio >= 0.45) {
            pushUniqueRecommendation(recommendations, {
                type: 'WELLBEING',
                icon: '❤️',
                title: 'Điều chỉnh nhịp học để ổn định cảm xúc',
                description: `Gần đây tỷ lệ cảm xúc tiêu cực là ${Math.round(negativeRatio * 100)}%. Nên chuyển sang hoạt động nhẹ, thời lượng ngắn và tăng phản hồi tích cực.`,
                action: {
                    route: '/emotion-practice',
                    label: 'Luyện nhẹ nhàng'
                }
            });
        }

        // 6. Tần suất sử dụng thấp
        if ((daysInactive !== null && daysInactive >= 2) || (activities14d > 0 && activeDays14d <= 3)) {
            pushUniqueRecommendation(recommendations, {
                type: 'COMEBACK',
                icon: '🔥',
                title: 'Khôi phục nhịp học đều',
                description: daysInactive !== null && daysInactive >= 2
                    ? `Đã ${daysInactive} ngày chưa học. Nên bắt đầu lại bằng 1 buổi ngắn hôm nay.`
                    : 'Tần suất tuần này còn thấp. Nên cố định giờ học mỗi ngày để tránh quên nhịp.',
                action: {
                    route: '/app',
                    label: 'Học ngay'
                }
            });
        }

        // 7. Gợi ý khám phá nếu có loại bài chưa chơi
        const playedTypes = gameAccuracy.map((item) => item.lesson_type);
        const unplayedTypes = LESSON_ORDER.filter((type) => !playedTypes.includes(type));

        if (unplayedTypes.length > 0) {
            const targetType = unplayedTypes[0];
            pushUniqueRecommendation(recommendations, {
                type: 'EXPLORE',
                icon: '🔍',
                title: `Khám phá thêm ${lessonLabel(targetType)}`,
                description: 'Con chưa luyện dạng bài này. Thêm hoạt động mới sẽ giúp kỹ năng cảm xúc linh hoạt hơn.',
                action: {
                    route: lessonRoute(targetType, 1),
                    label: 'Thử ngay'
                }
            });
        }

    } catch (error) {
        console.error('Recommendation error:', error);
    }

    return recommendations.slice(0, 6);
}

export default { getRecommendations };
