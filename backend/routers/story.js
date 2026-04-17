import express from 'express';
import { getStoryList, getStoryDetail, completeStory } from '../controllers/storyController.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',           verifyToken, getStoryList);
router.get('/:id',        verifyToken, getStoryDetail);
router.post('/:id/complete', verifyToken, completeStory);

export default router;
