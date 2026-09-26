'use client';

import { useState } from 'react';
import type { Template } from '@/lib/types';
import { FileText, Copy, CheckCircle2 } from 'lucide-react';

interface Props {
  templates: Template[];
}

export default function TeamTemplatesClient({ templates }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const types = Array.from(new Set(templates.map((t) => t.type)));

  return (
    <div className="p-6 md:p-10 flex flex-col gap-6 animate-fade-in max-w-5xl mx-auto w-full">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <FileText className="w-8 h-8 text-blue-400" />
          Message Templates
          <span className="text-xs px-2.5 py-1 ml-2 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold tracking-wide uppercase">
            Read-Only
          </span>
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Quickly copy and paste standard messaging templates for different scenarios.
        </p>
      </div>

      {types.length === 0 ? (
        <div className="card text-center p-12">
          <p className="text-[var(--text-muted)]">No active templates available.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {types.map((type) => {
            const typeTemplates = templates.filter((t) => t.type === type);
            return (
              <div key={type} className="flex flex-col gap-4">
                <h2 className="text-lg font-bold text-white capitalize border-b border-[var(--border)] pb-2">
                  {type.replace('_', ' ')} Templates
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {typeTemplates.map((t) => (
                    <div key={t.id} className="card bg-[var(--surface-2)] hover:border-[var(--brand-500)]/50 transition-colors flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-white">{t.name}</h3>
                        <button 
                          onClick={() => copyToClipboard(t.id, t.body)}
                          className="btn-secondary btn-sm flex items-center gap-1.5 bg-[var(--surface-3)]"
                        >
                          {copiedId === t.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === t.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="p-3 bg-[var(--surface-3)] rounded-lg text-sm text-[var(--text-secondary)] whitespace-pre-wrap flex-1 border border-[var(--border)] font-mono text-xs">
                        {t.body}
                      </div>
                      {t.variables && (
                        <div className="mt-3 text-[10px] text-[var(--text-muted)]">
                          <strong className="text-white">Variables:</strong> {t.variables}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
