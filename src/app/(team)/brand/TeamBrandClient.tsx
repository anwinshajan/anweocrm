'use client';

import { BookOpen } from 'lucide-react';

interface Props {
  data: Record<string, string>;
}

export default function TeamBrandClient({ data }: Props) {
  const fields = [
    { key: 'company_name', label: 'Company Name' },
    { key: 'target_audience', label: 'Target Audience' },
    { key: 'core_usps', label: 'Core USPs (Unique Selling Propositions)' },
    { key: 'tone_of_voice', label: 'Tone of Voice' },
    { key: 'past_wins', label: 'Past Wins / Case Studies' },
    { key: 'objection_handling', label: 'Common Objections & Rebuttals' },
  ];

  return (
    <div className="p-6 md:p-10 flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto w-full">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-[#B8FF33]" />
          Brand Knowledge Base
          <span className="text-xs px-2.5 py-1 ml-2 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold tracking-wide uppercase">
            Read-Only
          </span>
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Review Anweo's core branding, USPs, and past wins to strengthen your pitches.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {fields.map((f) => (
          <div key={f.key} className="card bg-[var(--surface-2)]">
            <h2 className="text-base font-bold text-white mb-2 uppercase tracking-wide flex items-center gap-2">
              {f.label}
            </h2>
            {data[f.key] ? (
              <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed bg-[var(--surface-3)] p-4 rounded-xl border border-[var(--border)]">
                {data[f.key]}
              </p>
            ) : (
              <p className="text-sm text-[var(--text-muted)] italic">Not defined yet.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
