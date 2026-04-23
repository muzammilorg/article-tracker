import dbConnect from '../mongodb.js';
import Site from '../../models/Site.js';
import { collectRss } from './rss.js';
import { collectScrape } from './scraper.js';

export async function runCollectors() {
  console.log('[Collector] Starting run...');
  await dbConnect();

  const sites = await Site.find({ active: true });
  console.log(`[Collector] Found ${sites.length} active sites`);

  const promises = sites.map(async (site) => {
    if (site.type === 'rss') {
      await collectRss(site);
    } else if (site.type === 'scrape') {
      await collectScrape(site);
    }
  });

  await Promise.allSettled(promises);
  console.log('[Collector] Run completed.');
}
