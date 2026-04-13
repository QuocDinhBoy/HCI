import express from 'express';
import { getAudio, proxyExternalAudio } from '../controllers/ttsController.js';

const router = express.Router();

router.get('/audio', getAudio);
router.get('/proxy', proxyExternalAudio);

export default router;
