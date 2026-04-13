import express from 'express';
import { analyzeEmotion } from '../controllers/geminiController.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/gemini/analyze
// Yêu cầu xác thực để tránh API bị lạm dụng bởi bên ngoài
router.post('/analyze', verifyToken, analyzeEmotion);

export default router;