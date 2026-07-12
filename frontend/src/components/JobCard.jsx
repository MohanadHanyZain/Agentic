// frontend/src/components/JobCard.jsx
import React from 'react';

const JobCard = ({ job }) => {
  // استخراج البيانات
  const jobData = job?.job_data || job || {};
  
  const title = jobData?.title || job?.title || 'Untitled Job';
  const description = jobData?.description || job?.description || '';
  let url = jobData?.url || job?.url || job?.link || job?.jobUrl || '#';
  
  // ✅ تأكد من صحة الرابط
  if (url && url !== '#' && !url.startsWith('http')) {
    if (url.startsWith('/')) {
      url = `https://www.upwork.com${url}`;
    } else if (url.startsWith('~')) {
      url = `https://www.upwork.com/jobs/${url}`;
    } else {
      url = `https://www.upwork.com/jobs/${url}`;
    }
  }
  
  const isValidUrl = url && url !== '#' && url.startsWith('http');
  const budget = jobData?.budget || job?.budget || 'N/A';
  const experienceLevel = jobData?.experienceLevel || job?.experienceLevel || 'Any';
  const jobType = jobData?.jobType || job?.jobType || 'N/A';
  const postedAt = jobData?.postedAt || job?.postedAt || job?.postedDate || '';
  
  // بيانات إضافية من الـ Actor الجديد
  const clientRating = jobData?.clientRating || job?.clientRating || null;
  const country = jobData?.country || job?.country || '';

  const shortDescription = description?.length > 150 
    ? description.substring(0, 150) + '...' 
    : description || '';

  return (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 bg-white">
      <h3 className="font-bold text-lg text-gray-800 line-clamp-2 mb-2">
        {title}
      </h3>
      
      <div className="flex flex-wrap gap-2 mt-2">
        {budget !== 'N/A' && (
          <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
            💰 {budget}
          </span>
        )}
        {experienceLevel !== 'Any' && (
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
            ⭐ {experienceLevel}
          </span>
        )}
        {jobType !== 'N/A' && (
          <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
            🏷️ {jobType}
          </span>
        )}
        {clientRating && (
          <span className="text-sm bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
            ⭐ {clientRating}/5
          </span>
        )}
        {country && (
          <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
            🌍 {country}
          </span>
        )}
      </div>

      {shortDescription && (
        <p className="mt-3 text-sm text-gray-600 line-clamp-3">
          {shortDescription}
        </p>
      )}

      {postedAt && (
        <p className="mt-2 text-xs text-gray-400">
          Posted: {new Date(postedAt).toLocaleDateString()}
        </p>
      )}

      {isValidUrl ? (
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 text-sm mt-3 inline-block hover:text-blue-700 hover:underline"
        >
          View on Upwork →
        </a>
      ) : (
        <span className="text-gray-400 text-sm mt-3 inline-block">
          ⛔ Job no longer available
        </span>
      )}
    </div>
  );
};

export default JobCard;