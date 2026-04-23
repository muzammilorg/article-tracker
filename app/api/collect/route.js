import { NextResponse } from 'next/server';
import { runCollectors } from '../../../lib/collectors/runner.js';

export async function POST(request) {
  try {
    // In a real app, you should add authorization here (e.g., check a secret cron token)
    // to prevent anyone from triggering the collector.
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Trigger run asynchronously or await it depending on platform timeouts
    // For Vercel free tier, max execution is 10s-50s, so you might want to return immediately
    // and let it run in background if possible, or keep it simple and await it.
    await runCollectors();
    
    return NextResponse.json({ success: true, message: 'Collection finished' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
