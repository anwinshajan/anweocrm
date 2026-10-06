import { getLeads } from '@/lib/data/leads';
import { getSettings } from '@/lib/data';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const revalidate = 0; // ensure data is always fresh

export default async function WhatsAppAIDashboard() {
  const leads = await getLeads();
  const activeLeads = leads.filter(l => l.status !== 'Deleted');
  
  const escalatedLeads = activeLeads.filter(l => l.status === 'Needs Admin Help');
  const followUpLeads = activeLeads.filter(l => l.status.startsWith('Follow-up'));
  const coldDmLeads = activeLeads.filter(l => l.status === 'Cold DM Sent');
  
  // Sort recently contacted first
  const recentlyContacted = [...followUpLeads, ...coldDmLeads].sort((a, b) => {
    return new Date(b.last_contacted_at || 0).getTime() - new Date(a.last_contacted_at || 0).getTime();
  }).slice(0, 50);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">WhatsApp AI</h1>
          <p className="text-[var(--text-muted)] text-lg">Omni-Bot Live Monitoring & Escalations</p>
        </div>
        <div className="flex gap-4">
            <div className="flex flex-col items-center justify-center bg-black/30 border border-[var(--border)] rounded-xl px-6 py-3">
                <span className="text-2xl font-black text-[var(--brand-400)]">{coldDmLeads.length}</span>
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">Pitches Sent</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-black/30 border border-[var(--border)] rounded-xl px-6 py-3">
                <span className="text-2xl font-black text-blue-400">{followUpLeads.length}</span>
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">Follow-ups</span>
            </div>
        </div>
      </header>

      {/* Escalation Queue */}
      <section className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
            🚨 Action Required ({escalatedLeads.length})
        </h2>
        {escalatedLeads.length === 0 ? (
            <p className="text-sm text-red-300/50 italic">No leads currently need admin help. The AI is handling everything perfectly.</p>
        ) : (
            <div className="grid gap-4">
                {escalatedLeads.map(lead => (
                    <div key={lead.id} className="bg-black/40 border border-red-500/30 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-white text-lg">{lead.business_name}</h3>
                            <p className="text-sm text-[var(--text-muted)]">{lead.phone || lead.whatsapp_number}</p>
                            <p className="text-xs text-red-300 mt-2 bg-red-500/10 inline-block px-2 py-1 rounded">The AI encountered a complex question and escalated this chat.</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Link href={`/leads/${lead.id}`} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-colors flex-1 text-center">
                                View Chat
                            </Link>
                            <form action={async () => {
                                'use server';
                                const { updateLead } = await import('@/lib/data/leads');
                                await updateLead(lead.id, { status: 'Cold DM Sent' });
                                redirect('/admin/whatsapp');
                            }} className="flex-1">
                                <button className="w-full px-4 py-2 bg-[var(--brand-600)] hover:bg-[var(--brand-500)] text-white rounded-lg text-sm font-bold transition-colors shadow-lg">
                                    Resume AI
                                </button>
                            </form>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </section>

      {/* Live Activity Feed */}
      <section className="bg-black/20 border border-[var(--border)] rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <h2 className="text-xl font-bold text-white mb-4">📡 Live AI Activity</h2>
        <div className="space-y-3">
            {recentlyContacted.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] italic">No recent activity. Double-click the Start_Anweo_AI.bat file on your desktop to wake the bot up!</p>
            ) : (
                recentlyContacted.map(lead => (
                    <div key={lead.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--brand-500)]/20 flex items-center justify-center text-[var(--brand-400)] text-sm">
                                🤖
                            </div>
                            <div>
                                <div className="font-bold text-sm text-white">{lead.business_name}</div>
                                <div className="text-xs text-[var(--text-muted)]">{new Date(lead.last_contacted_at || '').toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/10 text-[var(--text-muted)]">
                            {lead.status}
                        </div>
                    </div>
                ))
            )}
        </div>
      </section>
    </div>
  );
}
