// backend/scripts/test-scraper.js
import dotenv from 'dotenv';
import { runScraperForUser } from '../services/scraper.js';

dotenv.config();

// اختبار تشغيل السكرابر لمستخدم معين
const testScraper = async () => {
    const testUserId = 'your-test-user-id'; // غيرها بـ user id حقيقي من Supabase
    
    const testFilters = {
        search_queries: 'react,nodejs',
        sort_by: 'most_recent',
        job_type: 'hourly',
        experience_level: 'intermediate',
        budget_min: '50',
        budget_max: '200'
    };
    
    console.log('🧪 Testing scraper with filters:', testFilters);
    
    const result = await runScraperForUser(testUserId, testFilters);
    console.log('📊 Result:', result);
};

// تشغيل التست
testScraper();