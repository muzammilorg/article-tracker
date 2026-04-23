import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb.js';
import Article from '../../../models/Article.js';

import Site from '../../../models/Site.js';

export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // format: YYYY-MM
    const author = searchParams.get('author');
    const domain = searchParams.get('domain');

    const matchStage = {};

    if (month) {
      const startDate = new Date(`${month}-01T00:00:00Z`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      matchStage.publishedAt = {
        $gte: startDate,
        $lt: endDate
      };
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
            author: '$author'
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
          latestArticle: 1
        }
      },
      { $sort: { count: -1, domain: 1 } }
    ];

    const data = await Article.aggregate(pipeline);

    // Fetch site favicons
    const siteDomains = [...new Set(data.map(d => d.domain))];
    const sites = await Site.find({ domain: { $in: siteDomains } }, 'domain customFavicon');
    const faviconMap = {};
    sites.forEach(s => {
      if (s.customFavicon) {
        faviconMap[s.domain] = s.customFavicon;
      }
    });

    const enrichedData = data.map(item => ({
      ...item,
      customFavicon: faviconMap[item.domain] || null
    }));

    return NextResponse.json({ success: true, data: enrichedData });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
