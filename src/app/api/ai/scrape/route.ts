import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { runLeadScraper } from '@/lib/scraper';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { prompt, query, location, category, target_url, limit, website_filter } = body;

    // Handle string prompt or structured params
    let searchQuery = query || '';
    let searchLocation = location || '';

    if (!searchQuery && prompt) {
      // Simple prompt parser e.g. "Scrape web design agencies in Dubai"
      searchQuery = prompt;
    }

    const result = await runLeadScraper({
      query: searchQuery,
      location: searchLocation,
      category: category || '',
      target_url: target_url || '',
      limit: limit || 5,
      website_filter: website_filter || 'all',
      source: 'AnweoAI Scraper',
      added_by: session.id
    });

    return NextResponse.json({ 
      success: true, 
      leadsCount: result.createdCount,
      totalFound: result.totalFound,
      duplicateCount: result.duplicateCount,
      leads: result.leads,
      message: result.message 
    });

  } catch (error: any) {
    console.error('[Scrape API Error]:', error);
    return NextResponse.json({ error: error.message || 'Scraping failed' }, { status: 500 });
  }
}
