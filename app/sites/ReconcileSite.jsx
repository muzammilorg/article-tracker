'use client';

import { useRef, useState } from 'react';

export default function ReconcileSite({ site }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const stop = useRef(false);
  const start = async () => {
    stop.current = false;
    setRunning(true);
    const summary = { checked: 0, added: 0, restored: 0, total: null, databaseTotal: 0, failures: [], complete: false, message: 'Starting published-post scan…' };
    setResult({ ...summary });
    const seen = new Set();
    const before = new Date().toISOString();
    try {
      let totalPages;
      for (let page = 1; ; page++) {
        if (stop.current) throw new Error('Scan stopped. Saved posts are kept; run again to finish.');
        const response = await fetch(`/api/sites/${site._id}/reconcile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page, before }) });
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.error || 'Tally failed.');
        summary.added += json.added;
        summary.restored += json.restored;
        summary.databaseTotal = json.databaseTotal;
        summary.failures.push(...json.failures);
        for (const id of json.verifiedIds) seen.add(id);
        summary.checked = seen.size;
        if (summary.total !== null && (summary.total !== json.total || totalPages !== json.totalPages)) throw new Error('Published list changed during the scan. Run again to verify the full tally.');
        summary.total = json.total;
        totalPages = json.totalPages;
        summary.message = `Scanning page ${page} / ${Math.max(1, totalPages)}…`;
        setResult({ ...summary, failures: [...summary.failures] });
        if (page >= totalPages) break;
      }
      summary.complete = !summary.failures.length && seen.size === summary.total;
      summary.message = summary.complete ? 'Tally complete: every published post in this scan is saved and verified.' : 'Tally incomplete. Some posts could not be saved or verified; fix the errors and run again.';
    } catch (error) { summary.message = error.message; }
    finally { setResult({ ...summary }); setRunning(false); }
  };
  return <div className="mt-3 border-t border-[#3f3f46] pt-3">
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={running} onClick={start} className="rounded-lg border border-indigo-400/40 px-3 py-2 text-xs font-semibold text-indigo-300 disabled:opacity-50">{running ? 'Checking published posts…' : 'Tally & Repair'}</button>
      {running && <button type="button" onClick={() => { stop.current = true; }} className="text-xs text-gray-400 underline">Stop after this page</button>}
      <p className="text-xs text-gray-500">Scan all public WordPress posts and save missing ones. Keep this page open.</p>
    </div>
    {result && <div role="status" className="mt-3 rounded-lg bg-[#27272a] p-3 text-xs text-gray-300">
      <p className={result.complete ? 'text-green-400' : ''}>{result.message}</p>
      <p className="mt-2">Published: {result.total ?? '—'} · Verified: {result.checked} · Added: {result.added} · Restored: {result.restored} · Database active: {result.databaseTotal}</p>
      <p className="mt-1 text-gray-500">Covers public posts published before this scan started. Database total can include older URLs or posts no longer published; those are not deleted by this scan.</p>
      {result.failures.length > 0 && <details className="mt-2"><summary className="cursor-pointer text-amber-300">{result.failures.length} posts need attention</summary><ul className="mt-2 space-y-2">{result.failures.map((failure, index) => <li key={index}>Post {failure.id}: {failure.error}{failure.url && <span className="block break-all text-gray-500">{failure.url}</span>}</li>)}</ul></details>}
    </div>}
  </div>;
}
