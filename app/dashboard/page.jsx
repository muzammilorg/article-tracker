'use client';

import { useState, useEffect, useMemo } from 'react';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');
  const [siteSearch, setSiteSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('most');
  const [allAuthors, setAllAuthors] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (month) params.append('month', month);
      if (authorSearch) params.append('author', authorSearch);
      
      const res = await fetch(`/api/articles?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unique authors on mount
  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const res = await fetch('/api/articles');
        const json = await res.json();
        if (json.success) {
          const authors = new Set();
          json.data.forEach(item => authors.add(item.author));
          setAllAuthors(Array.from(authors).sort((a, b) => a.localeCompare(b)));
        }
      } catch (error) {
        console.error('Failed to fetch authors', error);
      }
    };
    fetchAuthors();
  }, []);

  useEffect(() => {
    // debounce fetching
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [month, authorSearch]);

  const totalGlobalPosts = data.reduce((sum, item) => sum + item.count, 0);

  const filteredData = useMemo(() => {
    if (!siteSearch) return data;
    return data.filter(item => item.domain.toLowerCase().includes(siteSearch.toLowerCase()));
  }, [data, siteSearch]);

  const domainGroups = useMemo(() => {
    const groups = filteredData.reduce((acc, curr) => {
      if (!acc[curr.domain]) {
        acc[curr.domain] = [];
      }
      acc[curr.domain].push(curr);
      return acc;
    }, {});
    
    // Convert to array for sorting
    const sorted = Object.entries(groups).map(([domain, items]) => {
      const totalCount = items.reduce((sum, item) => sum + item.count, 0);
      return { domain, items, totalCount };
    });

    if (sortOrder === 'most') {
      sorted.sort((a, b) => b.totalCount - a.totalCount);
    } else {
      sorted.sort((a, b) => a.totalCount - b.totalCount);
    }

    return sorted;
  }, [filteredData, sortOrder]);

  const sitesTracked = Object.keys(domainGroups).length;
  const avgPerSite = sitesTracked > 0 ? Math.round(totalGlobalPosts / sitesTracked) : 0;
  const topSite = sitesTracked > 0 ? domainGroups[0].domain : '-';

  // Helper to format month for display
  const displayMonth = month ? new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Overall';

  return (
    <div className="min-h-screen bg-[#18181b] p-6 md:p-10 font-sans text-gray-200">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Search Website Input */}
        <div className="w-full">
          <input 
            type="text" 
            placeholder="Search website..." 
            value={siteSearch}
            onChange={(e) => setSiteSearch(e.target.value)}
            className="w-full bg-[#27272a] border border-[#3f3f46] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
             <div className="relative w-full md:max-w-[240px]">
                <input 
                  type="month" 
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full appearance-none bg-[#27272a] border border-[#3f3f46] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors font-medium [color-scheme:dark]"
                />
             </div>
             <div className="relative w-full md:max-w-[240px]">
                <select 
                  value={authorSearch}
                  onChange={(e) => setAuthorSearch(e.target.value)}
                  className="w-full appearance-none bg-[#27272a] border border-[#3f3f46] rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors font-medium cursor-pointer"
                >
                  <option value="">All Authors</option>
                  {allAuthors.map(author => (
                    <option key={author} value={author}>{author}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
             </div>
          </div>
          <button 
            onClick={() => setSortOrder(prev => prev === 'most' ? 'least' : 'most')}
            className="w-full md:w-auto bg-[#18181b] border border-[#3f3f46] hover:bg-[#27272a] text-white px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            Sort: {sortOrder === 'most' ? 'most articles' : 'least articles'}
          </button>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-[#3f3f46] my-6"></div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#27272a] rounded-xl p-5">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Sites Tracked</h3>
            <p className="text-3xl font-semibold text-white">{sitesTracked}</p>
          </div>
          <div className="bg-[#27272a] rounded-xl p-5">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Total Articles</h3>
            <p className="text-3xl font-semibold text-white">{totalGlobalPosts}</p>
          </div>
          <div className="bg-[#27272a] rounded-xl p-5">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Avg Per Site</h3>
            <p className="text-3xl font-semibold text-white">{avgPerSite}</p>
          </div>
          <div className="bg-[#27272a] rounded-xl p-5">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Top Site</h3>
            <p className="text-lg font-semibold text-white truncate mt-1" title={topSite}>{topSite || '-'}</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#27272a] rounded-2xl p-6 h-64 animate-pulse flex flex-col justify-between border border-[#3f3f46]">
                 <div className="h-4 bg-[#3f3f46] rounded w-1/2 mb-4"></div>
                 <div className="h-10 bg-[#3f3f46] rounded w-1/4 mb-4"></div>
                 <div className="h-4 bg-[#3f3f46] rounded w-3/4 mb-4"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && domainGroups.length === 0 && (
          <div className="text-center py-20 bg-[#27272a] rounded-2xl border border-[#3f3f46] mt-8">
            <h3 className="text-xl font-bold text-white">No articles found</h3>
            <p className="text-gray-400 mt-2">Try adjusting your filters or check back later.</p>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          {!loading && domainGroups.map(({ domain, items, totalCount }) => (
            <div key={domain} className="bg-[#27272a] rounded-2xl border border-[#3f3f46] flex flex-col relative overflow-hidden group hover:border-gray-500 transition-colors">
              <div className="p-6 pb-5 flex-1 flex flex-col">
                <h2 className="text-[15px] font-bold text-white mb-2 truncate">{domain}</h2>
                <div className="flex flex-col mb-5">
                  <span className="text-[40px] leading-none font-semibold text-white mb-1">{totalCount}</span>
                  <span className="text-[13px] text-gray-400">
                    articles {month ? `in ${displayMonth}` : 'overall'}
                  </span>
                </div>
                
                <div className="space-y-0 mt-auto relative">
                  {items.map((item, idx) => (
                     <div key={idx} className="flex items-center justify-between py-3 border-t border-[#3f3f46] group-hover:border-gray-600 transition-colors">
                        <span className="text-[14px] font-medium text-gray-300 truncate pr-4">{item.author}</span>
                        <span className="inline-flex items-center justify-center bg-[#18181b] rounded-full px-2.5 py-0.5 text-[11px] font-bold text-gray-300">
                          {item.count}
                        </span>
                     </div>
                  ))}
                  
                  {/* Floating Action Button (Arrow down) simulation from screenshot */}
                  {items.length > 2 && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-[#27272a] rounded-full flex items-center justify-center border border-[#3f3f46] shadow-lg cursor-pointer hover:bg-[#3f3f46] transition-colors z-10">
                       <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Bottom blue accent line */}
              <div className="h-[3px] bg-[#1d4ed8] mx-6 mb-4 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
