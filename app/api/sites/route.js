import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb.js';
import Site from '../../../models/Site.js';

export async function GET() {
  try {
    await dbConnect();
    const sites = await Site.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: sites });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const site = await Site.create(body);
    return NextResponse.json({ success: true, data: site }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
