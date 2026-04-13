import express from 'express';
import { getAlerts, markAsRead, markAllAsRead } from '../controllers/alertController.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, getAlerts);
router.patch('/read-all', verifyToken, markAllAsRead);
router.patch('/:id/read', verifyToken, markAsRead);

export default router;
