// backend/routes/scraper.js
import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { runScraperManually } from '../jobs/scheduler.js';
import { supabase } from '../services/supabase.js';
import { runScraperForUser } from '../services/scraper.js';

const router = express.Router();

// تشغيل السكرابر يدوياً (للمستخدم الحالي)
router.post('/run', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // جلب فلاتر المستخدم
        const { data: filters, error } = await supabase
            .from('user_filters')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !filters) {
            return res.status(400).json({ 
                error: 'No filters found for this user. Please save filters first.' 
            });
        }

        // تشغيل السكرابر
        const result = await runScraperForUser(userId, filters);
        
        res.json({
            message: 'Scraper started successfully',
            ...result
        });

    } catch (error) {
        console.error('Manual scrape error:', error);
        res.status(500).json({ error: error.message });
    }
});

// تشغيل السكرابر لكل المستخدمين (مش لازم يكون مسجل - admin use)
router.post('/run-all', async (req, res) => {
    try {
        // ممكن تضيف مفتاح سري هنا عشان الحماية
        const secretKey = req.headers['x-secret-key'];
        if (secretKey !== process.env.ADMIN_SECRET_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await runScraperManually();
        res.json({
            message: 'Scraper started for all users',
            ...result
        });

    } catch (error) {
        console.error('Run all error:', error);
        res.status(500).json({ error: error.message });
    }
});

// جلب حالة السكرابر
router.get('/status', authenticateUser, (req, res) => {
    // هنضيف حالة لاحقاً لو احتاجنا
    res.json({
        status: 'active',
        interval: process.env.SCRAPE_INTERVAL || '30',
        lastRun: new Date().toISOString()
    });
});

export default router;