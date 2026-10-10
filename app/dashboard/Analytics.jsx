'use client';

import { useState } from 'react';

function Ranking({ title, rows, total, metric }) {
  const max = Math.max(1, ...rows.map(row => row.value));
  return (
    <section className="rounded-2xl border border-[#3f3f46] bg-[#27272a] p-6">
      <h2 className="font-semibold text-white">{title}</h2>
      <p className="mt-1 text-xs text-gray-400">Top 6 by {metric.toLowerCase()} · share of filtered total</p>
      <ol className="mt-6 space-y-5">
        {rows.slice(0, 6).map(row => (
          <li key={row.name}>
            <div className="mb-2 flex justify-between gap-4 text-sm">
              <span className="truncate text-gray-200" title={row.name}>{row.name}</span>
              <span className="shrink-0 text-white">{row.value.toLocaleString()} <span className="text-xs text-gray-400">· {total ? (row.value / total * 100).toFixed(1) : '0'}%</span></span>
            </div>
            <svg viewBox="0 0 400 16" className="h-4 w-full" role="img" aria-label={`${row.name}: ${row.value.toLocaleString()} ${metric.toLowerCase()}`}>
              <rect width="400" height="16" rx="4" fill="#18181b" />
              <rect width={row.value / max * 400} height="16" rx="4" fill="#818cf8"><title>{row.name}: {row.value.toLocaleString()}</title></rect>
            </svg>
          </li>
        ))}
      </ol>
      {rows.every(row => row.value === 0) && <p className="mt-4 text-sm text-gray-400">No estimated value for these articles. Configure prices in Manage Sites.</p>}
    </section>
  );
}

const COLORS = ['#818cf8', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#71717a'];

function Distribution({ rows, total, metric }) {
  const slices = rows.slice(0, 5);
  const other = rows.slice(5).reduce((sum, row) => sum + row.value, 0);
  if (other > 0) slices.push({ name: 'Other websites', value: other });
  const segments = slices.map((slice, index) => ({ ...slice, color: COLORS[index], share: total ? slice.value / total * 100 : 0, offset: total ? slices.slice(0, index).reduce((sum, row) => sum + row.value, 0) / total * 100 : 0 }));
  return <section className="rounded-2xl border border-[#3f3f46] bg-[#27272a] p-6">
    <h2 className="font-semibold text-white">Website distribution</h2>
    <p className="mt-1 text-xs text-gray-400">Share of {metric.toLowerCase()} across selected websites</p>
    <div className="mt-6 grid items-center gap-8 sm:grid-cols-2">
      <svg viewBox="0 0 240 240" className="mx-auto w-full max-w-64" role="img" aria-label={`Website distribution: ${segments.map(segment => `${segment.name} ${segment.share.toFixed(1)}%`).join(', ')}`}>
        <circle cx="120" cy="120" r="88" fill="none" stroke="#3f3f46" strokeWidth="30" />
        {segments.filter(segment => segment.value > 0).map(segment => <circle key={segment.name} cx="120" cy="120" r="88" fill="none" stroke={segment.color} strokeWidth="30" pathLength="100" strokeDasharray={`${segment.share} ${100 - segment.share}`} strokeDashoffset={-segment.offset} transform="rotate(-90 120 120)"><title>{segment.name}: {segment.value.toLocaleString()} ({segment.share.toFixed(1)}%)</title></circle>)}
        <text x="120" y="116" textAnchor="middle" fill="white" fontSize="22" fontWeight="600">{total.toLocaleString()}</text>
        <text x="120" y="140" textAnchor="middle" fill="#a1a1aa" fontSize="12">{metric}</text>
      </svg>
      <ul className="space-y-4">{segments.map(segment => <li key={segment.name} className="flex items-center gap-3 text-sm"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} /><span className="min-w-0 flex-1 truncate" title={segment.name}>{segment.name}</span><span className="text-gray-400">{segment.share.toFixed(1)}%</span></li>)}</ul>
    </div>
    {total === 0 && <p className="mt-4 text-sm text-gray-400">No value available for the selected filters.</p>}
  </section>;
}

export default function Analytics({ groups, period }) {
  const [metric, setMetric] = useState('articles');
  const authors = new Map();
  let pricedPosts = 0;
  for (const site of groups) {
    for (const item of site.items) {
      const name = item.author || 'Unknown author';
      const current = authors.get(name) || { name, count: 0, amount: 0 };
      current.count += item.count;
      current.amount += item.totalPrice;
      authors.set(name, current);
      if (item.pricePerPost > 0) pricedPosts += item.count;
    }
  }
  const posts = groups.reduce((sum, site) => sum + site.totalCount, 0);
  const amount = groups.reduce((sum, site) => sum + site.totalAmount, 0);
  const total = metric === 'articles' ? posts : amount;
  const sites = groups.map(site => ({ name: site.domain, value: metric === 'articles' ? site.totalCount : site.totalAmount })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const contributors = [...authors.values()].map(author => ({ name: author.name, value: metric === 'articles' ? author.count : author.amount })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const label = metric === 'articles' ? 'Articles' : 'Estimated value';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Performance breakdown</h2>
          <p className="text-xs text-gray-400">{period} · Current website and author filters</p>
        </div>
        <div className="flex rounded-lg border border-[#3f3f46] p-1" aria-label="Analytics metric">
          {['articles', 'value'].map(option => <button key={option} type="button" aria-pressed={metric === option} onClick={() => setMetric(option)} className={`rounded-md px-3 py-2 text-xs font-medium ${metric === option ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>{option === 'articles' ? 'Articles' : 'Estimated value'}</button>)}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[['Total articles', posts.toLocaleString()], ['Contributing authors', authors.size.toLocaleString()], ['Estimated value', amount.toLocaleString()], ['Articles with a price', `${pricedPosts.toLocaleString()} / ${posts.toLocaleString()}`]].map(([title, value]) => <div key={title} className="rounded-xl border border-[#3f3f46] p-5"><p className="text-xs text-gray-400">{title}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Ranking title="Leading websites" rows={sites} total={total} metric={label} />
        <Ranking title="Leading authors" rows={contributors} total={total} metric={label} />
      </div>
      <Distribution rows={sites} total={total} metric={label} />
      <p className="text-xs leading-relaxed text-gray-500">Estimated value uses current site prices and excludes configured admins and articles without a price. Amounts use the units entered in site settings.</p>
    </div>
  );
}
