import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/session.js';
import dbConnect from '../../../lib/mongodb.js';
import Site from '../../../models/Site.js';
import { collectRss } from '../../../lib/collectors/rss.js';
import { collectScrape } from '../../../lib/collectors/scraper.js';

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
        let collected;
        if (site.type === 'rss') {
          collected = await collectRss(site);
        } else if (site.type === 'scrape') {
          collected = await collectScrape(site);
        }
        const newArticles = collected?.newArticles || 0;

        return { domain: site.domain, newArticles, type: site.type };
      })
    );

    const summary = results.map((r, index) => {
      if (r.status === 'fulfilled') return r.value;
      return { domain: sites[index].domain, newArticles: 0, error: r.reason?.message || 'Failed' };
    });

    const totalNew = summary.reduce((sum, s) => sum + (s.newArticles || 0), 0);
    const failedSites = summary.filter(item => item.error).length;

    return NextResponse.json({
      success: true,
      message: `Sync ${failedSites ? 'finished with ' + failedSites + ' site errors' : 'complete'}. ${totalNew} new article${totalNew !== 1 ? 's' : ''} found across ${sites.length} site${sites.length !== 1 ? 's' : ''}.`,
      totalNew,
      results: summary,
    });
  } catch (error) {
    console.error('[Sync Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
