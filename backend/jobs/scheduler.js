// backend/jobs/scheduler.js
import cron from 'node-cron';
import { runScraperForAllUsers } from '../services/scraper.js';
import dotenv from 'dotenv';

dotenv.config();

// الجدولة - كل 30 دقيقة بشكل افتراضي
const INTERVAL = process.env.SCRAPE_INTERVAL || '30';

// تحويل الدقائق لـ Cron expression
// مثلاً: */30 * * * * => كل 30 دقيقة
const cronExpression = `*/${INTERVAL} * * * *`;

let isRunning = false;

/**
 * بدء الجدولة
 */
export const startScheduler = () => {
    console.log(`⏰ Scheduler started: Will run every ${INTERVAL} minutes`);
    console.log(`📅 Cron pattern: ${cronExpression}`);

    // تنفيذ المهمة فور بدء السيرفر
    setTimeout(() => {
        console.log('🔄 Running initial scrape on startup...');
        runScraperForAllUsers();
    }, 5000);

    // جدولة المهمة
    cron.schedule(cronExpression, async () => {
        if (isRunning) {
            console.log('⚠️ Previous scrape still running, skipping...');
            return;
        }

        isRunning = true;
        console.log(`🕐 ${new Date().toISOString()} - Starting scheduled scrape...`);

        try {
            await runScraperForAllUsers();
            console.log(`✅ ${new Date().toISOString()} - Scrape completed successfully`);
        } catch (error) {
            console.error(`❌ ${new Date().toISOString()} - Scrape failed:`, error.message);
        } finally {
            isRunning = false;
        }
    });
};

/**
 * تشغيل السكرابر يدوياً
 */
export const runScraperManually = async () => {
    if (isRunning) {
        throw new Error('Scraper is already running');
    }

    isRunning = true;
    try {
        const result = await runScraperForAllUsers();
        return result;
    } finally {
        isRunning = false;
    }
};