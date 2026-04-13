import db from '../config/db.js';
import { checkForAlerts } from '../services/alertService.js';

/**
 * Bắt đầu emotion session
 * POST /api/emotion-sessions
 */
export const startSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionType } = req.body; // REALTIME | PRACTICE | GAME

        const [result] = await db.query(
            `INSERT INTO emotion_sessions (user_id, session_type) VALUES (?, ?)`,
            [userId, sessionType || 'REALTIME']
        );

        res.status(201).json({ 
            success: true,
            sessionId: result.insertId 
        });
    } catch (error) {
        console.error("Lỗi tạo session:", error);
        res.status(500).json({ success: false, error: "Lỗi tạo session" });
    }
};

/**
 * Ghi batch emotion snapshots (gửi mỗi ~10 giây)
 * POST /api/emotion-sessions/:id/snapshots
 */
export const addSnapshots = async (req, res) => {
    try {
        const sessionId = req.params.id;
        const { snapshots } = req.body; // Array of { dominant, neutral, happy, sad, angry, fearful, disgusted, surprised }

        if (!snapshots || snapshots.length === 0) {
            return res.status(400).json({ success: false, error: "Không có dữ liệu" });
        }

        const values = snapshots.map(s => [
            sessionId,
            s.dominant || 'neutral',
            s.neutral || 0, s.happy || 0, s.sad || 0,
            s.angry || 0, s.fearful || 0, s.disgusted || 0, s.surprised || 0
        ]);

        await db.query(
            `INSERT INTO emotion_snapshots 
            (session_id, dominant, neutral, happy, sad, angry, fearful, disgusted, surprised) 
            VALUES ?`,
            [values]
        );

        res.json({ success: true, count: snapshots.length });
    } catch (error) {
        console.error("Lỗi ghi snapshots:", error);
        res.status(500).json({ success: false, error: "Lỗi ghi snapshots" });
    }
};

/**
 * Kết thúc emotion session
 * PUT /api/emotion-sessions/:id/end
 */
export const endSession = async (req, res) => {
    try {
        const sessionId = req.params.id;

        // Tính dominant emotion & avg confidence từ snapshots
        const [stats] = await db.query(`
            SELECT 
                dominant,
                COUNT(*) as count,
                AVG(GREATEST(neutral, happy, sad, angry, fearful, disgusted, surprised)) as avg_conf
            FROM emotion_snapshots 
            WHERE session_id = ?
            GROUP BY dominant
            ORDER BY count DESC
            LIMIT 1
        `, [sessionId]);

        const dominantEmotion = stats.length > 0 ? stats[0].dominant : 'neutral';
        const avgConfidence = stats.length > 0 ? Math.round(stats[0].avg_conf) : 0;

        await db.query(
            `UPDATE emotion_sessions 
             SET ended_at = NOW(), dominant_emotion = ?, avg_confidence = ?
             WHERE id = ?`,
            [dominantEmotion, avgConfidence, sessionId]
        );

        res.json({ 
            success: true, 
            dominantEmotion, 
            avgConfidence 
        });

        // Kiểm tra cảnh báo bất thường (async, không block response)
        checkForAlerts(req.user.id, sessionId).catch(console.error);
    } catch (error) {
        console.error("Lỗi kết thúc session:", error);
        res.status(500).json({ success: false, error: "Lỗi kết thúc session" });
    }
};

/**
 * Lấy danh sách sessions của user
 * GET /api/emotion-sessions/history
 */
export const getHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;

        const [sessions] = await db.query(`
            SELECT id, session_type, started_at, ended_at, dominant_emotion, avg_confidence,
                   TIMESTAMPDIFF(MINUTE, started_at, COALESCE(ended_at, NOW())) as duration_minutes
            FROM emotion_sessions 
            WHERE user_id = ?
            ORDER BY started_at DESC
            LIMIT ?
        `, [userId, limit]);

        res.json({ success: true, sessions });
    } catch (error) {
        console.error("Lỗi lấy history:", error);
        res.status(500).json({ success: false, error: "Lỗi lấy lịch sử" });
    }
};
