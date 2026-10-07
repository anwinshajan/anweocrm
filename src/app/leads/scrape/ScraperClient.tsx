'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Lead } from '@/lib/types';

interface ScraperClientProps {
  role: 'admin' | 'team';
  userId: string;
}

export default function ScraperClient({ role, userId }: ScraperClientProps) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState<'all' | 'without_website' | 'with_website'>('all');
  const [limit, setLimit] = useState(10);

  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const [scrapedLeads, setScrapedLeads] = useState<Lead[]>([]);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  async function handleRunScrape(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() && !targetUrl.trim()) {
      setError('Please enter a business query/niche or target URL to scrape.');
      return;
    }

    setError('');
    setLoading(true);
    setResultMessage(null);
    setStatusText('🔎 Fetching web listings & analyzing with AI...');

    try {
      const res = await fetch('/api/ai/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          location: location.trim(),
          category: category.trim(),
          target_url: targetUrl.trim(),
          website_filter: websiteFilter,
          limit: Number(limit)
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Scraping operation failed.');
      }

      setScrapedLeads(data.leads || []);
      setResultMessage(data.message);
    } catch (err: any) {
      setError(err.message || 'An error occurred during scraping.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/leads" className="text-sm mb-2 inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors">
            ← Back to Leads
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
              🔍
            </span>
            Lead Scraper Hub
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Discover verified business leads live from Google Maps, web directories, and custom URLs using Anweo AI.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/leads/import" className="btn-secondary text-sm">
            📥 CSV Import
          </Link>
          <Link href="/leads" className="btn-primary text-sm">
            📋 View All Leads
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Scraper Form Card */}
        <div className="lg:col-span-5 bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5" style={{ background: 'var(--surface-card, #12121e)' }}>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚡</span> Configure AI Scrape
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Enter target niche, location, or direct website link</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleRunScrape} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Niche / Business Type *
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. Digital Marketing Agencies, Dentists, Real Estate"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Location / City
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g. Dubai, Kochi, Mumbai"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Category Tag
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g. Real Estate, Healthcare"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Number of Leads ({limit})
              </label>
              <input
                type="range"
                min="1"
                max="20"
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500 mt-2"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                disabled={loading}
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>1 Lead</span>
                <span>10 Leads</span>
                <span>20 Leads</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Website Filter Condition
              </label>
              <select
                className="select w-full"
                value={websiteFilter}
                onChange={(e) => setWebsiteFilter(e.target.value as any)}
                disabled={loading}
              >
                <option value="all">All Businesses</option>
                <option value="without_website">🚫 Only WITHOUT Website (Great for Web Design pitches!)</option>
                <option value="with_website">🌐 Only WITH Website</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Custom Website / Directory URL (Optional)
              </label>
              <input
                type="url"
                className="input w-full"
                placeholder="https://example.com/directory"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="w-full btn-primary text-sm bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mt-4"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Scraping Live Web...</span>
                </>
              ) : (
                <>🚀 Run Scraper</>
              )}
            </button>

            {loading && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                <span>{statusText}</span>
              </div>
            )}
          </form>

          {/* Tips Box */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-400 space-y-2">
            <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
              💡 Telegram Bot Integration:
            </div>
            <p>
              You can also trigger scraping directly from Telegram by messaging your bot:
            </p>
            <code className="block p-2 rounded bg-black/40 text-amber-300 font-mono text-[11px]">
              /scrape Dentists in Kochi 10
            </code>
            <p className="text-[11px] text-zinc-500">
              Or simply send a natural message like "Scrape 10 web agencies in Dubai".
            </p>
          </div>
        </div>

        {/* Right Results Panel */}
        <div className="lg:col-span-7 bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col min-h-[500px]" style={{ background: 'var(--surface-card, #12121e)' }}>
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📋</span> Scraped Results {scrapedLeads.length > 0 && `(${scrapedLeads.length})`}
            </h2>
            {resultMessage && (
              <span className="text-xs text-amber-400 font-medium">
                {resultMessage}
              </span>
            )}
          </div>

          {scrapedLeads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-500">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl mb-3">
                🌐
              </div>
              <h3 className="text-base font-semibold text-zinc-300">No leads scraped yet</h3>
              <p className="text-xs max-w-sm mt-1">
                Fill in the query and location on the left, then click "Run Scraper" to extract real leads live.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
              {scrapedLeads.map((lead) => (
                <div key={lead.id} className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-amber-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-semibold text-white text-base flex items-center gap-2">
                      {lead.business_name}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                        {lead.category || 'Scraped'}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-3">
                      <span>📞 {lead.phone || 'No phone'}</span>
                      <span>📍 {lead.city || 'Unknown'}</span>
                      {lead.rating && <span>⭐ {lead.rating}</span>}
                      {lead.website && (
                        <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
                          🌐 Website
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="btn-secondary text-xs px-3 py-1.5 rounded-lg"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
