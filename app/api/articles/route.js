import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb.js';
import Article from '../../../models/Article.js';
import Site from '../../../models/Site.js';
import { priceAt } from '../../../lib/pricing.js';
import { getPakistanDateRange } from '../../../lib/date-time.js';

export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // format: YYYY-MM
    const date = searchParams.get('date'); // format: YYYY-MM-DD
    const author = searchParams.get('author');
    const domain = searchParams.get('domain');

    const matchStage = { deleted: { $ne: true } }; // Exclude posts deleted from WordPress
    let dateRange;
    try {
      dateRange = getPakistanDateRange({ date, month });
    } catch (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (dateRange) {
      matchStage.publishedAt = { $gte: dateRange.startDate, $lt: dateRange.endDate };
    }

    if (author) {
      matchStage.author = new RegExp(author, 'i');
    }

    if (domain) {
      matchStage.domain = new RegExp(domain, 'i');
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            domain: '$domain',
            author: '$author', publishedAt: '$publishedAt'
          },
          count: { $sum: 1 },
          latestArticle: { $max: '$publishedAt' }
        }
      },
      {
        $project: {
          _id: 0,
          domain: '$_id.domain',
          author: '$_id.author',
          count: 1,
          latestArticle: 1, publishedAt: '$_id.publishedAt'
        }
      },
      { $sort: { count: -1, domain: 1 } }
    ];

    const data = await Article.aggregate(pipeline);

    const sites = await Site.find({}).lean();
    const siteMap = new Map(sites.map(s => [s.domain.toLowerCase(), s]));
    const groups = new Map();
    for (const item of data) {
      const site = siteMap.get(item.domain.toLowerCase());
      const key = JSON.stringify([item.domain, item.author]);
      const group = groups.get(key) || {domain: item.domain, author: item.author, count: 0, totalPrice: 0, pricedCount: 0, latestArticle: item.latestArticle, customFavicon: site?.customFavicon || null};
      const price = priceAt(site, item.author, item.publishedAt);
      group.count += item.count;
      group.totalPrice += price * item.count;
      if (price > 0) group.pricedCount += item.count;
      if (item.latestArticle > group.latestArticle) group.latestArticle = item.latestArticle;
      groups.set(key, group);
    }
    const enrichedData = [...groups.values()].sort((a,b) => b.count-a.count || a.domain.localeCompare(b.domain));
    return NextResponse.json({ success: true, data: enrichedData });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
