// frontend/src/components/FiltersForm.jsx
import React, { useState, useEffect } from 'react';

const FiltersForm = ({ onSubmit, isLoading, initialFilters = {} }) => {
    // ✅ كل القيم تبدأ ب string فاضية، مش null أو undefined
    const [filters, setFilters] = useState({
        sort_by: 'most_recent',
        job_type: '',
        experience_level: '',
        workload: '',
        project_duration: '',
        budget_min: '',
        budget_max: '',
        client_history: '',
        search_queries: ''
    });

    // ✅ تنظيف الـ initialFilters من أي قيم null أو undefined
    useEffect(() => {
        if (Object.keys(initialFilters).length > 0) {
            const cleanFilters = {};
            Object.keys(initialFilters).forEach(key => {
                // لو القيمة null أو undefined، استخدم string فاضية
                cleanFilters[key] = initialFilters[key] ?? '';
            });
            setFilters(prev => ({
                ...prev,
                ...cleanFilters
            }));
        }
    }, [initialFilters]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        // ✅ التأكد من إن القيمة دايمًا string
        setFilters(prev => ({
            ...prev,
            [name]: value ?? ''
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // ✅ تنظيف الفلاتر من القيم الفاضية
        const cleanFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => 
                value !== '' && value !== null && value !== undefined
            )
        );
        onSubmit(cleanFilters);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <select 
                    name="experience_level"
                    value={filters.experience_level} 
                    onChange={handleChange}
                    className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">⭐ Experience Level</option>
    <option value="entry">Entry Level</option>
    <option value="intermediate">Intermediate Level</option>  {/* ✅ غيرنا الاسم */}
    <option value="expert">Expert Level</option>
                </select>

                <input
                    type="text"
                    name="search_queries"
                    placeholder="🔍 Search Queries (comma separated)"
                    value={filters.search_queries}
                    onChange={handleChange}
                    className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />

                <select
                    name="experience_level"
                    value={filters.experience_level}
                    onChange={handleChange}
                    className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">⭐ Experience Level</option>
                    <option value="entry">Entry Level</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="expert">Expert</option>
                </select>

                <select
                    name="job_type"
                    value={filters.job_type}
                    onChange={handleChange}
                    className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">📋 Job Type</option>
    <option value="hourly">Hourly</option>        {/* ✅ غيرنا للقيم المطلوبة */}
    <option value="fixed">Fixed Price</option>
                </select>

                <input
                    type="number"
                    name="budget_min"
                    placeholder="💰 Min Budget ($)"
                    value={filters.budget_min}
                    onChange={handleChange}
                    className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
                
                <input
                    type="number"
                    name="budget_max"
                    placeholder="💰 Max Budget ($)"
                    value={filters.budget_max}
                    onChange={handleChange}
                    className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />

                <select
                    name="project_duration"
                    value={filters.project_duration}
                    onChange={handleChange}
                    className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">⏱️ Project Duration</option>
                    <option value="less_than_1_week">Less than 1 week</option>
                    <option value="1_4_weeks">1-4 weeks</option>
                    <option value="more_than_1_month">More than 1 month</option>
                </select>

                <select
    name="workload"
    value={filters.workload}
    onChange={handleChange}
    className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
>
    <option value="">📊 Workload</option>
    <option value="part_time">Part Time</option>        {/* ✅ جديد */}
    <option value="full_time">Full Time</option>        {/* ✅ جديد */}
    <option value="as_needed">As Needed</option>        {/* ✅ جديد */}
</select>

                <input
                    type="text"
                    name="client_history"
                    placeholder="👤 Client Hiring History"
                    value={filters.client_history}
                    onChange={handleChange}
                    className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50"
            >
                {isLoading ? '💾 Saving...' : '💾 Save Filters'}
            </button>
        </form>
    );
};

export default FiltersForm;