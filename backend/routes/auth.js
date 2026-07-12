// backend/routes/auth.js
import express from 'express';
import { supabase } from '../services/supabase.js';

const router = express.Router();

// تسجيل حساب جديد
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // لو نجح التسجيل، نضيف بروفايل في جدول profiles
    if (data.user) {
      await supabase.from('profiles').insert([
        { id: data.user.id, email: data.user.email }
      ]);
    }

    res.status(201).json({ 
      message: 'User created successfully',
      user: data.user,
      session: data.session 
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ error: error.message });
  }
});

// تسجيل الدخول
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    res.json({ 
      message: 'Login successful',
      user: data.user,
      session: data.session 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message });
  }
});

// تسجيل الخروج
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// جلب بيانات المستخدم الحالي
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;