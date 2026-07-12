// backend/services/scraper.js
import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import { supabase } from './supabase.js';
import { logScrape } from './logs.js';

dotenv.config();

const client = new ApifyClient({
    token: process.env.APIFY_API_KEY,
});

const ACTOR_ID = process.env.APIFY_ACTOR_ID || 'blackfalcondata/upwork-scraper';

// ✅ خريطة تحويل قيم الـ Experience Level للـ Actor الجديد
const EXPERIENCE_LEVEL_MAP = {
    'entry': 'Entry',
    'intermediate': 'Intermediate',
    'expert': 'Expert'
};

// ✅ خريطة تحويل قيم الـ Workload
const WORKLOAD_MAP = {
    'less_than_10': 'LessThan10',
    '10_30': '10To30',
    'more_than_30': 'MoreThan30',
    'part_time': 'PartTime',
    'full_time': 'FullTime',
    'as_needed': 'AsNeeded'
};

// ✅ خريطة تحويل Project Duration
const DURATION_MAP = {
    'less_than_1_week': 'LessThan1Week',
    '1_4_weeks': '1To4Weeks',
    'more_than_1_month': 'MoreThan1Month'
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
 * ✅ تنظيف الـ input للـ Actor الجديد blackfalcondata/upwork-scraper
 */
const cleanActorInput = (filters) => {
    const clean = {};
    
    // 1. Search Queries - ✅ Array مطلوب
    if (filters.search_queries) {
        clean.searchQueries = filters.search_queries
            .split(',')
            .map(q => q.trim())
            .filter(q => q.length > 0);
    } else {
        clean.searchQueries = ['developer'];
    }
    
    // 2. ✅ الحد الأقصى للنتائج
    clean.maxResults = parseInt(filters.maxResults) || 20;
    
    // 3. ✅ تفعيل Incremental Mode - بيجيب بس الجديد
    clean.incrementalMode = true;
    
    // 4. ✅ استبعاد الوظائف المنتهية
    clean.excludeExpired = true;
    
    // 5. ✅ Flatten Results - عشان النتائج تكون واضحة
    clean.flattenResults = true;
    
    // 6. ✅ Experience Level - مصفوفة
    if (filters.experience_level && filters.experience_level.length > 0) {
        const mapped = mapExperienceLevel(filters.experience_level);
        if (mapped) {
            clean.experienceLevels = [mapped];
        }
    }
    
    // 7. ✅ Job Type - مصفوفة
    if (filters.job_type && filters.job_type.length > 0) {
        clean.jobTypes = [filters.job_type.toLowerCase()];
    }
    
    // 8. ✅ Workload - مصفوفة
    if (filters.workload && filters.workload.length > 0) {
        const mapped = mapWorkload(filters.workload);
        if (mapped) {
            clean.workloads = [mapped];
        }
    }
    
    // 9. ✅ Project Duration - مصفوفة
    if (filters.project_duration && filters.project_duration.length > 0) {
        const mapped = mapDuration(filters.project_duration);
        if (mapped) {
            clean.projectDurations = [mapped];
        }
    }
    
    // 10. ✅ Budget Range
    if (filters.budget_min && filters.budget_min.length > 0) {
        clean.minBudget = parseFloat(filters.budget_min);
    }
    if (filters.budget_max && filters.budget_max.length > 0) {
        clean.maxBudget = parseFloat(filters.budget_max);
    }
    
    // 11. ✅ Client Hiring History
    if (filters.client_history && filters.client_history.length > 0) {
        clean.clientHistory = filters.client_history;
    }
    
    // 12. ✅ استخدام بروكسي لتجنب الحظر
    clean.useApifyProxy = true;
    clean.apifyProxyGroups = ['RESIDENTIAL'];
    clean.apifyProxyCountries = ['US'];
    
    // تنظيف أي قيم undefined
    Object.keys(clean).forEach(key => {
        if (clean[key] === undefined || clean[key] === null || 
            (Array.isArray(clean[key]) && clean[key].length === 0)) {
            delete clean[key];
        }
    });
    
    return clean;
};

/**
 * ✅ حفظ الوظائف باستخدام UPSERT
 */
const saveJobsToDatabase = async (userId, jobs, filters) => {
    try {
        // جلب filter_id
        const { data: filterData } = await supabase
            .from('user_filters')
            .select('id')
            .eq('user_id', userId)
            .single();
        
        const filterId = filterData?.id || null;
        
        let addedCount = 0;
        let existingCount = 0;
        const errors = [];

        for (const job of jobs) {
            // ✅ استخراج الرابط الصحيح
            let jobUrl = job.url || job.link || job.jobUrl || job.job_url || '';
            
            // ✅ بناء الرابط الكامل
            if (jobUrl && !jobUrl.startsWith('http')) {
                if (jobUrl.startsWith('/')) {
                    jobUrl = `https://www.upwork.com${jobUrl}`;
                } else if (jobUrl.startsWith('~')) {
                    jobUrl = `https://www.upwork.com/jobs/${jobUrl}`;
                } else {
                    jobUrl = `https://www.upwork.com/jobs/${jobUrl}`;
                }
            }
            
            if (!jobUrl || jobUrl === '#') {
                console.warn('⚠️ Skipping job without valid URL:', job.title);
                continue;
            }
            
            // استخراج job_id
            const jobId = jobUrl.split('/').pop() || null;
            
            // ✅ تحضير البيانات
            const jobData = {
                user_id: userId,
                filter_id: filterId,
                job_url: jobUrl,
                job_id: jobId,
                job_data: {
                    title: job.title || job.name || 'Untitled',
                    description: job.description || job.content || job.snippet || '',
                    url: jobUrl,
                    budget: job.budget || job.price || job.hourlyRate || 'N/A',
                    experienceLevel: job.experienceLevel || job.experience || 'Any',
                    jobType: job.jobType || job.type || job.job_type || 'N/A',
                    clientHistory: job.clientHistory || job.client_history || '',
                    postedAt: job.postedAt || job.createdAt || job.postedDate || new Date().toISOString(),
                    // بيانات إضافية من الـ Actor الجديد
                    clientRating: job.clientRating || null,
                    totalSpent: job.totalSpent || null,
                    totalHires: job.totalHires || null,
                    country: job.country || null
                },
                last_seen: new Date().toISOString(),
                is_active: true,
                status: 'active',
                scraped_at: new Date().toISOString()
            };

            // ✅ UPSERT
            const { data, error } = await supabase
                .from('jobs')
                .upsert(
                    jobData,
                    { 
                        onConflict: 'job_url',
                        ignoreDuplicates: false
                    }
                )
                .select();

            if (error) {
                errors.push(error.message);
                console.error('❌ Error upserting job:', error.message);
            } else if (data && data.length > 0) {
                addedCount++;
            } else {
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
 * ✅ كشف الوظائف المنتهية
 */
const detectExpiredJobs = async (userId, currentJobUrls) => {
    try {
        const { data: activeJobs, error } = await supabase
            .from('jobs')
            .select('job_url, id')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) throw error;

        if (!activeJobs || activeJobs.length === 0) {
            return { expiredCount: 0, expiredUrls: [] };
        }

        const activeUrls = activeJobs.map(j => j.job_url).filter(url => url && url !== '#');
        const currentUrls = currentJobUrls.filter(url => url && url !== '#');
        const expiredUrls = activeUrls.filter(url => !currentUrls.includes(url));

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
 * ✅ تشغيل Actor لجلب الوظائف
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

        // ✅ فلترة الوظائف الصالحة فقط
        const validJobs = items?.filter(job => {
            const url = job.url || job.link || job.jobUrl || '';
            return url && url !== '#' && job.title;
        }) || [];

        console.log(`✅ ${validJobs.length} valid jobs out of ${jobsFound}`);

        if (validJobs.length > 0) {
            const saveResult = await saveJobsToDatabase(userId, validJobs, filters);
            addedCount = saveResult.addedCount || 0;
            
            const currentUrls = validJobs.map(job => job.url || job.link || job.jobUrl || '').filter(url => url && url !== '#');
            const expiredResult = await detectExpiredJobs(userId, currentUrls);
            expiredCount = expiredResult.expiredCount || 0;
        }

        status = 'success';
        
        return {
            success: true,
            jobCount: jobsFound,
            validCount: validJobs.length,
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
        // تسجيل العملية
        await logScrape(userId, status, {
            jobs_found: jobsFound,
            jobs_added: addedCount,
            jobs_expired: expiredCount,
            error: errorMessage
        });
    }
};

/**
 * ✅ تشغيل السكرابر لكل المستخدمين
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