import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { backfillRss } from '../lib/collectors/rss.js';
import Article from '../models/Article.js';

const feed = '<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title><link>https://example.com</link><description>Test</description><item><title>Post</title><link>https://example.com/post</link><pubDate>Mon, 01 Jun 2026 12:00:00 GMT</pubDate></item></channel></rss>';
async function withFeed(secondStatus, run) {
  const server = createServer((req, res) => {
    const page = new URL(req.url, 'http://localhost').searchParams.get('paged');
    res.statusCode = page === '1' ? 200 : secondStatus;
    res.end(res.statusCode === 200 ? feed : 'Failed');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const original = Article.bulkWrite;
  Article.bulkWrite = async () => ({ upsertedCount: 1 });
  try { await run({ domain: 'example.com', rssUrl: `http://127.0.0.1:${server.address().port}/feed/` }); }
  finally { Article.bulkWrite = original; await new Promise(resolve => server.close(resolve)); }
}
test('RSS backfill does not claim completion after a transient error', async () => {
  await withFeed(500, async site => {
    const result = await backfillRss(site);
    assert.equal(result.success, false);
    assert.equal(result.newArticles, 1);
    assert.match(result.error, /500/);
  });
});
test('RSS backfill detects ignored pagination instead of scanning repeated pages', async () => {
  await withFeed(200, async site => {
    const result = await backfillRss(site);
    assert.equal(result.success, false);
    assert.match(result.error, /repeated/);
  });
});
test('RSS backfill accepts a not-found response only after the first page', async () => {
  await withFeed(404, async site => {
    const result = await backfillRss(site);
    assert.equal(result.success, true);
    assert.equal(result.pagesScanned, 1);
  });
});
