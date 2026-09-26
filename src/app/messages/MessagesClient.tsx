'use client';

import { useState } from 'react';
import type { SessionUser, User, Lead, Message, Pitch } from '@/lib/types';
import Link from 'next/link';
import { MessageSquare, Send, CheckCircle2, Bot, Clock, Filter, User as UserIcon } from 'lucide-react';

interface Props {
  session: SessionUser;
  users: User[];
  leads: Lead[];
  messages: Message[];
  pitches: Pitch[];
}

export default function MessagesClient({ session, users, leads, messages: initMessages, pitches: initPitches }: Props) {
  const [messages, setMessages] = useState<Message[]>(initMessages);
  const [pitches, setPitches] = useState<Pitch[]>(initPitches);
  const [activeTab, setActiveTab] = useState<'drafts' | 'history'>('drafts');
  
  // Filtering
  const [leadFilter, setLeadFilter] = useState<string>('all');
  const [saving, setSaving] = useState<string | null>(null);

  // Derive un-sent pitches (we assume a pitch is "sent" if it's logged in messages? 
  // Actually, let's just let them delete/mark-as-sent pitches manually, or we can just show all pitches that don't have a corresponding message yet, but manual management is easier).
  // For simplicity, we just show all pitches here. In a real app, they'd disappear when sent.

  const getLeadName = (leadId: string) => leads.find(l => l.id === leadId)?.business_name || 'Unknown Lead';
  const getUserName = (userId: string) => {
    if (userId === 'anweo_ai') return 'Anweo AI';
    return users.find(u => u.id === userId)?.username || 'Unknown User';
  };

  const filteredPitches = pitches
    .filter(p => leadFilter === 'all' || p.lead_id === leadFilter)
    .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());

  const filteredMessages = messages
    .filter(m => leadFilter === 'all' || m.lead_id === leadFilter)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  async function handleMarkPitchSent(pitch: Pitch) {
    setSaving(pitch.id);
    try {
      // Create a message record
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: pitch.lead_id,
          user_id: session.id,
          direction: 'sent',
          message_text: pitch.message_text,
          template_used: 'AI Pitch',
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessages([data.data, ...messages]);
        // Ideally we would delete the pitch or mark it sent. Let's just delete it to clean up the queue.
        await fetch(`/api/pitches/${pitch.id}`, { method: 'DELETE' });
        setPitches(pitches.filter(p => p.id !== pitch.id));
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="p-6 md:p-10 flex flex-col h-[calc(100vh-2rem)] animate-fade-in max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-[var(--brand-400)]" />
            Communication Hub
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {session.role === 'admin' 
              ? 'Global workspace for all AI pitches and message logs across the entire agency.'
              : 'Your personal workspace for drafting, sending, and logging client messages.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <select 
              className="select pl-9 text-xs py-2"
              value={leadFilter}
              onChange={e => setLeadFilter(e.target.value)}
            >
              <option value="all">All Leads</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.business_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-[var(--border)] shrink-0">
        <button
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'drafts' ? 'border-b-2 border-[var(--brand-500)] text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
          onClick={() => setActiveTab('drafts')}
        >
          <Bot className="w-4 h-4" />
          AI Pitches (Drafts)
          <span className="badge bg-white/10 text-white ml-1">{filteredPitches.length}</span>
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock className="w-4 h-4" />
          Message History
          <span className="badge bg-white/10 text-white ml-1">{filteredMessages.length}</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-10">
        {activeTab === 'drafts' && (
          <div className="flex flex-col gap-4">
            {filteredPitches.length === 0 ? (
              <div className="card text-center p-12 bg-[var(--surface-2)]">
                <Bot className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-muted)]">No drafted AI pitches waiting to be sent.</p>
                <p className="text-xs mt-2 text-[var(--text-muted)]">Go to a Lead to generate a new pitch.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredPitches.map(pitch => (
                  <div key={pitch.id} className="card bg-[var(--surface-2)] flex flex-col hover:border-[var(--brand-500)]/30 transition-colors">
                    <div className="flex items-center justify-between mb-3 border-b border-[var(--border)] pb-3">
                      <div>
                        <Link href={`/leads/${pitch.lead_id}`} className="font-bold text-white hover:text-[var(--brand-400)] text-sm">
                          {getLeadName(pitch.lead_id)}
                        </Link>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                          <Bot className="w-3 h-3"/> AI Generated • {new Date(pitch.generated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="badge bg-[var(--brand-900)] text-[var(--brand-400)] border border-[var(--brand-500)]/20">Draft</span>
                    </div>
                    
                    <div className="p-3 bg-[var(--surface-3)] rounded-lg text-sm text-white/90 whitespace-pre-wrap flex-1 border border-[var(--border)] mb-4">
                      {pitch.message_text}
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-2">
                      <a 
                        href={pitch.wa_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn-secondary btn-sm flex items-center gap-2"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Open in WhatsApp
                      </a>
                      
                      <button 
                        onClick={() => handleMarkPitchSent(pitch)}
                        disabled={saving === pitch.id}
                        className="btn-primary btn-sm flex items-center gap-2"
                      >
                        {saving === pitch.id ? '⏳ Logging...' : <><CheckCircle2 className="w-3.5 h-3.5" /> Mark as Sent</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex flex-col gap-4">
            {filteredMessages.length === 0 ? (
              <div className="card text-center p-12 bg-[var(--surface-2)]">
                <MessageSquare className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
                <p className="text-[var(--text-muted)]">No messages have been logged yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredMessages.map(msg => {
                  const isSent = msg.direction === 'sent';
                  return (
                    <div key={msg.id} className={`card flex flex-col gap-2 max-w-[80%] ${isSent ? 'ml-auto bg-[var(--surface-3)] border-[var(--brand-500)]/20' : 'mr-auto bg-[var(--surface-2)] border-blue-500/20'}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs">
                          {isSent ? (
                            <><span className="text-[var(--brand-400)] font-bold flex items-center gap-1"><Send className="w-3 h-3"/> Sent</span> to <Link href={`/leads/${msg.lead_id}`} className="text-white hover:underline">{getLeadName(msg.lead_id)}</Link></>
                          ) : (
                            <><span className="text-blue-400 font-bold flex items-center gap-1"><MessageSquare className="w-3 h-3"/> Received</span> from <Link href={`/leads/${msg.lead_id}`} className="text-white hover:underline">{getLeadName(msg.lead_id)}</Link></>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      
                      <p className="text-sm text-white/90 whitespace-pre-wrap">{msg.message_text}</p>
                      
                      <div className="flex items-center justify-between mt-1 pt-2 border-t border-[var(--border)]/50 text-[10px] text-[var(--text-muted)]">
                        <span>Logged by: {getUserName(msg.user_id)}</span>
                        {msg.template_used && <span>Template: {msg.template_used}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
