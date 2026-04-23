import Parser from 'rss-parser';
import Article from '../../models/Article.js';

const parser = new Parser({
  customFields: {
    item: ['dc:creator', 'creator', 'author'],
  },
});

export async function collectRss(site) {
  if (!site.rssUrl) return;

  try {
    const feed = await parser.parseURL(site.rssUrl);
    
    const articles = feed.items.map(item => {
      const author = item['dc:creator'] || item.creator || item.author || 'Unknown';
      const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
      
      return {
        domain: site.domain,
        author: author,
        title: item.title,
        url: item.link,
        publishedAt,
      };
    });

    let newCount = 0;
    
    // Upsert articles
    for (const article of articles) {
      const result = await Article.updateOne(
        { url: article.url },
        { $setOnInsert: article },
        { upsert: true }
      );
      if (result.upsertedCount > 0) newCount++;
    }
    
    console.log(`[RSS] ${site.domain}: Found ${articles.length} articles, ${newCount} new`);
  } catch (error) {
    console.error(`[RSS Error] ${site.domain}:`, error.message);
  }
}

export async function backfillRss(site) {
  if (!site.rssUrl) return { success: false, error: 'No RSS URL' };

  let totalNew = 0;
  let page = 1;
  const maxPages = 150; // scrape up to 150 pages (typically 10-20 articles per page, so ~1500-3000 articles)

  try {
    while (page <= maxPages) {
      const separator = site.rssUrl.includes('?') ? '&' : '?';
      const pagedUrl = `${site.rssUrl}${separator}paged=${page}`;
      
      console.log(`[Backfill] Fetching ${pagedUrl}`);
      let feed;
      try {
        feed = await parser.parseURL(pagedUrl);
      } catch (err) {
        console.log(`[Backfill] Stopped at page ${page} due to error/404: ${err.message}`);
        break; // End of pagination usually throws 404
      }

      if (!feed.items || feed.items.length === 0) {
        console.log(`[Backfill] No items found on page ${page}. Stopping.`);
        break;
      }

      const articles = feed.items.map(item => {
        const author = item['dc:creator'] || item.creator || item.author || 'Unknown';
        const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
        return {
          domain: site.domain,
          author: author,
          title: item.title,
          url: item.link,
          publishedAt,
        };
      });

      const bulkOps = articles.map(article => ({
        updateOne: {
          filter: { url: article.url },
          update: { $setOnInsert: article },
          upsert: true
        }
      }));

      let newCount = 0;
      if (bulkOps.length > 0) {
        const result = await Article.bulkWrite(bulkOps, { ordered: false });
        newCount = result.upsertedCount || 0;
      }
      
      totalNew += newCount;
      console.log(`[Backfill] Page ${page}: Found ${articles.length} articles, ${newCount} new`);
      
      page++;
      
      // Delay to avoid hammering the server and getting blocked
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return { success: true, newArticles: totalNew, pagesScanned: page - 1 };
  } catch (error) {
    console.error(`[Backfill Error] ${site.domain}:`, error.message);
    return { success: false, error: error.message };
  }
}

