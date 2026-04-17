import express from 'express';
import { getAllBadges, getRecentBadges } from '../controllers/badgeController.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',       verifyToken, getAllBadges);
router.get('/recent', verifyToken, getRecentBadges);

export default router;
