import { getRecommendations } from '../services/adaptiveEngine.js';

/**
 * Lấy đề xuất cá nhân hoá
 * GET /api/recommendations
 */
export const getRecommendationsHandler = async (req, res) => {
    try {
        const userId = req.user.id;
        const recommendations = await getRecommendations(userId);
        res.json({ success: true, recommendations });
    } catch (error) {
        console.error("Lỗi recommendations:", error);
        res.status(500).json({ success: false, error: "Lỗi tạo đề xuất" });
    }
};
