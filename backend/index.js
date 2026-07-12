// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import filtersRoutes from './routes/filters.js';
import jobsRoutes from './routes/jobs.js';
import scraperRoutes from './routes/scraper.js';
import { startScheduler } from './jobs/scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/filters', filtersRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/scraper', scraperRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running!',
        scraper: process.env.APIFY_API_KEY ? 'enabled' : 'disabled'
    });
});

// بدء السيرفر والجدولة
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    
    // بدء الجدولة لو الـ API Key موجود
    if (process.env.APIFY_API_KEY) {
        startScheduler();
    } else {
        console.warn('⚠️ APIFY_API_KEY not found. Scheduler disabled.');
    }
});