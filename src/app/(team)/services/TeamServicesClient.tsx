'use client';

import { useState } from 'react';
import type { Service, Package } from '@/lib/types';
import { Package as PackageIcon, CheckCircle2 } from 'lucide-react';

interface Props {
  services: Service[];
  packages: Package[];
}

export default function TeamServicesClient({ services, packages }: Props) {
  const [expandedService, setExpandedService] = useState<string | null>(null);

  const sorted = [...services].sort((a, b) => parseInt(a.priority_rank, 10) - parseInt(b.priority_rank, 10));

  return (
    <div className="p-6 md:p-10 flex flex-col gap-6 animate-fade-in max-w-5xl mx-auto w-full">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <span className="text-3xl">🛠️</span> 
          Services Overview
          <span className="text-xs px-2.5 py-1 ml-2 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold tracking-wide uppercase">
            Read-Only
          </span>
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Explore the services and packages we offer. Use this as a reference during your client calls and pitches.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {sorted.map((svc) => {
          const svcPackages = packages.filter((p) => p.service_id === svc.id);
          const isExpanded = expandedService === svc.id;
          return (
            <div
              key={svc.id}
              className="card transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">{svc.name}</h3>
                    <span className="badge-green text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Active</span>
                  </div>
                  
                  <p className="text-sm text-[var(--text-secondary)] mb-4">{svc.description}</p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {svc.ideal_customer && (
                      <div className="bg-[var(--surface-3)] p-3 rounded-xl border border-[var(--border)]">
                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">🎯 Ideal Customer</span>
                        <span className="text-sm text-white">{svc.ideal_customer}</span>
                      </div>
                    )}
                    {svc.pitch_angle && (
                      <div className="bg-[var(--brand-900)] p-3 rounded-xl border border-[var(--brand-500)]/30">
                        <span className="text-xs font-bold text-[var(--brand-400)] uppercase tracking-wider mb-1 block">💡 Pitch Angle</span>
                        <span className="text-sm text-white/90">{svc.pitch_angle}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="shrink-0 flex items-center justify-end">
                  <button 
                    className={`btn-secondary flex items-center gap-2 ${isExpanded ? 'bg-[var(--surface-3)]' : ''}`}
                    onClick={() => setExpandedService(isExpanded ? null : svc.id)}
                  >
                    <PackageIcon className="w-4 h-4" />
                    View Packages ({svcPackages.length})
                  </button>
                </div>
              </div>

              {/* Packages Expansion */}
              {isExpanded && (
                <div className="mt-6 pt-6 animate-fade-in border-t border-[var(--border)]">
                  <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                    <PackageIcon className="w-4 h-4 text-[var(--brand-400)]" /> Available Packages
                  </h4>

                  {svcPackages.length === 0 ? (
                    <div className="p-8 text-center bg-[var(--surface-3)] rounded-2xl border border-[var(--border)] border-dashed">
                      <p className="text-sm text-[var(--text-muted)]">No active packages for this service yet.</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {svcPackages.map((pkg) => (
                        <div key={pkg.id} className="rounded-2xl p-4 bg-gradient-to-b from-[var(--surface-3)] to-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--brand-500)]/50 transition-colors flex flex-col h-full">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <h5 className="font-bold text-base text-white">{pkg.name}</h5>
                            <span className="badge-green text-xs font-bold shrink-0 shadow-sm shadow-emerald-500/20">
                              ₹{parseInt(pkg.price).toLocaleString('en-IN')}
                            </span>
                          </div>
                          
                          {pkg.description && (
                            <p className="text-xs text-[var(--text-secondary)] mb-4 flex-1">{pkg.description}</p>
                          )}
                          
                          {pkg.deliverables && (
                            <div className="mt-auto pt-3 border-t border-[var(--border)]/50">
                              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Deliverables</p>
                              <p className="text-xs text-white/80 whitespace-pre-line leading-relaxed">{pkg.deliverables}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
