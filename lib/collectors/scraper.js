import axios from 'axios';
import * as cheerio from 'cheerio';
import Article from '../../models/Article.js';

export async function collectScrape(site) {
  if (!site.scrapeConfig || !site.scrapeConfig.articleListUrl) return;

  try {
    const { data } = await axios.get(site.scrapeConfig.articleListUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(data);
    const articles = [];

    // This is a basic example assuming the site has an article list where each item has a link and an author
    // A real implementation might need to visit each article page to find the author if not on the list page
    const linkSelector = site.scrapeConfig.articleLinkSelector || 'a';
    const authorSelector = site.scrapeConfig.authorSelector || '.author';
    
    // Attempting to scrape from the list page
    $(linkSelector).each((i, el) => {
      let url = $(el).attr('href');
      let title = $(el).text().trim();
      
      // Some simple resolution for relative URLs
      if (url && url.startsWith('/')) {
         const urlObj = new URL(site.scrapeConfig.articleListUrl);
         url = `${urlObj.origin}${url}`;
      }
      
      // We look for author inside the parent block, or similar. 
      // Scrapers usually need specific logic per site, but we use the provided selector.
      let author = $(el).parent().find(authorSelector).text().trim() || 'Unknown';
      
      if (url && title) {
         articles.push({
           domain: site.domain,
           author: author,
           title: title,
           url: url,
           publishedAt: new Date() // Scrapers often struggle with dates, fallback to now
         });
      }
    });

    let newCount = 0;
    
    for (const article of articles) {
      const result = await Article.updateOne(
        { url: article.url },
        { $setOnInsert: article },
        { upsert: true }
      );
      if (result.upsertedCount > 0) newCount++;
    }

    console.log(`[Scraper] ${site.domain}: Found ${articles.length} articles, ${newCount} new`);
  } catch (error) {
    console.error(`[Scraper Error] ${site.domain}:`, error.message);
  }
}
