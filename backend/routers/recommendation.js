import express from 'express';
import { getRecommendationsHandler } from '../controllers/recommendationController.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, getRecommendationsHandler);

export default router;
