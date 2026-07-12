// backend/services/logs.js
import { supabase } from './supabase.js';

/**
 * تسجيل عملية سكرابر في قاعدة البيانات
 */
export const logScrape = async (userId, status, details) => {
    try {
        const logData = {
            user_id: userId,
            status: status,
            jobs_found: details.jobs_found || 0,
            jobs_added: details.jobs_added || 0,
            jobs_expired: details.jobs_expired || 0,
            completed_at: new Date().toISOString()
        };

        if (status === 'failed') {
            logData.error_message = details.error || 'Unknown error';
        }

        const { data, error } = await supabase
            .from('scrape_logs')
            .insert(logData)
            .select()
            .single();

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('❌ Error logging scrape:', error.message);
        return null;
    }
};

/**
 * جلب آخر عمليات السكرابر لمستخدم
 */
export const getScrapeLogs = async (userId, limit = 20) => {
    try {
        const { data, error } = await supabase
            .from('scrape_logs')
            .select('*')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('❌ Error fetching logs:', error.message);
        return [];
    }
};