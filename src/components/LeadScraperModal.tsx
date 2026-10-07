'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Lead } from '@/lib/types';

interface LeadScraperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newLeads: Lead[]) => void;
}

export default function LeadScraperModal({ isOpen, onClose, onSuccess }: LeadScraperModalProps) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState<'all' | 'without_website' | 'with_website'>('all');
  const [limit, setLimit] = useState(5);

  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    createdCount: number;
    duplicateCount: number;
    message: string;
    leads: Lead[];
  } | null>(null);

  if (!isOpen) return null;

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() && !targetUrl.trim()) {
      setError('Please provide either a business query/niche or a target URL to scrape.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);
    setStatusText('🔎 Initializing live web scraper & AI parser...');

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
        throw new Error(data.error || 'Scraping failed.');
      }

      setResult({
        createdCount: data.leadsCount || 0,
        duplicateCount: data.duplicateCount || 0,
        message: data.message || '',
        leads: data.leads || []
      });

      if (onSuccess && data.leads) {
        onSuccess(data.leads);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during scraping.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  }

  function handleReset() {
    setQuery('');
    setLocation('');
    setCategory('');
    setTargetUrl('');
    setLimit(5);
    setResult(null);
    setError('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: 'var(--surface-card, #12121e)', borderColor: 'var(--border, rgba(255,255,255,0.1))' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
              🔍
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Anweo AI Lead Scraper
              </h2>
              <p className="text-xs text-zinc-400">
                Scrape live business leads from web listings, Google Maps & URLs
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}

          {!result ? (
            <form onSubmit={handleScrape} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Business Query / Niche *
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="e.g. Interior Designers, Real Estate"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                  />
                </div>

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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Category Tag (Optional)
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="e.g. Marketing, Clinic, Salon"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Number of Leads ({limit})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500 mt-3"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <option value="without_website">🚫 Only WITHOUT Website (Web Design Leads)</option>
                    <option value="with_website">🌐 Only WITH Website</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Target Website / Directory URL (Optional)
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
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary text-sm"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-sm bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Scraping Live Web...</span>
                    </>
                  ) : (
                    <>🚀 Start AI Scrape</>
                  )}
                </button>
              </div>

              {loading && (
                <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
                  <span>{statusText}</span>
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>{result.message}</span>
                </div>
                <button onClick={handleReset} className="text-xs underline hover:text-white">
                  Scrape Again
                </button>
              </div>

              {result.leads && result.leads.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">
                    Scraped Leads ({result.leads.length})
                  </h3>
                  <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5 bg-white/5">
                    {result.leads.map((lead) => (
                      <div key={lead.id} className="p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div>
                          <div className="font-semibold text-white text-sm flex items-center gap-2">
                            {lead.business_name}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                              {lead.category || 'Lead'}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400 flex items-center gap-3 mt-1">
                            <span>📞 {lead.phone || 'No phone'}</span>
                            <span>📍 {lead.city || 'Unknown'}</span>
                            {lead.website && (
                              <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-amber-400 underline">
                                🌐 Website
                              </a>
                            )}
                          </div>
                        </div>
                        <Link 
                          href={`/leads/${lead.id}`}
                          className="btn-secondary text-xs px-3 py-1.5 rounded-lg"
                        >
                          View Lead
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button onClick={onClose} className="btn-primary text-sm px-6">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
