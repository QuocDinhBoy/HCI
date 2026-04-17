import db from '../config/db.js';
import { checkAndGrantBadges } from './badgeController.js';

async function checkLessonCompletion(conn, userId, lessonTypeId, emotionGroupId) {
    const [rows] = await conn.query(
        `SELECT COUNT(*) as count FROM user_progress_stat 
         WHERE user_id = ? AND lesson_type_id = ? AND emotion_group_id = ? AND total_correct_count > 0`,
        [userId, lessonTypeId, emotionGroupId]
    );
    return rows[0].count > 0;
}

export const logActivity = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const userId = req.user.id;

        let { 
            lessonType, 
            levelId, 
            isCorrect, 
            questionId, 
            chosenEmotionId, 
            duration, 
            totalAttempts, 
            correctCount   
        } = req.body;

        let typeCode = lessonType.toUpperCase();
        if (typeCode === 'EMOTION_TRAINING') {
            typeCode = 'TRAINING';
        }

        const [typeRows] = await conn.query('SELECT id FROM lesson_type WHERE code = ?', [typeCode]);
        
        if (typeRows.length === 0) {
            return res.status(400).json({ message: 'Loại bài học không hợp lệ' });
        }
        
        const lessonTypeId = typeRows[0].id;

        let score = 0;
        
        if (typeCode === 'MATCHING') {
            if (totalAttempts > 0) {
                score = Math.round((correctCount / totalAttempts) * 100);
            } else {
                score = 100; 
            }
            isCorrect = true; 
        } else {
            score = isCorrect ? 100 : 0;
        }

        await conn.beginTransaction();

        const insertLogQuery = `
            INSERT INTO user_activity_log 
            (user_id, lesson_type_id, lesson_ref_id, chosen_emotion_id, is_correct, score, session_duration, answered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        await conn.query(insertLogQuery, [
            userId, 
            lessonTypeId, 
            questionId || 0, 
            chosenEmotionId || null, 
            isCorrect ? 1 : 0, 
            score, 
            duration || 0
        ]);

        const updateStatQuery = `
            INSERT INTO user_progress_stat (user_id, lesson_type_id, emotion_group_id, total_play, total_correct_count, last_played_at)
            VALUES (?, ?, ?, 1, ?, NOW())
            ON DUPLICATE KEY UPDATE 
                total_play = total_play + 1,
                total_correct_count = total_correct_count + VALUES(total_correct_count),
                last_played_at = NOW();
        `;
        
        await conn.query(updateStatQuery, [userId, lessonTypeId, levelId, isCorrect ? 1 : 0]);

        await conn.commit();

        // Kiểm tra và trao huy hiệu mới (non-blocking, sau commit)
        const newBadges = await checkAndGrantBadges(userId).catch(() => []);

        res.status(200).json({ message: "Lưu kết quả thành công", score, newBadges });

    } catch (error) {
        await conn.rollback();
        console.error("Lỗi ghi log:", error);
        res.status(500).json({ message: "Lỗi server khi lưu kết quả" });
    } finally {
        conn.release();
    }
};

export const getProgressMap = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const userId = req.user.id;
        
        const [levelRows] = await conn.query('SELECT id, name, description FROM emotion_group ORDER BY id');
        
        const [lessonTypeRows] = await conn.query('SELECT id, code FROM lesson_type');
        const lessonTypesMap = lessonTypeRows.reduce((acc, lt) => { acc[lt.code] = lt.id; return acc; }, {});
        
        const lessonOrder = ['FLASHCARD', 'MATCHING', 'CONTEXT', 'TRAINING', 'AI'];
        
        const result = [];
        let previousLevelCompleted = true; 

        for (const level of levelRows) {
            let currentLevelCompleted = true;
            const lessonsStatus = {};
            
            let isLevelLocked = !previousLevelCompleted;
            if (level.id === 1) isLevelLocked = false; 

            for (const typeCode of lessonOrder) {
                const typeId = lessonTypesMap[typeCode];
                if (!typeId) {
                    console.warn(`⚠️ Cảnh báo: Không tìm thấy ID cho loại bài học ${typeCode} trong DB`);
                    continue;
                }

                const isCompleted = await checkLessonCompletion(conn, userId, typeId, level.id);
                
                let keyName = typeCode.toLowerCase(); // mặc định: flashcard, matching...
                
                if (typeCode === 'TRAINING') {
                    keyName = 'emotion_training'; // Đổi 'training' -> 'emotion_training'
                }

                lessonsStatus[keyName] = isCompleted;
                
                if (!isCompleted) {
                    currentLevelCompleted = false;
                }
            }

            result.push({
                id: level.id,
                name: level.name,
                description: level.description,
                locked: isLevelLocked,
                chestClaimed: false,
                lessons: lessonsStatus
            });
            
            previousLevelCompleted = currentLevelCompleted;
        }

        // --- DEBUG LOG (Xem kết quả này trong Terminal của Backend) ---
        // console.log("DATA TRẢ VỀ FRONTEND:", JSON.stringify(result, null, 2));

        res.status(200).json(result);

    } catch (error) {
        console.error("Lỗi lấy Progress Map:", error);
        res.status(500).json({ message: "Lỗi server khi tải bản đồ" });
    } finally {
        conn.release();
    }
};