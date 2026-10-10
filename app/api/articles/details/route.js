import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb.js';
import Article from '../../../../models/Article.js';
import { getPakistanDateRange } from '../../../../lib/date-time.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain')?.trim();
    const author = searchParams.get('author')?.trim();
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    if (!domain || !author || (date && month)) {
      return NextResponse.json(
        { success: false, error: 'A site and author are required; select either a date or month.' },
        { status: 400 }
      );
    }

    const match = {
      domain,
      author,
      deleted: { $ne: true },
    };

    let dateRange;
    try {
      dateRange = getPakistanDateRange({ date, month });
    } catch (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (dateRange) {
      match.publishedAt = { $gte: dateRange.startDate, $lt: dateRange.endDate };
    }

    await dbConnect();
    const articles = await Article.find(match, 'domain author title url publishedAt')
      .sort({ publishedAt: -1, _id: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: articles.map(article => ({
        id: article._id.toString(),
        title: article.title,
        url: article.url,
        publishedAt: article.publishedAt,
      })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
