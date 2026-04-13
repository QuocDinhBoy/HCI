import db from '../config/db.js';

export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id; 

        // Tối ưu hóa: Chạy các truy vấn đồng thời thay vì tuần tự
        const [
            [userRows],
            [scoreRow],
            [dateRows]
        ] = await Promise.all([
            db.query(`SELECT username, email, parent_name, avatar FROM user WHERE id = ?`, [userId]),
            db.query(`SELECT SUM(score) as total_score FROM user_activity_log WHERE user_id = ?`, [userId]),
            db.query(`SELECT DISTINCT DATE(answered_at) as play_date FROM user_activity_log WHERE user_id = ? ORDER BY play_date DESC`, [userId])
        ]);

        if (userRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }
        const user = userRows[0];

        const totalStars = scoreRow[0]?.total_score || 0;

        let streak = 0;
        if (dateRows.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const lastPlayDate = new Date(dateRows[0].play_date);
            lastPlayDate.setHours(0, 0, 0, 0);

            const diffTime = today.getTime() - lastPlayDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

            if (diffDays <= 1) {
                streak = 1; 
                // Duyệt ngược về quá khứ để đếm chuỗi
                for (let i = 0; i < dateRows.length - 1; i++) {
                    const d1 = new Date(dateRows[i].play_date);
                    const d2 = new Date(dateRows[i+1].play_date);
                    // Khoảng cách giữa 2 ngày phải là 1 ngày (86400000ms)
                    const diff = (d1.getTime() - d2.getTime()) / (1000 * 3600 * 24);
                    if (Math.round(diff) === 1) {
                        streak++;
                    } else {
                        break; 
                    }
                }
            }
        }

        // 4. Trả về kết quả
        res.status(200).json({
            userInfo: {
                childName: user.username,   // Map username -> childName
                parentName: user.parent_name,
                email: user.email,
                avatar: user.avatar
            },
            stars: totalStars,
            currentStreak: streak
        });

    } catch (error) {
        console.error("Lỗi lấy profile:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};