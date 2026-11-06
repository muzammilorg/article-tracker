import * as cheerio from 'cheerio';

const text = value => cheerio.load(String(value || '')).text().trim();

export async function fetchPublishedPage(site, page, before, fetcher = fetch) {
  const base = new URL(site.rssUrl || site.scrapeConfig?.articleListUrl || `https://${site.domain}`);
  const cutoff = new Date(before);
  if (!Number.isInteger(page) || page < 1 || Number.isNaN(cutoff.getTime())) throw new Error('Invalid scan page or cutoff.');
  // A fixed cutoff and ID ordering prevent new publications from shifting earlier pages.
  const params = new URLSearchParams({ per_page: '100', page: String(page), status: 'publish', orderby: 'id', order: 'asc', before: cutoff.toISOString().replace('.000Z', 'Z'), _embed: 'author', _fields: 'id,status,link,date_gmt,title,_links,_embedded' });
  let lastError;
  for (const path of ['/wp-json/wp/v2/posts', '/?rest_route=/wp/v2/posts']) {
    const url = new URL(path, base.origin);
    for (const [key, value] of params) url.searchParams.set(key, value);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetcher(url, { signal: AbortSignal.timeout(7000), cache: 'no-store', headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`WordPress API returned HTTP ${response.status}.`);
        const posts = await response.json();
        const totalHeader = response.headers.get('x-wp-total');
        const pagesHeader = response.headers.get('x-wp-totalpages');
        const total = Number(totalHeader);
        const totalPages = Number(pagesHeader);
        if (!Array.isArray(posts) || totalHeader === null || pagesHeader === null || !Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(totalPages) || totalPages < 0) throw new Error('WordPress did not expose a verifiable published-post total.');
        if (totalPages !== Math.ceil(total / 100)) throw new Error('WordPress returned inconsistent pagination totals.');
        if (posts.length !== (total === 0 ? 0 : Math.min(100, total - (page - 1) * 100))) throw new Error('WordPress returned an incomplete or inconsistent page.');
        return { posts, total, totalPages };
      } catch (error) { lastError = error; }
    }
  }
  throw new Error(`Unable to tally this site: ${lastError.message} Public WordPress REST API access is required.`);
}

export async function reconcilePage(site, source, repository) {
  const failures = [];
  const verifiedIds = [];
  let added = 0;
  let restored = 0;
  const processPost = async post => {
    try {
      if (!Number.isSafeInteger(post.id) || post.status !== 'publish') throw new Error('Invalid published post.');
      const url = new URL(post.link);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid post URL.');
      // Never substitute today's date: that would give historical posts the wrong rate.
      const publishedAt = post.date_gmt && !post.date_gmt.startsWith('0000') ? new Date(post.date_gmt.replace(/Z$/i, '') + 'Z') : null;
      if (!publishedAt || Number.isNaN(publishedAt.getTime())) throw new Error('Missing valid publication date.');
      const existing = await repository.find(post.link);
      const author = text(post._embedded?.author?.[0]?.name);
      if (!author && (!existing?.author || existing.author === 'Unknown')) throw new Error('Author unavailable; enable public author access and retry.');
      const article = { domain: site.domain, url: post.link, title: text(post.title?.rendered) || '(Untitled)', author: author || existing.author, publishedAt, deleted: false };
      await repository.save(article);
      if (!await repository.exists(post.link, site.domain)) throw new Error('Database verification failed.');
      if (!existing) added++;
      else if (existing.deleted) restored++;
      verifiedIds.push(post.id);
    } catch (error) { failures.push({ id: post.id, url: post.link, error: error.message }); }
  };
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(5, source.posts.length) }, async () => {
    while (next < source.posts.length) await processPost(source.posts[next++]);
  }));
  verifiedIds.sort((a, b) => a - b);
  return { added, restored, verifiedIds, failures };
}
