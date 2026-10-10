import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongodb.js';
import Article from '../../../../../models/Article.js';

function isPublicIpv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second, third] = parts;
  return !(
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
}

function createPinnedLookup(address) {
  return (_hostname, options, callback) => {
    if (options?.all) {
      callback(null, [{ address, family: 4 }]);
    } else {
      callback(null, address, 4);
    }
  };
}

function getArticleContent($) {
  const selectors = ['#mvp-content-body', '.entry-content', '.post-content', '.article-content', 'article'];
  for (const selector of selectors) {
    const content = $(selector).first();
    if (content.length) return content;
  }

  return null;
}

function trimAtYouMayLike($, content) {
  const contentElement = content.get(0);
  const marker = content.find('*').filter((_index, element) => (
    $(element).children().length === 0 &&
    $(element).text().replace(/\s+/g, ' ').trim().toLowerCase() === 'you may like'
  )).first().get(0);

  if (!marker) return;

  let current = marker;
  while (current && current !== contentElement) {
    const parent = current.parent;
    if (!parent) return;

    const index = parent.children.indexOf(current);
    if (index !== -1) parent.children.splice(index);
    if (parent === contentElement) return;
    current = parent;
  }
}

export async function GET(_request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const article = await Article.findById(id, 'domain url').lean();
    if (!article) {
      return NextResponse.json({ success: false, error: 'Post not found.' }, { status: 404 });
    }

    const postUrl = new URL(article.url);
    const expectedHost = article.domain.toLowerCase().replace(/^www\./, '');
    const postHost = postUrl.hostname.toLowerCase().replace(/^www\./, '');
    if (
      !['http:', 'https:'].includes(postUrl.protocol) ||
      postUrl.username ||
      postUrl.password ||
      (postHost !== expectedHost && !postHost.endsWith(`.${expectedHost}`)) ||
      isIP(postUrl.hostname)
    ) {
      return NextResponse.json(
        { success: false, error: 'The published post URL is not a valid site URL.' },
        { status: 400 }
      );
    }

    const addresses = await lookup(postUrl.hostname, { family: 4, all: true, verbatim: true });
    const publicAddress = addresses.find(record => isPublicIpv4(record.address));
    if (!publicAddress) {
      return NextResponse.json(
        { success: false, error: 'The published post host does not resolve to a public IPv4 address.' },
        { status: 400 }
      );
    }

    const response = await axios.get(article.url, {
      timeout: 8000,
      maxRedirects: 0,
      maxContentLength: 2 * 1024 * 1024,
      responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ArticleTracker/1.0)' },
      httpAgent: new http.Agent({
        lookup: createPinnedLookup(publicAddress.address),
      }),
      httpsAgent: new https.Agent({
        lookup: createPinnedLookup(publicAddress.address),
      }),
    });

    const $ = cheerio.load(response.data);
    const content = getArticleContent($);
    if (!content) {
      return NextResponse.json({ success: true, data: [] });
    }

    trimAtYouMayLike($, content);
    const seen = new Set();
    const links = [];

    content.find('a[href]').each((_index, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        const target = new URL(href, article.url);
        const targetHost = target.hostname.toLowerCase().replace(/^www\./, '');
        if (
          !['http:', 'https:'].includes(target.protocol) ||
          targetHost === expectedHost ||
          targetHost.endsWith(`.${expectedHost}`)
        ) {
          return;
        }

        const text = $(element).text().trim() || $(element).attr('aria-label')?.trim() || target.href;
        const key = `${text}\n${target.href}`;
        if (!seen.has(key)) {
          seen.add(key);
          links.push({ text, url: target.href });
        }
      } catch {
        // Ignore malformed href attributes in the published page.
      }
    });

    return NextResponse.json({ success: true, data: links });
  } catch (error) {
    console.error('Failed to load external post links:', error.message);
    return NextResponse.json(
      { success: false, error: 'Could not load outgoing links from this post.' },
      { status: 502 }
    );
  }
}
