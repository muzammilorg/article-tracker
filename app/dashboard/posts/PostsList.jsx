'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPakistanDate } from '../../../lib/date-time.js';

export default function PostsList({ filters }) {
  const { domain, author, date, month } = filters;
  const [articles, setArticles] = useState([]);
  const [externalLinks, setExternalLinks] = useState({});
  const [linkErrors, setLinkErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    const loadArticles = async () => {
      setIsLoading(true);
      setError('');
      setArticles([]);
      setExternalLinks({});
      setLinkErrors({});
      const params = new URLSearchParams({ domain, author });
      if (date) params.set('date', date);
      else if (month) params.set('month', month);

      try {
        const response = await fetch(`/api/articles/details?${params.toString()}`);
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Could not load posts.');
        }
        if (!isCurrent) return;
        setArticles(result.data);
        setIsLoading(false);

        let nextIndex = 0;
        const loadExternalLinks = async () => {
          while (isCurrent && nextIndex < result.data.length) {
            const article = result.data[nextIndex];
            nextIndex += 1;

            try {
              const linksResponse = await fetch(`/api/articles/${encodeURIComponent(article.id)}/links`);
              const linksResult = await linksResponse.json();
              if (!linksResponse.ok || !linksResult.success) {
                throw new Error(linksResult.error || 'Could not load outgoing links.');
              }
              if (isCurrent) {
                setExternalLinks(current => ({ ...current, [article.id]: linksResult.data }));
              }
            } catch (linkError) {
              if (isCurrent) {
                setLinkErrors(current => ({ ...current, [article.id]: linkError.message }));
              }
            }
          }
        };

        const workerCount = Math.min(4, result.data.length);
        await Promise.all(Array.from({ length: workerCount }, () => loadExternalLinks()));
      } catch (requestError) {
        if (isCurrent) setError(requestError.message);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadArticles();
    return () => {
      isCurrent = false;
    };
  }, [domain, author, date, month]);

  const period = date
    ? formatPakistanDate(`${date}T00:00:00+05:00`, { month: 'short', day: 'numeric', year: 'numeric' })
    : month
      ? formatPakistanDate(`${month}-01T00:00:00+05:00`, { month: 'short', year: 'numeric' })
      : 'all time';

  return (
    <main className="min-h-screen bg-[#18181b] p-6 md:p-10 font-sans text-gray-200">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/dashboard" className="inline-flex text-sm text-gray-400 hover:text-white transition-colors">
          &larr; Back to dashboard
        </Link>

        <header>
          <h1 className="text-2xl font-bold text-white">Published Posts</h1>
          <p className="mt-2 text-sm text-gray-400">
            {author || 'Unknown author'} on {domain || 'unknown site'} &middot; {period}
          </p>
        </header>

        {isLoading && <p className="text-sm text-gray-500">Loading posts...</p>}
        {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</p>}
        {!isLoading && !error && articles.length === 0 && (
          <div className="rounded-xl border border-[#3f3f46] bg-[#27272a] p-6 text-sm text-gray-400">
            No published posts found for this author, site, and time period.
          </div>
        )}

        {!isLoading && !error && articles.length > 0 && (
          <>
            <p className="text-sm text-gray-500">{articles.length} posts</p>
            <div className="space-y-3">
              {articles.map(article => (
                <article key={article.id} className="rounded-xl border border-[#3f3f46] bg-[#27272a] p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="font-semibold">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-blue-300 underline decoration-transparent hover:decoration-current underline-offset-2 transition-colors"
                        >
                          {article.title}
                        </a>
                      </h2>
                      <time className="mt-1 block text-xs text-gray-500" dateTime={article.publishedAt}>
                        {formatPakistanDate(article.publishedAt, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          timeZoneName: 'short',
                        })}
                      </time>
                    </div>
                  </div>
                  {externalLinks[article.id]?.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#3f3f46] pt-3">
                      {externalLinks[article.id].map((link, index) => (
                        <li key={`${link.url}-${index}`} className="text-sm">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 break-words"
                          >
                            {link.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {linkErrors[article.id] && (
                    <p role="status" className="mt-3 text-xs text-red-400">
                      {linkErrors[article.id]}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
