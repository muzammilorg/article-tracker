'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { pakistanToday } from '../../lib/pricing.js';
import { buildAuthorBills } from '../../lib/author-bills.js';

const number = value => value.toLocaleString('en-US', { maximumFractionDigits: 2 });

export default function AuthorBills() {
  const [month, setMonth] = useState('');
  const [author, setAuthor] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [loadedMonth, setLoadedMonth] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const selectedMonth = month || pakistanToday().slice(0, 7);
    async function load() {
      setLoading(true); setError('');
      try {
        const response = await fetch('/api/articles?' + new URLSearchParams({ month: selectedMonth }), { signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load monthly bills.');
        setData(result.data); setLoadedMonth(selectedMonth);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [month, retry]);
  const bills = useMemo(() => buildAuthorBills(data), [data]);
  const visible = bills.filter(bill => !author || bill.author === author);
  const period = loadedMonth ? new Intl.DateTimeFormat('en-US', {month: 'long', year: 'numeric', timeZone: 'Asia/Karachi'}).format(new Date(loadedMonth + '-01T00:00:00+05:00')) : '';
  const inputClass = 'mt-2 w-full rounded-lg border border-[#3f3f46] bg-[#27272a] px-3 py-3 text-white [color-scheme:dark]';
  return <main className="min-h-screen bg-[#18181b] p-6 md:p-10 print:bg-white print:p-0 print:text-black">
    <style>{'@media print { body { background: white !important; color: black !important; } nav { display: none !important; } .author-bill { break-inside: avoid; background: white !important; color: black !important; border-color: #ccc !important; } .author-bill * { color: black !important; } }'}</style>
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">Author Bills</h1><p className="mt-2 text-sm text-gray-400 print:text-black">Monthly publishing progress and article charges{period ? ' ? ' + period : ''}.</p></div>
        <button type="button" disabled={loading || !!error || !visible.length} onClick={() => window.print()} className="rounded-lg bg-indigo-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 print:hidden">Print / Save PDF</button>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 print:hidden">
        <label className="text-sm text-gray-400">Month<input type="month" value={month || loadedMonth} onChange={e => {if (e.target.value) {setMonth(e.target.value); setAuthor('');}}} className={inputClass} /></label>
        <label className="text-sm text-gray-400">Author<select value={author} onChange={e => setAuthor(e.target.value)} className={inputClass}><option value="">All authors</option>{bills.map(bill => <option key={bill.author} value={bill.author}>{bill.author}</option>)}</select></label>
      </div>
      {loading ? <p role="status" className="py-12 text-gray-400">Loading monthly bills?</p> : error ? <div role="alert" className="rounded-xl border border-red-400/30 p-6 text-red-300">{error}<button onClick={() => setRetry(value => value + 1)} className="ml-4 underline">Retry</button></div> : !visible.length ? <p className="rounded-xl bg-[#27272a] p-10 text-center text-gray-400">No articles found for this month.</p> : <>
        <div className="grid gap-4 sm:grid-cols-3 print:hidden">{[['Authors', visible.length], ['Articles', visible.reduce((sum,bill) => sum+bill.count,0)], ['Total bill', visible.reduce((sum,bill) => sum+bill.total,0)]].map(([label,value]) => <div key={label} className="rounded-xl border border-[#3f3f46] p-5"><p className="text-xs text-gray-400">{label}</p><p className="mt-2 text-2xl font-semibold">{number(value)}</p></div>)}</div>
        {visible.map(bill => <section key={bill.author} className="author-bill rounded-2xl border border-[#3f3f46] bg-[#27272a] p-5 md:p-6">
          <div className="flex flex-wrap justify-between gap-4"><div><h2 className="text-lg font-semibold">{bill.author}</h2><p className="mt-1 text-xs text-gray-400">{period} ? {bill.count} articles ? {bill.sites.length} websites</p></div><div className="text-right"><p className="text-xs text-gray-400">Total bill</p><p className="text-2xl font-semibold text-emerald-400">{number(bill.total)}</p></div></div>
          <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-gray-400"><tr><th scope="col" className="pb-3 pr-4">Website</th><th scope="col" className="pb-3 pr-4 text-right">Articles</th><th scope="col" className="pb-3 pr-4 text-right">With price</th><th scope="col" className="pb-3 text-right">Amount</th></tr></thead><tbody>{bill.sites.map(site => <tr key={site.domain} className="border-t border-[#3f3f46]"><th scope="row" className="py-3 pr-4 font-normal">{site.domain}</th><td className="py-3 pr-4 text-right"><Link className="underline decoration-gray-500 underline-offset-4" href={'/dashboard/posts?' + new URLSearchParams({domain:site.domain,author:bill.author,month:loadedMonth})}>{site.count}</Link></td><td className="py-3 pr-4 text-right">{site.pricedCount}</td><td className="py-3 text-right">{number(site.amount)}</td></tr>)}</tbody><tfoot><tr className="border-t border-[#3f3f46] font-semibold"><th scope="row" className="pt-3">Total</th><td className="pt-3 pr-4 text-right">{bill.count}</td><td className="pt-3 pr-4 text-right">{bill.pricedCount}</td><td className="pt-3 text-right">{number(bill.total)}</td></tr></tfoot></table></div>
          {bill.count > bill.pricedCount && <p className="mt-3 text-xs text-amber-300">{bill.count-bill.pricedCount} articles have zero charges (excluded admins or no positive rate). Check site pricing before finalizing.</p>}
        </section>)}
        <p className="text-xs leading-relaxed text-gray-400 print:text-black">Amounts use the site rate effective on each article publication date. Configured admins and deleted articles are excluded from charges. Amounts use the units entered in site pricing. These are calculated bills; payment status is not tracked.</p>
      </>}
    </div>
  </main>;
}
