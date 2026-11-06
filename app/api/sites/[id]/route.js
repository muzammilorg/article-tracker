import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb.js';
import Site from '../../../../models/Site.js';
import { addPriceChange } from '../../../../lib/pricing.js';

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    
    const site = await Site.findById(id);
    if (!site) return NextResponse.json({success: false, error: 'Site not found'}, {status: 404});
    for (const key of ['domain','type','rssUrl','scrapeConfig','customFavicon','admins','active']) {
      if (body[key] !== undefined) site.set(key, body[key]);
    }
    if (body.basePrice !== undefined || body.primeStarPrice !== undefined) Object.assign(site, addPriceChange(site, body));
    await site.save();
    return NextResponse.json({ success: true, data: site });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const deletedSite = await Site.deleteOne({ _id: id });
    if (!deletedSite) {
      return NextResponse.json({ success: false, error: 'Site not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
