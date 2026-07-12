// backend/routes/filters.js
import express from 'express';
import { supabase } from '../services/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// جلب فلاتر المستخدم الحالي
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('user_filters')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(); // عشان يرجع null لو مفيش بيانات
    
    if (error) throw error;
    
    res.json(data || {}); // يرجع كائن فاضي لو مفيش فلاتر
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ error: error.message });
  }
});

// حفظ/تحديث فلاتر المستخدم
router.post('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = req.body;
    
    // نضيف user_id للفلتر
    const filterData = {
      user_id: userId,
      ...filters
    };
    
    // استخدام UPSERT (update or insert)
    const { data, error } = await supabase
      .from('user_filters')
      .upsert(filterData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ 
      message: 'Filters saved successfully',
      filters: data 
    });
  } catch (error) {
    console.error('Save filters error:', error);
    res.status(500).json({ error: error.message });
  }
});

// حذف الفلاتر (اختياري)
router.delete('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { error } = await supabase
      .from('user_filters')
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
    
    res.json({ message: 'Filters deleted successfully' });
  } catch (error) {
    console.error('Delete filters error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;