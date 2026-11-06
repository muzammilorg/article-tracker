import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/session.js';
import dbConnect from '../../../../../lib/mongodb.js';
import Site from '../../../../../models/Site.js';
import Article from '../../../../../models/Article.js';
import { fetchPublishedPage, reconcilePage } from '../../../../../lib/collectors/reconcile.js';

export const maxDuration = 60;

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session?.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const { page = 1, before } = await request.json();
    if (!Number.isInteger(page) || page < 1 || page > 100000 || !before || Number.isNaN(new Date(before).getTime()) || new Date(before) > new Date()) {
      return NextResponse.json({ success: false, error: 'Invalid scan page or cutoff.' }, { status: 400 });
    }
    await dbConnect();
    const { id } = await params;
    const site = await Site.findById(id).lean();
    if (!site) return NextResponse.json({ success: false, error: 'Site not found' }, { status: 404 });
    const source = await fetchPublishedPage(site, page, before);
    const result = await reconcilePage(site, source, {
      find: url => Article.findOne({ url }).lean(),
      save: article => Article.updateOne({ url: article.url }, { $set: article }, { upsert: true, runValidators: true }),
      exists: (url, domain) => Article.exists({ url, domain, deleted: { $ne: true } }),
    });
    const databaseTotal = await Article.countDocuments({ domain: site.domain, deleted: { $ne: true } });
    return NextResponse.json({ success: true, page, total: source.total, totalPages: source.totalPages, databaseTotal, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
