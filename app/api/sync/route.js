import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/session.js';
import dbConnect from '../../../lib/mongodb.js';
import Site from '../../../models/Site.js';
import { collectRss } from '../../../lib/collectors/rss.js';
import { collectScrape } from '../../../lib/collectors/scraper.js';
import Article from '../../../models/Article.js';

export async function POST(request) {
  // Auth: must be logged in as admin
  const session = await getSession();
  if (!session?.isLoggedIn) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    const sites = await Site.find({ active: true });
    if (sites.length === 0) {
      return NextResponse.json({ success: true, message: 'No active sites to sync.', results: [] });
    }

    // Run each site and track counts
    const results = await Promise.allSettled(
      sites.map(async (site) => {
        // Count articles before sync
        const before = await Article.countDocuments({ domain: site.domain, deleted: { $ne: true } });

        if (site.type === 'rss') {
          await collectRss(site);
        } else if (site.type === 'scrape') {
          await collectScrape(site);
        }

        // Count after sync
        const after = await Article.countDocuments({ domain: site.domain, deleted: { $ne: true } });
        const newArticles = after - before;

        return { domain: site.domain, newArticles, type: site.type };
      })
    );

    const summary = results.map((r) => {
      if (r.status === 'fulfilled') return r.value;
      return { domain: '?', newArticles: 0, error: r.reason?.message || 'Failed' };
    });

    const totalNew = summary.reduce((sum, s) => sum + (s.newArticles || 0), 0);

    return NextResponse.json({
      success: true,
      message: `Sync complete. ${totalNew} new article${totalNew !== 1 ? 's' : ''} found across ${sites.length} site${sites.length !== 1 ? 's' : ''}.`,
      totalNew,
      results: summary,
    });
  } catch (error) {
    console.error('[Sync Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
