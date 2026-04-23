'use client';

import { useState, useEffect, useRef } from 'react';

// ── Favicon Upload Zone ──────────────────────────────────────────
function FaviconUpload({ value, onChange, compact = false }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  if (compact) {
    return (
      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-[#18181b] border border-[#3f3f46] hover:border-gray-500 text-gray-300 rounded-lg transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Update Icon
        <input type="file" accept="image/*" className="hidden" onChange={(e) => processFile(e.target.files[0])} />
      </label>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all
        ${dragging ? 'border-gray-400 bg-[#3f3f46]' : 'border-[#3f3f46] bg-[#18181b] hover:border-gray-500 hover:bg-[#27272a]'}`}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => processFile(e.target.files[0])} />
      {value ? (
        <div className="flex flex-col items-center gap-2">
          <img src={value} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-[#3f3f46]" />
          <span className="text-[11px] text-gray-400">Click to change</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[11px] text-center">Drop image or <span className="text-gray-300">browse</span></span>
        </div>
      )}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#18181b] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors text-sm";
const selectCls = "w-full appearance-none bg-[#18181b] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors text-sm cursor-pointer";

// ── Badge ─────────────────────────────────────────────────────────
function Badge({ children, color }) {
  const colors = {
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    green:  'bg-green-500/10  text-green-400  border-green-500/20',
    red:    'bg-red-500/10    text-red-400    border-red-500/20',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${colors[color]}`}>
      {children}
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────
function Spinner({ className = 'w-4 h-4' }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function SitesAdmin() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [syncResult, setSyncResult] = useState(null); // { message, totalNew, results[] }
  const [syncError, setSyncError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [backfillingId, setBackfillingId] = useState(null);

  // Form state
  const [domain, setDomain] = useState('');
  const [type, setType] = useState('rss');
  const [rssUrl, setRssUrl] = useState('');
  const [articleListUrl, setArticleListUrl] = useState('');
  const [articleLinkSelector, setArticleLinkSelector] = useState('a');
  const [authorSelector, setAuthorSelector] = useState('.author');
  const [customFavicon, setCustomFavicon] = useState('');

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/sites');
      const json = await res.json();
      if (json.success) setSites(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSites(); }, []);

  const handleAddSite = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    try {
      const payload = {
        domain, type, customFavicon,
        ...(type === 'rss'
          ? { rssUrl }
          : { scrapeConfig: { articleListUrl, articleLinkSelector, authorSelector } }),
      };
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setDomain(''); setRssUrl(''); setArticleListUrl(''); setCustomFavicon('');
        setSubmitStatus({ type: 'success', message: 'Website added successfully!' });
        fetchSites();
        setTimeout(() => setSubmitStatus(null), 3000);
      } else {
        setSubmitStatus({ type: 'error', message: json.error || 'Failed to add website.' });
      }
    } catch {
      setSubmitStatus({ type: 'error', message: 'An error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this website and all its data?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/sites/${id}`, { method: 'DELETE' });
      fetchSites();
    } catch (e) { console.error(e); }
    finally { setDeletingId(null); }
  };

  const handleBackfill = async (id) => {
    if (!confirm('This will scan up to 150 pages of RSS history and may take a few minutes. Proceed?')) return;
    setBackfillingId(id);
    try {
      const res = await fetch(`/api/sites/${id}/backfill`, { method: 'POST' });
      const json = await res.json();
      alert(json.success ? json.message : 'Backfill failed: ' + json.error);
    } catch { alert('Error triggering backfill.'); }
    finally { setBackfillingId(null); }
  };

  const handleUpdateFavicon = async (siteId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await fetch(`/api/sites/${siteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customFavicon: reader.result }),
        });
        fetchSites();
      } catch (e) { console.error('Failed to update favicon', e); }
    };
    reader.readAsDataURL(file);
  };

  const handleToggle = async (id, currentActive) => {
    try {
      await fetch(`/api/sites/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });
      fetchSites();
    } catch (e) { console.error(e); }
  };

  const handleSync = async () => {
    setIsCollecting(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setSyncResult(json);
      } else {
        setSyncError(json.error || 'Sync failed.');
      }
    } catch {
      setSyncError('Network error. Please try again.');
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#18181b] p-6 md:p-10 font-sans text-gray-200">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Sync Result Modal */}
        {syncResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#27272a] border border-[#3f3f46] rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">Sync Complete</h3>
                <button onClick={() => setSyncResult(null)} className="text-gray-500 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-sm text-gray-300 mb-4">{syncResult.message}</p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {syncResult.results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-[#18181b] rounded-lg border border-[#3f3f46]">
                    <span className="text-sm text-gray-300 truncate">{r.domain}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${
                      r.error ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : r.newArticles > 0 ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-[#3f3f46] text-gray-400'
                    }`}>
                      {r.error ? 'Error' : r.newArticles > 0 ? `+${r.newArticles} new` : 'Up to date'}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setSyncResult(null)}
                className="mt-5 w-full py-2.5 bg-white hover:bg-gray-100 text-[#18181b] text-sm font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Sync Error toast */}
        {syncError && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl shadow-xl">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {syncError}
            <button onClick={() => setSyncError(null)} className="ml-1 opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Page header */}
        <header>
          <h1 className="text-xl font-bold text-white">Site Management</h1>
          <p className="text-sm text-gray-400 mt-1">Add and configure tracked websites.</p>
        </header>

        {/* ── Add Form ── */}
        <div className="bg-[#27272a] border border-[#3f3f46] rounded-2xl p-6">
          <h2 className="text-[15px] font-semibold text-white mb-6">Add New Website</h2>
          <form onSubmit={handleAddSite} className="space-y-5">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Domain (e.g. example.com)">
                <input
                  required type="text" value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="example.com"
                  className={inputCls}
                />
              </Field>
              <Field label="Tracking Type">
                <div className="relative">
                  <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
                    <option value="rss">RSS Feed</option>
                    <option value="scrape">HTML Scraper</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </Field>
            </div>

            <Field label="Custom Favicon (Optional)">
              <FaviconUpload value={customFavicon} onChange={setCustomFavicon} />
            </Field>

            {type === 'rss' ? (
              <Field label="RSS Feed URL">
                <input
                  required type="url" value={rssUrl}
                  onChange={(e) => setRssUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className={inputCls}
                />
              </Field>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Field label="Article List URL">
                  <input required type="url" value={articleListUrl} onChange={(e) => setArticleListUrl(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Link Selector">
                  <input type="text" value={articleLinkSelector} onChange={(e) => setArticleLinkSelector(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Author Selector">
                  <input type="text" value={authorSelector} onChange={(e) => setAuthorSelector(e.target.value)} className={inputCls} />
                </Field>
              </div>
            )}

            <div className="flex items-center gap-4 pt-1">
              <button
                type="submit" disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-gray-100 text-[#18181b] text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center"
              >
                {isSubmitting ? <><Spinner /> Saving...</> : 'Save Website'}
              </button>

              {submitStatus && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border
                  ${submitStatus.type === 'success'
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  {submitStatus.type === 'success'
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  {submitStatus.message}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* ── Sites List ── */}
        <div className="bg-[#27272a] border border-[#3f3f46] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <h2 className="text-[15px] font-semibold text-white">
              Tracked Websites
              <span className="ml-2 text-[11px] font-bold text-gray-500 bg-[#18181b] border border-[#3f3f46] px-2 py-0.5 rounded-full">
                {sites.length}
              </span>
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleSync} disabled={isCollecting}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors
                  border-[#3f3f46] bg-[#18181b] hover:bg-[#3f3f46] text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCollecting ? <><Spinner className="w-3.5 h-3.5" /> Syncing...</> : (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Sync Now</>
                )}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-[#18181b] rounded-xl animate-pulse border border-[#3f3f46]" />
              ))}
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
              <p className="text-sm">No websites added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sites.map(site => (
                <div key={site._id} className="flex items-center gap-4 p-4 bg-[#18181b] rounded-xl border border-[#3f3f46] hover:border-gray-600 transition-colors">

                  {/* Favicon */}
                  <div className="flex-shrink-0">
                    <img
                      src={site.customFavicon || `https://www.google.com/s2/favicons?domain=${site.domain}&sz=64`}
                      alt={site.domain}
                      className="w-9 h-9 rounded-lg object-cover bg-[#27272a] border border-[#3f3f46]"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${site.domain.charAt(0)}&background=3f3f46&color=fff&rounded=true&bold=true`;
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{site.domain}</span>
                      <Badge color={site.type === 'rss' ? 'orange' : 'purple'}>
                        {site.type.toUpperCase()}
                      </Badge>
                      <Badge color={site.active ? 'green' : 'red'}>
                        {site.active ? 'ACTIVE' : 'DISABLED'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {site.type === 'rss' ? site.rssUrl : site.scrapeConfig?.articleListUrl}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    {/* Update Icon */}
                    <FaviconUpload
                      compact
                      onChange={(dataUrl) => handleUpdateFavicon(site._id, { type: 'image/png', _dataUrl: dataUrl }, dataUrl)}
                    />
                    {/* compact mode triggers differently – wire directly */}
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#27272a] border border-[#3f3f46] hover:border-gray-500 text-gray-300 rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Icon
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => handleUpdateFavicon(site._id, e.target.files[0])} />
                    </label>

                    {/* Backfill */}
                    {site.type === 'rss' && (
                      <button
                        onClick={() => handleBackfill(site._id)}
                        disabled={backfillingId === site._id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#27272a] border border-[#3f3f46] hover:border-gray-500 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {backfillingId === site._id ? <><Spinner className="w-3.5 h-3.5" /> Backfilling...</> : (
                          <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Backfill</>
                        )}
                      </button>
                    )}

                    {/* Enable / Disable */}
                    <button
                      onClick={() => handleToggle(site._id, site.active)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors
                        ${site.active
                          ? 'bg-[#27272a] border-[#3f3f46] hover:border-red-500/40 text-gray-300 hover:text-red-400'
                          : 'bg-[#27272a] border-[#3f3f46] hover:border-green-500/40 text-gray-300 hover:text-green-400'}`}
                    >
                      {site.active ? (
                        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>Disable</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Enable</>
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(site._id)}
                      disabled={deletingId === site._id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#27272a] border border-[#3f3f46] hover:border-red-500/40 text-gray-300 hover:text-red-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === site._id ? <><Spinner className="w-3.5 h-3.5" /> Deleting...</> : (
                        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Delete</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
