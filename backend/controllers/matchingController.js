import db from '../config/db.js';

export const getMatchingCards = async (req, res) => {
    try {
        const level = req.params.level;

        if (!level) {
            return res.status(400).json({ message: "Thiếu tham số 'level' trong đường dẫn." });
        }

        const query = `
            SELECT 
                mc.id,
                mc.pair_key, 
                e.name AS emotion_name,
                m.url AS image_url
            FROM matching_card mc
            JOIN media_asset m ON mc.image_id = m.id
            JOIN emotion e ON mc.emotion_id = e.id
            WHERE mc.emotion_group_id = ? 
            ORDER BY mc.id ASC; 
        `;

        const [rows] = await db.query(query, [level]);

        const rawCards = rows.map(row => ({
            id: row.id,
            pair_key: row.pair_key,
            emotion: row.emotion_name,
            image: row.image_url
        }));

        // Chỉ giữ các nhóm thẻ có thể ghép thành cặp để tránh kẹt game khi dữ liệu DB thiếu thẻ.
        const grouped = new Map();
        rawCards.forEach((card) => {
            if (!card.pair_key) return;
            const list = grouped.get(card.pair_key) || [];
            list.push(card);
            grouped.set(card.pair_key, list);
        });

        const result = [];
        grouped.forEach((cards) => {
            const usableCount = cards.length - (cards.length % 2);
            if (usableCount >= 2) {
                result.push(...cards.slice(0, usableCount));
            }
        });

        res.status(200).json(result);

    } catch (error) {
        console.error("Lỗi lấy dữ liệu Matching:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};