'use client';

import { useEffect, useMemo, useState } from 'react';
import Analytics from '../dashboard/Analytics.jsx';

export default function AnalyticsPage() {
  const [data, setData] = useState([]);
  const [sites, setSites] = useState([]);
  const [month, setMonth] = useState('');
  const [domain, setDomain] = useState('');
  const [author, setAuthor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams(month ? { month } : {});
        const responses = await Promise.all([
          fetch(`/api/articles?${params}`, { signal: controller.signal }),
          fetch('/api/sites', { signal: controller.signal }),
        ]);
        const [articles, config] = await Promise.all(responses.map(response => response.json()));
        if (responses.some(response => !response.ok) || !articles.success || !config.success) throw new Error('Unable to load analytics. Please try again.');
        setData(articles.data);
        setSites(config.data);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [month, retry]);

  const groups = useMemo(() => {
    const grouped = new Map();
    for (const item of data) {
      if (domain && item.domain !== domain || author && item.author !== author) continue;
      const site = sites.find(site => site.domain.toLowerCase() === item.domain.toLowerCase());
      const name = item.author?.trim().toLowerCase();
      const isAdmin = !name || site?.admins?.some(admin => admin.trim().toLowerCase() === name);
      const isPrime = name === 'prime star' || name === 'prime star seo';
      const pricePerPost = isAdmin ? 0 : isPrime && site?.primeStarPrice > 0 ? site.primeStarPrice : site?.basePrice > 0 ? site.basePrice : 0;
      const group = grouped.get(item.domain) || { domain: item.domain, items: [], totalCount: 0, totalAmount: 0 };
      const totalPrice = pricePerPost * item.count;
      group.items.push({ ...item, pricePerPost, totalPrice });
      group.totalCount += item.count;
      group.totalAmount += totalPrice;
      grouped.set(item.domain, group);
    }
    return [...grouped.values()];
  }, [data, sites, domain, author]);
  const inputClass = 'mt-2 w-full rounded-lg border border-[#3f3f46] bg-[#27272a] px-3 py-3 text-sm text-white [color-scheme:dark]';

  return <main className="min-h-screen bg-[#18181b] px-6 py-8 md:p-10">
    <div className="mx-auto max-w-5xl space-y-6">
      <header><h1 className="text-3xl font-semibold text-white">Analytics</h1><p className="mt-2 text-sm text-gray-400">Compare publishing volume, author contributions, and estimated value.</p></header>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-xs text-gray-400">Month<input type="month" value={month} onChange={event => { setMonth(event.target.value); setDomain(''); setAuthor(''); }} className={inputClass} /></label>
        <label className="text-xs text-gray-400">Website<select value={domain} onChange={event => setDomain(event.target.value)} className={inputClass}><option value="">All websites</option>{[...new Set(data.map(item => item.domain))].sort().map(name => <option key={name}>{name}</option>)}</select></label>
        <label className="text-xs text-gray-400">Author<select value={author} onChange={event => setAuthor(event.target.value)} className={inputClass}><option value="">All authors</option>{[...new Set(data.map(item => item.author))].sort().map(name => <option key={name}>{name}</option>)}</select></label>
      </div>
      <button type="button" onClick={() => { setMonth(''); setDomain(''); setAuthor(''); }} className="text-sm text-indigo-400 hover:text-indigo-300">Reset filters</button>
      {loading ? <div role="status" className="animate-pulse rounded-2xl bg-[#27272a] p-12 text-gray-400">Loading analytics…</div> : error ? <div role="alert" className="rounded-xl border border-red-400/30 p-6 text-red-300">{error}<button onClick={() => setRetry(value => value + 1)} className="ml-4 underline">Retry</button></div> : groups.length ? <Analytics groups={groups} period={month || 'All time'} /> : <div className="rounded-2xl bg-[#27272a] p-12 text-center text-gray-400">No articles match these filters.</div>}
    </div>
  </main>;
}
