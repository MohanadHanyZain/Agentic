// backend/routes/jobs.js
import express from 'express';
import { supabase } from '../services/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { getScrapeLogs } from '../services/logs.js';

const router = express.Router();

// جلب وظائف المستخدم الحالي
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // نرتب من الأحدث للأقدم
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', userId)
      .order('scraped_at', { ascending: false })
      .limit(50); // نحدد عدد الوظائف
    
    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// جلب آخر وظيفة مسحوبة (للتحديث)
router.get('/latest', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', userId)
      .order('scraped_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    
    res.json(data || null);
  } catch (error) {
    console.error('Get latest job error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ✅ إضافة Endpoint جديد لجلب سجل العمليات
router.get('/logs', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const logs = await getScrapeLogs(userId, 20);
        res.json(logs);
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;