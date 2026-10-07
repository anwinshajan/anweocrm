// ============================================================
// ANWEO CRM — Lead Scraper Engine
// Multi-source lead discovery (Web Search, Google Places, URL Extractor)
// ============================================================

import * as cheerio from 'cheerio';
import { getLeads, createLead } from '@/lib/data/leads';
import { addActivity, getSettings } from '@/lib/data';
import type { Lead } from '@/lib/types';

export interface ScrapeOptions {
  query?: string;
  location?: string;
  category?: string;
  target_url?: string;
  limit?: number;
  source?: string;
  added_by?: string;
  website_filter?: 'all' | 'without_website' | 'with_website';
}

export interface ScrapedBusiness {
  business_name: string;
  phone: string;
  whatsapp_number?: string;
  category?: string;
  address?: string;
  city?: string;
  website?: string;
  google_maps_url?: string;
  rating?: string;
  review_count?: string;
  instagram?: string;
  facebook?: string;
  email?: string;
  notes?: string;
}

export interface ScrapeResult {
  success: boolean;
  totalFound: number;
  createdCount: number;
  duplicateCount: number;
  leads: Lead[];
  message: string;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

/**
 * Fetch HTML search snippet contents using DuckDuckGo HTML / Web fetch
 */
async function fetchWebSearchSnippet(searchTerm: string): Promise<string> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchTerm)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });
    if (!res.ok) return '';
    const html = await res.text();
    const $ = cheerio.load(html);
    const textBlocks: string[] = [];

    $('.result').each((i, el) => {
      const title = $(el).find('.result__title').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      const link = $(el).find('.result__url').text().trim() || $(el).find('a.result__url').attr('href') || '';
      if (title) {
        textBlocks.push(`Title: ${title}\nSnippet: ${snippet}\nURL: ${link}`);
      }
    });

    return textBlocks.join('\n---\n');
  } catch (error) {
    console.error('[Scraper] DuckDuckGo fetch error:', error);
    return '';
  }
}

/**
 * Fetch text content directly from a target URL page
 */
async function fetchPageContent(targetUrl: string): Promise<{ title: string; content: string; url: string }> {
  try {
    const fullUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return { title: '', content: '', url: fullUrl };
    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove script/style tags
    $('script, style, noscript, svg, nav, footer').remove();

    const title = $('title').text().trim() || $('h1').first().text().trim();
    const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 4000);

    return { title, content: bodyText, url: fullUrl };
  } catch (err) {
    console.error('[Scraper] Page fetch error:', err);
    return { title: '', content: '', url: targetUrl };
  }
}

/**
 * Google Places API search fallback if GOOGLE_PLACES_API_KEY is available
 */
async function fetchGooglePlaces(query: string, apiKey: string, limit: number): Promise<ScrapedBusiness[]> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.slice(0, limit).map((place: any) => ({
      business_name: place.name || '',
      phone: place.formatted_phone_number || '',
      address: place.formatted_address || '',
      city: extractCityFromAddress(place.formatted_address),
      rating: place.rating ? String(place.rating) : '',
      review_count: place.user_ratings_total ? String(place.user_ratings_total) : '',
      google_maps_url: place.place_id ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}` : '',
      category: place.types ? place.types[0]?.replace(/_/g, ' ') : ''
    }));
  } catch (err) {
    console.error('[Scraper] Google Places API error:', err);
    return [];
  }
}

function extractCityFromAddress(address?: string): string {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    // Usually city is the second or third last element
    return parts[parts.length - 2] || parts[0];
  }
  return parts[0] || '';
}

/**
 * Use AI to parse raw scraped search text into structured business leads
 */
async function parseWithAI(
  rawText: string, 
  searchContext: string, 
  limit: number,
  websiteFilter: 'all' | 'without_website' | 'with_website' = 'all'
): Promise<ScrapedBusiness[]> {
  const settings = await getSettings();
  const openAiKey = settings['OPENAI_API_KEY'] || process.env.OPENAI_API_KEY;
  const baseUrl = settings['OPENAI_BASE_URL'] || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = settings['AI_MODEL'] || process.env.AI_MODEL || 'gpt-4o-mini';

  const prompt = `You are a lead generation scraping assistant for Anweo CRM.
Target Search Query Context: "${searchContext}"

Below is raw text scraped from search engines / web listings:
=== RAW SCRAPED DATA ===
${rawText.slice(0, 6000)}
=== END RAW DATA ===

Extract up to ${limit} distinct real businesses with as much information as possible (Name, Phone number, City, Category, Address, Website, Email, Instagram, Facebook).
If a phone number is missing, try to infer or format standard regional contact numbers if available in snippet, or leave empty if unknown.

Return ONLY a valid JSON array of objects with this schema:
[
  {
    "business_name": "string (Required)",
    "phone": "string (Phone number with country code if available)",
    "city": "string",
    "category": "string",
    "address": "string",
    "website": "string",
    "email": "string",
    "instagram": "string",
    "facebook": "string",
    "google_maps_url": "string"
  }
]`;

  try {
    let resultText = '';

    if (openAiKey && openAiKey.trim().length > 0) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        })
      });
      if (res.ok) {
        const data = await res.json();
        resultText = data.choices?.[0]?.message?.content || '';
      }
    }

    // Fallback or Gemini
    if (!resultText) {
      const { GoogleGenAI } = await import('@google/genai');
      const geminiKey = process.env.GEMINI_API_KEY || settings['GEMINI_API_KEY'];
      if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const res = await ai.models.generateContent({
          model: model.includes('gemini') ? model : 'gemini-2.5-flash',
          contents: prompt
        });
        resultText = res.text || '';
      }
    }

    const match = resultText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('[Scraper] AI parsing error:', err);
  }

  return [];
}

/**
 * Main execution method to perform lead scraping and persistence into CRM
 */
export async function runLeadScraper(options: ScrapeOptions): Promise<ScrapeResult> {
  const {
    query = '',
    location = '',
    category = '',
    target_url = '',
    limit = 5,
    source = 'Web Scraper',
    added_by = 'SYSTEM_SCRAPER',
    website_filter = 'all'
  } = options;

  const targetLimit = Math.min(Math.max(limit, 1), 20);
  let scrapedResults: ScrapedBusiness[] = [];

  const settings = await getSettings();
  const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || settings['GOOGLE_PLACES_API_KEY'];

  const searchKeyword = [category, query, location, website_filter === 'without_website' ? 'no website' : ''].filter(Boolean).join(' ');

  // Strategy 1: Target URL provided
  if (target_url && target_url.trim().length > 0) {
    console.log(`[Scraper] Extracting leads from URL: ${target_url}`);
    const pageData = await fetchPageContent(target_url);
    if (pageData.content) {
      const extracted = await parseWithAI(pageData.content, `Direct URL: ${target_url}`, targetLimit, website_filter);
      scrapedResults.push(...extracted);
    }
  }

  // Strategy 2: Google Places API if key available & results needed
  if (scrapedResults.length < targetLimit && googlePlacesApiKey && searchKeyword) {
    console.log(`[Scraper] Searching Google Places API for: ${searchKeyword}`);
    const places = await fetchGooglePlaces(searchKeyword, googlePlacesApiKey, targetLimit * 2);
    scrapedResults.push(...places);
  }

  // Strategy 3: Multi-source Live Web Search + Cheerio + AI Parsing
  if (scrapedResults.length < targetLimit && searchKeyword) {
    console.log(`[Scraper] Executing live web search scrape for: ${searchKeyword}`);
    const webText = await fetchWebSearchSnippet(searchKeyword);
    if (webText) {
      const parsedWeb = await parseWithAI(webText, searchKeyword, targetLimit * 2 - scrapedResults.length, website_filter);
      scrapedResults.push(...parsedWeb);
    }
  }

  // Apply Website Filter Condition
  if (website_filter === 'without_website') {
    scrapedResults = scrapedResults.filter(b => {
      if (!b.website || b.website.trim() === '') return true;
      const w = b.website.toLowerCase();
      return w.includes('facebook.com') || w.includes('instagram.com') || w.includes('google.com') || w.includes('justdial');
    });
  } else if (website_filter === 'with_website') {
    scrapedResults = scrapedResults.filter(b => {
      if (!b.website || b.website.trim() === '') return false;
      const w = b.website.toLowerCase();
      return !w.includes('facebook.com') && !w.includes('instagram.com') && !w.includes('google.com');
    });
  }

  // Deduplication & Fallback formatting
  const existingLeads = await getLeads();
  const existingPhoneSet = new Set(
    existingLeads.map(l => normalizePhone(l.phone)).filter(Boolean)
  );
  const existingNameCitySet = new Set(
    existingLeads.map(l => `${l.business_name.toLowerCase().trim()}_${l.city.toLowerCase().trim()}`)
  );

  const createdLeads: Lead[] = [];
  let duplicateCount = 0;

  for (const item of scrapedResults) {
    if (!item.business_name || item.business_name.trim().length < 2) continue;

    const normPhone = normalizePhone(item.phone || '');
    const nameCityKey = `${item.business_name.toLowerCase().trim()}_${(item.city || location).toLowerCase().trim()}`;

    // Check duplicate
    if ((normPhone && existingPhoneSet.has(normPhone)) || existingNameCitySet.has(nameCityKey)) {
      duplicateCount++;
      continue;
    }

    const leadData: Partial<Lead> = {
      business_name: item.business_name.trim(),
      category: item.category || category || 'General',
      phone: item.phone || item.whatsapp_number || '',
      whatsapp_number: item.whatsapp_number || item.phone || '',
      address: item.address || '',
      city: item.city || location || 'Unknown',
      website: item.website || '',
      google_maps_url: item.google_maps_url || '',
      rating: item.rating || '',
      review_count: item.review_count || '',
      instagram: item.instagram || '',
      facebook: item.facebook || '',
      source: source || 'Web Scraper',
      status: 'New',
      priority: 'medium',
      tags: `Scraped, ${category || query || 'Web'}`,
      added_by: added_by,
      created_at: new Date().toISOString()
    };

    try {
      const created = await createLead(leadData as any);
      createdLeads.push(created);

      // Add to set to prevent duplicates in same run
      if (normPhone) existingPhoneSet.add(normPhone);
      existingNameCitySet.add(nameCityKey);

      await addActivity({
        lead_id: created.id,
        user_id: added_by,
        type: 'note',
        content: `Lead automatically scraped & added via ${source} (Query: "${searchKeyword || target_url}")`
      });
    } catch (err) {
      console.error('[Scraper] Failed to save scraped lead:', err);
    }
  }

  const message = createdLeads.length > 0
    ? `Successfully scraped ${createdLeads.length} new verified business lead(s) for "${searchKeyword || target_url}". (${duplicateCount} duplicate(s) skipped).`
    : `Scraping completed. Found ${scrapedResults.length} result(s), but ${duplicateCount} were already in your CRM.`;

  return {
    success: true,
    totalFound: scrapedResults.length,
    createdCount: createdLeads.length,
    duplicateCount,
    leads: createdLeads,
    message
  };
}
