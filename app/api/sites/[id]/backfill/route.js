import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongodb.js';
import Site from '../../../../../models/Site.js';
import { backfillRss } from '../../../../../lib/collectors/rss.js';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const site = await Site.findById(id);
    if (!site) {
      return NextResponse.json({ success: false, error: 'Site not found' }, { status: 404 });
    }

    if (site.type !== 'rss') {
      return NextResponse.json({ success: false, error: 'Backfill is currently only supported for RSS feeds.' }, { status: 400 });
    }

    // Start backfill process
    const result = await backfillRss(site);
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Backfill complete! Scraped ${result.pagesScanned} pages and found ${result.newArticles} new articles.` 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
