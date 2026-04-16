import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routers/auth.js';
import userRoutes from './routers/user.js';
import flashcardRoutes from './routers/flashcard.js';
import matchingRoutes from './routers/matching.js';
import contextRoutes from './routers/context.js';
import emotionTrainingRoutes from './routers/emotionTraining.js';
import aiRoutes from './routers/ai.js';
import progressRoutes from './routers/progress.js';
import reportRoutes from './routers/report.js';
import geminiRoutes from './routers/gemini.js';
import emotionSessionRoutes from './routers/emotionSession.js';
import alertRoutes from './routers/alert.js';
import recommendationRoutes from './routers/recommendation.js';
import ttsRoutes from './routers/tts.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS — chỉ cho phép frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5175',
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging (dev mode)
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`${new Date().toISOString()} | ${req.method} ${req.originalUrl}`);
    }
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/progress-map', progressRoutes);
app.use('/api/flashcard', flashcardRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/context', contextRoutes);
app.use('/api/emotion-training', emotionTrainingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/emotion-sessions', emotionSessionRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/tts', ttsRoutes);

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'EmpathyKids API is running',
        version: '2.0'
    });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});