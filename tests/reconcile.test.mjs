import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPublishedPage, reconcilePage } from '../lib/collectors/reconcile.js';

const site = { domain: 'example.com', rssUrl: 'https://example.com/feed/' };
const post = (id, extra = {}) => ({ id, status: 'publish', link: `https://example.com/post-${id}/`, date_gmt: '2025-06-01T14:00:00', title: { rendered: 'A &amp; B' }, _embedded: { author: [{ name: 'Ali &amp; Co' }] }, ...extra });
function repository() {
  const records = new Map();
  return {
    records,
    find: async url => records.get(url),
    save: async article => records.set(article.url, article),
    exists: async (url, domain) => records.get(url)?.domain === domain && !records.get(url)?.deleted,
  };
}
test('repairs missing and deleted posts, preserves publication time, and is repeatable', async () => {
  const repo = repository();
  repo.records.set(post(2).link, { ...post(2), author: 'Old', deleted: true });
  const source = { posts: [post(1), post(2)] };
  const first = await reconcilePage(site, source, repo);
  assert.equal(first.added, 1);
  assert.equal(first.restored, 1);
  assert.deepEqual(first.verifiedIds, [1, 2]);
  assert.equal(repo.records.get(post(1).link).publishedAt.toISOString(), '2025-06-01T14:00:00.000Z');
  assert.equal(repo.records.get(post(1).link).author, 'Ali & Co');
  assert.equal(repo.records.get(post(1).link).title, 'A & B');
  const second = await reconcilePage(site, source, repo);
  assert.equal(second.added, 0);
  assert.equal(second.restored, 0);
  assert.equal(repo.records.size, 2);
});
test('isolates bad records and reports write/verification failures without false success', async () => {
  const repo = repository();
  const result = await reconcilePage(site, { posts: [post(1, {date_gmt: null}), post(2, {_embedded: {}}), post(3)] }, repo);
  assert.equal(result.failures.length, 2);
  assert.deepEqual(result.verifiedIds, [3]);
  const failed = await reconcilePage(site, { posts: [post(4)] }, {...repo, save: async () => { throw new Error('Database unavailable'); }});
  assert.equal(failed.failures[0].error, 'Database unavailable');
  assert.equal(failed.added, 0);
  const unverified = await reconcilePage(site, { posts: [post(5)] }, {...repo, exists: async () => false});
  assert.equal(unverified.verifiedIds.length, 0);
});
test('uses fixed cutoff, ID order and WordPress totals with alternative REST route', async () => {
  const calls = [];
  const result = await fetchPublishedPage(site, 1, '2026-01-01T00:00:00Z', async url => {
    calls.push(url);
    if (url.pathname.startsWith('/wp-json')) return new Response('', { status: 404 });
    return Response.json([post(1)], {headers: {'x-wp-total': '1', 'x-wp-totalpages': '1'}});
  });
  assert.equal(result.total, 1);
  assert.equal(calls.at(-1).searchParams.get('orderby'), 'id');
  assert.equal(calls.at(-1).searchParams.get('before'), '2026-01-01T00:00:00Z');
  assert.equal(calls.at(-1).searchParams.get('rest_route'), '/wp/v2/posts');
});
test('refuses incomplete pages, missing totals, and unavailable sources', async () => {
  await assert.rejects(fetchPublishedPage(site, 1, '2026-01-01', async () => Response.json([post(1)], {headers: {'x-wp-total': '2', 'x-wp-totalpages': '1'}})), /incomplete/);
  await assert.rejects(fetchPublishedPage(site, 1, '2026-01-01', async () => Response.json([])), /verifiable/);
  await assert.rejects(fetchPublishedPage(site, 1, '2026-01-01', async () => new Response('', {status: 503})), /503/);
  const empty = await fetchPublishedPage(site, 1, '2026-01-01', async () => Response.json([], {headers: {'x-wp-total': '0', 'x-wp-totalpages': '0'}}));
  assert.equal(empty.total, 0);
});
