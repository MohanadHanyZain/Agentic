// frontend/src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FiltersForm from '../components/FiltersForm';
import JobCard from '../components/JobCard';
import { getJobs, getFilters, saveFilters, runScraper } from '../services/api';

const Home = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingFilters, setSavingFilters] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [currentFilters, setCurrentFilters] = useState({});
  const [lastScrape, setLastScrape] = useState(null);
  const [scrapeMessage, setScrapeMessage] = useState('');
  const [scrapeStats, setScrapeStats] = useState(null); // ✅ إضافة هذه الحالة
  const { user, logout } = useAuth();

  // جلب الوظائف والفلاتر عند التحميل
  useEffect(() => {
    loadData();
  }, []);

  // التحقق من وجود آخر وظيفة لعرض وقت آخر سحب
  useEffect(() => {
    if (jobs.length > 0) {
      const latestJob = jobs[0];
      if (latestJob?.scraped_at) {
        setLastScrape(new Date(latestJob.scraped_at));
      }
    }
  }, [jobs]);

  const loadData = async () => {
    setLoading(true);
    try {
      // جلب الوظائف
      const jobsData = await getJobs();
      setJobs(jobsData || []);

      // جلب الفلاتر المحفوظة
      const filtersData = await getFilters();
      setCurrentFilters(filtersData || {});
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFilters = async (filters) => {
    setSavingFilters(true);
    setScrapeMessage('');
    try {
      await saveFilters(filters);
      setCurrentFilters(filters);
      await loadData();
      setScrapeMessage('✅ Filters saved successfully!');
      setTimeout(() => setScrapeMessage(''), 3000);
    } catch (error) {
      console.error('Error saving filters:', error);
      setScrapeMessage('❌ Failed to save filters');
      setTimeout(() => setScrapeMessage(''), 3000);
    } finally {
      setSavingFilters(false);
    }
  };

  const handleRunScraper = async () => {
    setScraping(true);
    setScrapeMessage('🔄 Running scraper...');
    setScrapeStats(null); // ✅ مسح الإحصائيات القديمة
    
    try {
      const result = await runScraper();
      console.log('Scraper result:', result);
      
      if (result.success) {
        // ✅ تخزين الإحصائيات
        setScrapeStats({
          added: result.addedCount || 0,
          expired: result.expiredCount || 0,
          total: result.jobCount || 0
        });
        
        setScrapeMessage(
          `✅ Scraper completed! ` +
          `📊 ${result.jobCount} jobs found, ` +
          `➕ ${result.addedCount} new, ` +
          `🗑️ ${result.expiredCount} expired`
        );
        
        // إعادة تحميل الوظائف
        setTimeout(() => loadData(), 3000);
      } else {
        setScrapeMessage(`❌ Scraper failed: ${result.error || 'Unknown error'}`);
      }
      
      setTimeout(() => {
        setScrapeMessage('');
      }, 10000);
      
    } catch (error) {
      console.error('Error running scraper:', error);
      setScrapeMessage(`❌ Error: ${error.message || 'Failed to run scraper'}`);
      setTimeout(() => setScrapeMessage(''), 5000);
    } finally {
      setScraping(false);
    }
  };

  // تحديث الوظائف كل 30 ثانية
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !scraping) {
        getJobs().then(jobsData => {
          if (jobsData && jobsData.length > 0) {
            setJobs(jobsData);
          }
        }).catch(console.error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loading, scraping]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">🚀 Upwork Job Scraper</h1>
          {lastScrape && (
            <p className="text-sm text-gray-500 mt-1">
              Last scrape: {lastScrape.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button
            onClick={logout}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Scrape Message */}
      {scrapeMessage && (
        <div className={`mb-4 p-3 rounded ${
          scrapeMessage.includes('✅') || scrapeMessage.includes('saved') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : scrapeMessage.includes('❌')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {scrapeMessage}
        </div>
      )}

      {/* Scrape Stats */}
      {scrapeStats && (
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div className="bg-green-50 p-3 rounded text-center border border-green-200">
            <div className="text-2xl font-bold text-green-600">{scrapeStats.added}</div>
            <div className="text-sm text-gray-600">New Jobs</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded text-center border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{scrapeStats.total}</div>
            <div className="text-sm text-gray-600">Total Found</div>
          </div>
          <div className="bg-red-50 p-3 rounded text-center border border-red-200">
            <div className="text-2xl font-bold text-red-600">{scrapeStats.expired}</div>
            <div className="text-sm text-gray-600">Expired</div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex flex-wrap justify-between items-center mb-3">
          <h2 className="font-semibold">🎯 Your Filters</h2>
          <button
            onClick={handleRunScraper}
            disabled={scraping || savingFilters}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition disabled:opacity-50"
          >
            {scraping ? '⏳ Running...' : '▶️ Run Scraper Now'}
          </button>
        </div>
        
        <FiltersForm 
          onSubmit={handleSaveFilters} 
          isLoading={savingFilters}
          initialFilters={currentFilters}
        />
        
        <p className="text-xs text-gray-500 mt-2">
          💡 Save filters to start automatic scraping every 30 minutes
        </p>
      </div>

      {/* Jobs Grid */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">📋 Jobs Found ({jobs.length})</h2>
          <button
            onClick={loadData}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            🔄 Refresh
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">No jobs found yet</p>
            <p className="text-gray-400 text-sm mt-2">
              Save your filters and run the scraper to fetch jobs from Upwork
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id || job._id} job={job.job_data || job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;