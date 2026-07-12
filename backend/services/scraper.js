// backend/services/scraper.js
import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import { supabase } from './supabase.js';
import { logScrape } from './logs.js';

dotenv.config();

const client = new ApifyClient({
    token: process.env.APIFY_API_KEY,
});

const ACTOR_ID = process.env.APIFY_ACTOR_ID || 'devcake/upwork-jobs-scraper';

// ✅ خرائط التحويل
const EXPERIENCE_LEVEL_MAP = {
    'entry': 'EntryLevel',
    'intermediate': 'IntermediateLevel',
    'expert': 'ExpertLevel'
};

const WORKLOAD_MAP = {
    'less_than_10': 'part_time',
    '10_30': 'full_time',
    'more_than_30': 'full_time',
    'part_time': 'part_time',
    'full_time': 'full_time',
    'as_needed': 'as_needed'
};

const DURATION_MAP = {
    'less_than_1_week': 'less_than_1_week',
    '1_4_weeks': '1_4_weeks',
    'more_than_1_month': 'more_than_1_month'
};

const mapExperienceLevel = (value) => {
    if (!value) return undefined;
    return EXPERIENCE_LEVEL_MAP[value.toLowerCase()] || value;
};

const mapWorkload = (value) => {
    if (!value) return undefined;
    return WORKLOAD_MAP[value.toLowerCase()] || value;
};

const mapDuration = (value) => {
    if (!value) return undefined;
    return DURATION_MAP[value.toLowerCase()] || value;
};

/**
 * تنظيف الـ input قبل إرساله لـ Apify
 */
const cleanActorInput = (filters) => {
    const clean = {};
    
    // 1. Search Queries - Array
    if (filters.search_queries) {
        clean.searchQueries = filters.search_queries
            .split(',')
            .map(q => q.trim())
            .filter(q => q.length > 0);
    } else {
        clean.searchQueries = ['developer'];
    }
    
    // 2. Sort By
    clean.sortBy = filters.sort_by || 'most_recent';
    
    // 3. Job Type - Array
    if (filters.job_type && filters.job_type.length > 0) {
        clean.jobType = [filters.job_type.toLowerCase()];
    }
    
    // 4. Experience Level - Array
    if (filters.experience_level && filters.experience_level.length > 0) {
        const mapped = mapExperienceLevel(filters.experience_level);
        if (mapped) {
            clean.experienceLevel = [mapped];
        }
    }
    
    // 5. Workload - Array مع mapping
    if (filters.workload && filters.workload.length > 0) {
        const mapped = mapWorkload(filters.workload);
        if (mapped) {
            clean.workload = [mapped];
        }
    }
    
    // 6. Project Duration - Array
    if (filters.project_duration && filters.project_duration.length > 0) {
        const mapped = mapDuration(filters.project_duration);
        if (mapped) {
            clean.projectDuration = [mapped];
        }
    }
    
    // 7. Budget - Numbers
    if (filters.budget_min && filters.budget_min.length > 0) {
        clean.budgetMin = parseFloat(filters.budget_min);
    }
    if (filters.budget_max && filters.budget_max.length > 0) {
        clean.budgetMax = parseFloat(filters.budget_max);
    }
    
    // 8. Client History
    if (filters.client_history && filters.client_history.length > 0) {
        clean.clientHistory = filters.client_history;
    }
    
    // 9. إعدادات إضافية
    clean.maxResults = 20;
    clean.scrapeAllPages = false;
    
    // تنظيف undefined
    Object.keys(clean).forEach(key => {
        if (clean[key] === undefined || clean[key] === null) {
            delete clean[key];
        }
    });
    
    return clean;
};

/**
 * 🆕 حفظ الوظائف باستخدام UPSERT (بدون حذف)
 */
const saveJobsToDatabase = async (userId, jobs, filters) => {
    try {
        // 1. جلب filter_id
        const { data: filterData } = await supabase
            .from('user_filters')
            .select('id')
            .eq('user_id', userId)
            .single();
        
        const filterId = filterData?.id || null;
        
        // 2. تحضير البيانات مع job_url الفريد
        const jobsToUpsert = jobs.map(job => {
            // استخراج URL فريد
            const jobUrl = job.url || job.link || job.jobUrl || '';
            
            // استخراج job_id من الرابط (آخر جزء)
            const jobId = jobUrl.split('/').pop() || null;
            
            return {
                user_id: userId,
                filter_id: filterId,
                job_url: jobUrl, // ✅ المفتاح الفريد
                job_id: jobId,
                job_data: {
                    title: job.title || job.name || 'Untitled',
                    description: job.description || job.content || '',
                    url: jobUrl,
                    budget: job.budget || job.price || 'N/A',
                    experienceLevel: job.experienceLevel || job.experience || 'Any',
                    jobType: job.jobType || job.type || 'N/A',
                    clientHistory: job.clientHistory || job.client_history || '',
                    postedAt: job.postedAt || job.createdAt || new Date().toISOString()
                },
                last_seen: new Date().toISOString(), // ✅ تحديث وقت المشاهدة
                is_active: true,
                status: 'active',
                scraped_at: new Date().toISOString()
            };
        });

        // 3. استخدام UPSERT مع onConflict
        let addedCount = 0;
        let existingCount = 0;
        const errors = [];

        for (const job of jobsToUpsert) {
            // نتخطى الوظائف التي ليس لها URL
            if (!job.job_url || job.job_url === '#') {
                console.warn('⚠️ Skipping job without URL:', job.job_data.title);
                continue;
            }

            const { data, error } = await supabase
                .from('jobs')
                .upsert(
                    job,
                    { 
                        onConflict: 'job_url', // المفتاح الفريد
                        ignoreDuplicates: false // ✅ نحدث last_seen لو موجود
                    }
                )
                .select();

            if (error) {
                errors.push(error.message);
                console.error('❌ Error upserting job:', error.message);
            } else if (data && data.length > 0) {
                // لو رجع data يبقى تمت الإضافة
                addedCount++;
            } else {
                // لو مفيش data يبقى موجود بالفعل
                existingCount++;
            }
        }

        console.log(`📊 UPSERT Results: ${addedCount} new, ${existingCount} existing, ${errors.length} errors`);

        return {
            addedCount,
            existingCount,
            errors
        };

    } catch (error) {
        console.error(`❌ Error in saveJobsToDatabase:`, error.message);
        throw error;
    }
};

/**
 * 🆕 كشف الوظائف المنتهية
 */
const detectExpiredJobs = async (userId, currentJobUrls) => {
    try {
        // 1. جلب جميع الوظائف النشطة للمستخدم
        const { data: activeJobs, error } = await supabase
            .from('jobs')
            .select('job_url, id')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) throw error;

        if (!activeJobs || activeJobs.length === 0) {
            return { expiredCount: 0, expiredUrls: [] };
        }

        // 2. استخراج الـ URLs النشطة
        const activeUrls = activeJobs.map(j => j.job_url).filter(url => url && url !== '#');

        // 3. مقارنة مع الوظائف الحالية
        const currentUrls = currentJobUrls.filter(url => url && url !== '#');
        const expiredUrls = activeUrls.filter(url => !currentUrls.includes(url));

        // 4. تحديث حالة الوظائف المنتهية
        if (expiredUrls.length > 0) {
            const { error: updateError } = await supabase
                .from('jobs')
                .update({ 
                    is_active: false, 
                    status: 'expired',
                    expired_at: new Date().toISOString()
                })
                .in('job_url', expiredUrls)
                .eq('user_id', userId);

            if (updateError) throw updateError;
            
            console.log(`🗑️ Marked ${expiredUrls.length} jobs as expired`);
        }

        return {
            expiredCount: expiredUrls.length,
            expiredUrls
        };

    } catch (error) {
        console.error('❌ Error detecting expired jobs:', error.message);
        return { expiredCount: 0, expiredUrls: [], error: error.message };
    }
};

/**
 * تشغيل Actor لجلب الوظائف
 */
export const runScraperForUser = async (userId, filters) => {
    const startTime = new Date();
    let jobsFound = 0;
    let addedCount = 0;
    let expiredCount = 0;
    let status = 'running';
    let errorMessage = null;

    try {
        console.log(`🔄 Starting scraper for user ${userId}`);
        console.log('📥 Original filters:', JSON.stringify(filters, null, 2));
        
        const input = cleanActorInput(filters);
        console.log('📤 Cleaned input for Apify:', JSON.stringify(input, null, 2));
        
        if (!input.searchQueries || input.searchQueries.length === 0) {
            throw new Error('Search queries are required');
        }
        
        console.log(`🚀 Calling Apify Actor: ${ACTOR_ID}`);
        const run = await client.actor(ACTOR_ID).call(input);
        console.log(`✅ Actor started, Run ID: ${run.id}`);
        
        const datasetId = run.defaultDatasetId;
        if (!datasetId) {
            throw new Error('No dataset ID returned from actor');
        }
        
        const dataset = client.dataset(datasetId);
        const { items } = await dataset.listItems();
        
        jobsFound = items?.length || 0;
        console.log(`📊 Found ${jobsFound} jobs for user ${userId}`);
        
        // ✅ حفظ باستخدام UPSERT
        if (items && items.length > 0) {
            const saveResult = await saveJobsToDatabase(userId, items, filters);
            addedCount = saveResult.addedCount || 0;
            
            // ✅ كشف الوظائف المنتهية
            const currentUrls = items.map(job => job.url || job.link || job.jobUrl || '').filter(url => url && url !== '#');
            const expiredResult = await detectExpiredJobs(userId, currentUrls);
            expiredCount = expiredResult.expiredCount || 0;
        }

        status = 'success';
        
        return {
            success: true,
            jobCount: jobsFound,
            addedCount: addedCount,
            expiredCount: expiredCount,
            runId: run.id
        };

    } catch (error) {
        console.error(`❌ Scraper error for user ${userId}:`, error.message);
        status = 'failed';
        errorMessage = error.message;
        return {
            success: false,
            error: error.message || 'Unknown error occurred',
            jobCount: jobsFound,
            addedCount: 0,
            expiredCount: 0
        };
    } finally {
        // ✅ تسجيل العملية في scrape_logs
        await logScrape(userId, status, {
            jobs_found: jobsFound,
            jobs_added: addedCount,
            jobs_expired: expiredCount,
            error: errorMessage
        });
    }
};

/**
 * تشغيل السكرابر لكل المستخدمين
 */
export const runScraperForAllUsers = async () => {
    try {
        console.log('🔄 Starting scheduled scrape for all users...');
        
        const { data: usersWithFilters, error } = await supabase
            .from('user_filters')
            .select('user_id, *')
            .not('user_id', 'is', null);
        
        if (error) throw error;
        
        if (!usersWithFilters || usersWithFilters.length === 0) {
            console.log('ℹ️ No users with filters found');
            return { success: true, message: 'No users to process' };
        }
        
        console.log(`👥 Found ${usersWithFilters.length} users with filters`);
        
        const results = [];
        
        for (const userFilter of usersWithFilters) {
            const { user_id, ...filters } = userFilter;
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const result = await runScraperForUser(user_id, filters);
            results.push({
                userId: user_id,
                ...result
            });
        }
        
        console.log(`✅ Scrape completed for ${results.length} users`);
        return {
            success: true,
            results
        };
        
    } catch (error) {
        console.error('❌ Error in runScraperForAllUsers:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};