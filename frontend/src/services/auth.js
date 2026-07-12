// frontend/src/services/auth.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// حفظ التوكن في localStorage
export const setToken = (token) => {
  localStorage.setItem('token', token);
};

// جلب التوكن
export const getToken = () => {
  return localStorage.getItem('token');
};

// حذف التوكن (تسجيل خروج)
export const removeToken = () => {
  localStorage.removeItem('token');
};

// إضافة التوكن لرأس الطلب
export const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// التحقق من وجود مستخدم مسجل دخول
export const isAuthenticated = () => {
  return !!getToken();
};

// تسجيل الدخول
export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Login failed');
  
  // حفظ التوكن
  if (data.session?.access_token) {
    setToken(data.session.access_token);
  }
  
  return data;
};

// تسجيل حساب جديد
export const signup = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Signup failed');
  
  // حفظ التوكن بعد التسجيل
  if (data.session?.access_token) {
    setToken(data.session.access_token);
  }
  
  return data;
};

// تسجيل الخروج
export const logout = async () => {
  try {
    const token = getToken();
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    removeToken();
  }
};

// جلب بيانات المستخدم الحالي
export const getCurrentUser = async () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        return null;
      }
      throw new Error('Failed to get user');
    }
    
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};