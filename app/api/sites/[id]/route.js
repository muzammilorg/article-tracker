import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb.js';
import Site from '../../../../models/Site.js';

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    
    const site = await Site.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    
    if (!site) {
      return NextResponse.json({ success: false, error: 'Site not found' }, { status: 404 });
    }
    
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
