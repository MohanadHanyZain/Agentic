// frontend/src/services/api.js
import { getToken, getAuthHeaders } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// دالة مساعدة للطلبات
const request = async (endpoint, options = {}) => {
  const token = getToken(); // ✅ جلب التوكن من localStorage
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // ✅ إضافة التوكن فقط لو موجود
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  // ✅ معالجة 401 بشكل صحيح
  if (response.status === 401) {
    // حذف التوكن الفاسد
    localStorage.removeItem('token');
    // إعادة التوجيه لتسجيل الدخول
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please login again.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
};

// جلب الفلاتر
export const getFilters = async () => {
  return request('/filters');
};

// حفظ الفلاتر
export const saveFilters = async (filters) => {
  return request('/filters', {
    method: 'POST',
    body: JSON.stringify(filters)
  });
};

// حذف الفلاتر
export const deleteFilters = async () => {
  return request('/filters', {
    method: 'DELETE'
  });
};

// جلب الوظائف
export const getJobs = async () => {
  return request('/jobs');
};

// جلب آخر وظيفة
export const getLatestJob = async () => {
  return request('/jobs/latest');
};

// تشغيل السكرابر
export const runScraper = async () => {
  return request('/scraper/run', {
    method: 'POST'
  });
};

// جلب حالة السكرابر
export const getScraperStatus = async () => {
  return request('/scraper/status');
};

// جلب سجل العمليات
export const getScrapeLogs = async () => {
  return request('/jobs/logs');
};