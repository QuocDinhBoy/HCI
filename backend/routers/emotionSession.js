import express from 'express';
import { startSession, addSnapshots, endSession, getHistory } from '../controllers/emotionSessionController.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, startSession);
router.post('/:id/snapshots', verifyToken, addSnapshots);
router.put('/:id/end', verifyToken, endSession);
router.get('/history', verifyToken, getHistory);

export default router;
