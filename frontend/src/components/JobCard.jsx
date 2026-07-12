// frontend/src/components/JobCard.jsx
import React from 'react';

const JobCard = ({ job }) => {
  // استخراج البيانات مع fallbacks
  const title = job?.title || job?.name || 'Untitled Job';
  const description = job?.description || job?.content || '';
  const url = job?.url || job?.link || '#';
  const budget = job?.budget || job?.price || 'N/A';
  const experienceLevel = job?.experienceLevel || job?.experience || 'Any';
  const jobType = job?.jobType || job?.type || 'N/A';
  const clientHistory = job?.clientHistory || job?.client_history || '';
  const postedAt = job?.postedAt || job?.createdAt || '';

  // تقصير الوصف
  const shortDescription = description.length > 150 
    ? description.substring(0, 150) + '...' 
    : description;

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
        {clientHistory && (
          <span className="text-sm bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
            👤 {clientHistory}
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

      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-500 text-sm mt-3 inline-block hover:text-blue-700 hover:underline"
      >
        View on Upwork →
      </a>
      {job.is_active === false && (
  <span className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded">
    ⛔ Expired
  </span>
)}
    </div>


  );
};

export default JobCard;