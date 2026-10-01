'use client';

import { useState, useRef, useEffect } from 'react';
import type { SessionUser, User, Lead, Message, Pitch } from '@/lib/types';
import Link from 'next/link';
import {
  MessageSquare, Send, CheckCircle2, Bot, Clock, Filter,
  Sparkles, BookOpen, ChevronRight, Loader2, Save, RefreshCw, Brain
} from 'lucide-react';

interface Props {
  session: SessionUser;
  users: User[];
  leads: Lead[];
  messages: Message[];
  pitches: Pitch[];
}

interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function MessagesClient({ session, users, leads, messages: initMessages, pitches: initPitches }: Props) {
  const [messages, setMessages] = useState<Message[]>(initMessages);
  const [pitches, setPitches] = useState<Pitch[]>(initPitches);
  const [activeTab, setActiveTab] = useState<'drafts' | 'history' | 'anweo_ai'>('drafts');

  // Filtering
  const [leadFilter, setLeadFilter] = useState<string>('all');
  const [saving, setSaving] = useState<string | null>(null);

  // ── Anweo AI state ────────────────────────────────────────
  const [aiSubTab, setAiSubTab] = useState<'chat' | 'teach'>('chat');
  const [aiChatMessages, setAiChatMessages] = useState<AIChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm **Anweo AI** 👋 — your built-in assistant. I can help you craft pitches, answer marketing questions, and learn about Anweo's services. What would you like to know?",
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiKnowledge, setAiKnowledge] = useState('');
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeSaving, setKnowledgeSaving] = useState(false);
  const [knowledgeSaved, setKnowledgeSaved] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChatMessages]);

  // Load knowledge when switching to AI tab
  useEffect(() => {
    if (activeTab === 'anweo_ai') {
      setKnowledgeLoading(true);
      fetch('/api/ai/knowledge')
        .then(r => r.json())
        .then(data => {
          if (data.success) setAiKnowledge(data.data.knowledge || '');
        })
        .finally(() => setKnowledgeLoading(false));
    }
  }, [activeTab]);

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
        await fetch(`/api/pitches/${pitch.id}`, { method: 'DELETE' });
        setPitches(pitches.filter(p => p.id !== pitch.id));
      }
    } finally {
      setSaving(null);
    }
  }

  // ── AI Chat ───────────────────────────────────────────────
  async function sendAiMessage() {
    const text = aiInput.trim();
    if (!text || aiLoading) return;

    const newMessages: AIChatMessage[] = [...aiChatMessages, { role: 'user', content: text }];
    setAiChatMessages(newMessages);
    setAiInput('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          systemKnowledge: aiKnowledge,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiChatMessages([...newMessages, { role: 'assistant', content: data.data.reply }]);
      } else {
        setAiChatMessages([...newMessages, { role: 'assistant', content: `❌ Error: ${data.error || 'Unknown error'}` }]);
      }
    } catch (err) {
      setAiChatMessages([...newMessages, { role: 'assistant', content: '❌ Failed to connect to AI. Check your API configuration.' }]);
    } finally {
      setAiLoading(false);
    }
  }

  async function saveKnowledge() {
    setKnowledgeSaving(true);
    try {
      await fetch('/api/ai/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledge: aiKnowledge }),
      });
      setKnowledgeSaved(true);
      setTimeout(() => setKnowledgeSaved(false), 3000);
    } finally {
      setKnowledgeSaving(false);
    }
  }

  function clearChat() {
    setAiChatMessages([{
      role: 'assistant',
      content: "Hi! I'm **Anweo AI** 👋 — your built-in assistant. I can help you craft pitches, answer marketing questions, and learn about Anweo's services. What would you like to know?",
    }]);
  }

  // ── Render helpers ────────────────────────────────────────
  function renderMarkdown(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:3px;font-size:0.85em">$1</code>')
      .replace(/\n/g, '<br/>');
  }

  return (
    <div className={`p-6 md:p-8 flex flex-col flex-1 min-h-0 animate-fade-in mx-auto w-full transition-all duration-300 ${activeTab === 'anweo_ai' ? 'max-w-[1800px]' : 'max-w-7xl'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-[var(--brand-400)]" />
            Communication Hub
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {session.role === 'admin'
              ? 'Global workspace for all AI pitches, message logs, and Anweo AI assistant.'
              : 'Your personal workspace for drafting, sending, logging messages, and chatting with Anweo AI.'}
          </p>
        </div>

        {activeTab !== 'anweo_ai' && (
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
        )}
      </div>

      {/* Tab bar */}
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
        <button
          className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'anweo_ai' ? 'border-b-2 border-purple-500 text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
          onClick={() => setActiveTab('anweo_ai')}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-extrabold">
            Anweo AI
          </span>
        </button>
      </div>

      {/* Content */}
      <div className={`flex-1 min-h-0 ${activeTab === 'anweo_ai' ? 'flex flex-col' : 'overflow-y-auto pr-2 pb-10'}`}>

        {/* ── AI Pitches Drafts ── */}
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
                          <Bot className="w-3 h-3" /> AI Generated • {new Date(pitch.generated_at).toLocaleDateString()}
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

        {/* ── Message History ── */}
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
                            <><span className="text-[var(--brand-400)] font-bold flex items-center gap-1"><Send className="w-3 h-3" /> Sent</span> to <Link href={`/leads/${msg.lead_id}`} className="text-white hover:underline">{getLeadName(msg.lead_id)}</Link></>
                          ) : (
                            <><span className="text-blue-400 font-bold flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Received</span> from <Link href={`/leads/${msg.lead_id}`} className="text-white hover:underline">{getLeadName(msg.lead_id)}</Link></>
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

        {/* ── Anweo AI ── */}
        {activeTab === 'anweo_ai' && (
          <div className="flex flex-col gap-4 h-full">
            {/* Sub-tab switcher */}
            <div className="flex gap-1 p-1 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] w-fit">
              <button
                onClick={() => setAiSubTab('chat')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${aiSubTab === 'chat' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-white'}`}
              >
                <Sparkles className="w-4 h-4" />
                Chat with Anweo AI
              </button>
              <button
                onClick={() => setAiSubTab('teach')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${aiSubTab === 'teach' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-white'}`}
              >
                <Brain className="w-4 h-4" />
                Teach Anweo AI
              </button>
            </div>

            {/* Chat panel */}
            {aiSubTab === 'chat' && (
              <div className="flex flex-col flex-1 min-h-0 card bg-[var(--surface-2)] border border-purple-500/20 p-0 overflow-hidden">
                {/* Chat header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-gradient-to-r from-purple-900/30 to-pink-900/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">Anweo AI</p>
                      <p className="text-[10px] text-purple-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Online
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={clearChat}
                    className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Clear
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                  {aiChatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-tr-sm'
                          : 'bg-[var(--surface-3)] border border-[var(--border)] text-white/90 rounded-tl-sm'
                      }`}>
                        <p dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-3)] border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white">
                          {session.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  ))}

                  {aiLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-[var(--surface-3)] border border-[var(--border)] px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                        <span className="text-sm text-[var(--text-muted)]">Thinking...</span>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-2)]">
                  <div className="flex gap-2 items-end">
                    <textarea
                      className="flex-1 resize-none bg-[var(--surface-3)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500/50 transition-colors"
                      rows={2}
                      placeholder="Ask Anweo AI anything... (Shift+Enter for new line)"
                      value={aiInput}
                      onChange={e => setAiInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendAiMessage();
                        }
                      }}
                      disabled={aiLoading}
                    />
                    <button
                      onClick={sendAiMessage}
                      disabled={aiLoading || !aiInput.trim()}
                      className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25 shrink-0"
                    >
                      {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
                    Anweo AI uses your knowledge base from the "Teach" tab to give better answers.
                  </p>
                </div>
              </div>
            )}

            {/* Teach panel */}
            {aiSubTab === 'teach' && (
              <div className="flex flex-col gap-4 flex-1 min-h-0">
                <div className="card bg-[var(--surface-2)] border border-blue-500/20 p-5 flex flex-col flex-1 min-h-0">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <Brain className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="font-bold text-white text-base">Teach Anweo AI</h2>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Write everything Anweo AI should know about your agency — services, pricing, team, unique selling points, communication tone, and more. This knowledge is injected into every chat.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden border border-[var(--border)] mb-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-3)] border-b border-[var(--border)] shrink-0">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">Knowledge Base</span>
                    </div>
                    {knowledgeLoading ? (
                      <div className="flex items-center justify-center flex-1 bg-[var(--surface-3)]">
                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                      </div>
                    ) : (
                      <textarea
                        className="w-full flex-1 min-h-0 bg-[var(--surface-3)] text-sm text-white/90 px-4 py-3 resize-none focus:outline-none placeholder-[var(--text-muted)] font-mono leading-relaxed"
                        placeholder={`Tell Anweo AI everything about your agency. For example:\n\n## About Anweo\nAnweo is a digital marketing agency based in Kerala, India, specializing in...\n\n## Our Services\n1. Social Media Management - ₹8,000/month...\n2. Google Ads - starting from ₹5,000...\n\n## Our Tone\nWe communicate in a friendly, professional manner...\n\n## Target Clients\nWe focus on local businesses in Kerala, especially restaurants, retail shops...`}
                        value={aiKnowledge}
                        onChange={e => setAiKnowledge(e.target.value)}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--text-muted)]">
                      {aiKnowledge.length > 0 ? `${aiKnowledge.length} characters in knowledge base` : 'Knowledge base is empty'}
                    </p>
                    <button
                      onClick={saveKnowledge}
                      disabled={knowledgeSaving}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        knowledgeSaved
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/20'
                      } disabled:opacity-50`}
                    >
                      {knowledgeSaving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                      ) : knowledgeSaved ? (
                        <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                      ) : (
                        <><Save className="w-4 h-4" /> Save Knowledge</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick Tips */}
                <div className="card bg-[var(--surface-2)] border border-amber-500/20 p-5">
                  <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                    <span className="text-amber-400">💡</span> Tips for a great knowledge base
                  </h3>
                  <ul className="flex flex-col gap-2 text-xs text-[var(--text-muted)]">
                    {[
                      'Include your services with pricing so AI can help during sales conversations',
                      'Describe your ideal client profile and what problems you solve',
                      'Add your communication tone and language preferences (English, Malayalam, etc.)',
                      'Include objection-handling scripts your team already uses',
                      'Add your unique selling points compared to competitors',
                      'Mention your team structure so AI gives appropriate context',
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
