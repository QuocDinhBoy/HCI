import db from '../config/db.js';
import { evaluateBehavioralAlerts } from '../services/alertService.js';

/**
 * Lấy danh sách alerts
 * GET /api/alerts
 */
export const getAlerts = async (req, res) => {
    try {
        const userId = req.user.id;
        const onlyUnread = req.query.unread === 'true';

        // Tự động cập nhật cảnh báo rule-based trước khi trả dữ liệu.
        await evaluateBehavioralAlerts(userId);

        let query = `
            SELECT id, alert_type, description, session_id, is_read, created_at
            FROM emotion_alerts
            WHERE user_id = ?
        `;
        if (onlyUnread) query += ' AND is_read = 0';
        query += ' ORDER BY created_at DESC LIMIT 50';

        const [alerts] = await db.query(query, [userId]);
        
        // Count unread
        const [unreadCount] = await db.query(
            'SELECT COUNT(*) as count FROM emotion_alerts WHERE user_id = ? AND is_read = 0',
            [userId]
        );

        res.json({ 
            success: true, 
            alerts, 
            unreadCount: unreadCount[0].count 
        });
    } catch (error) {
        console.error("Lỗi lấy alerts:", error);
        res.status(500).json({ success: false, error: "Lỗi lấy cảnh báo" });
    }
};

/**
 * Đánh dấu alert đã đọc
 * PATCH /api/alerts/:id/read
 */
export const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const alertId = req.params.id;
        const [result] = await db.query(
            'UPDATE emotion_alerts SET is_read = 1 WHERE id = ? AND user_id = ?',
            [alertId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy cảnh báo' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Lỗi mark alert:", error);
        res.status(500).json({ success: false, error: "Lỗi cập nhật" });
    }
};

/**
 * Mark all alerts as read
 * PATCH /api/alerts/read-all
 */
export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        await db.query('UPDATE emotion_alerts SET is_read = 1 WHERE user_id = ?', [userId]);
        res.json({ success: true });
    } catch (error) {
        console.error("Lỗi mark all:", error);
        res.status(500).json({ success: false, error: "Lỗi cập nhật" });
    }
};
