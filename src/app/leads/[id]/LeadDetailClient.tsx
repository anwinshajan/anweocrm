'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Lead, Research, CallNote, Pitch, Message, Activity, Service, ConfigItem, User, SessionUser } from '@/lib/types';

interface Props {
  lead: Lead;
  research: Research | null;
  callNote: CallNote | null;
  pitches: Pitch[];
  messages: Message[];
  activity: Activity[];
  services: Service[];
  statuses: ConfigItem[];
  lostReasons: ConfigItem[];
  users: User[];
  session: SessionUser;
}

function AuditChips({ auditResults }: { auditResults: string }) {
  let parsed: Record<string, string> = {};
  try { parsed = JSON.parse(auditResults); } catch {}
  if (Object.keys(parsed).length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {Object.entries(parsed).map(([check, status]) => (
        <span
          key={check}
          className={`audit-${status === 'pass' ? 'pass' : status === 'fail' ? 'fail' : 'unknown'}`}
        >
          {status === 'pass' ? '✓' : status === 'fail' ? '✗' : '?'} {check}
        </span>
      ))}
    </div>
  );
}

function MessageThread({ messages }: { messages: Message[] }) {
  return (
    <div className="flex flex-col gap-3 max-h-96 overflow-y-auto p-1">
      {messages.length === 0 ? (
        <div className="empty-state py-8">
          <div className="empty-icon">💬</div>
          <p style={{ color: 'var(--text-secondary)' }}>No messages yet</p>
        </div>
      ) : (
        messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.direction === 'sent' ? 'justify-end' : 'justify-start'}`}>
            <div className={msg.direction === 'sent' ? 'msg-sent' : 'msg-received'}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message_text}</p>
              <p className="text-[10px] mt-1 opacity-60">
                {new Date(msg.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function LeadDetailClient({
  lead: initialLead,
  research,
  callNote,
  pitches: initialPitches,
  messages: initialMessages,
  activity,
  services,
  statuses,
  lostReasons,
  users,
  session,
}: Props) {
  const [lead, setLead] = useState(initialLead);
  const [pitches, setPitches] = useState(initialPitches);
  const [messages, setMessages] = useState(initialMessages);
  const [activeTab, setActiveTab] = useState<'overview' | 'pitch' | 'call' | 'messages' | 'activity'>('overview');
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState(research?.recommended_service_id || services[0]?.id || '');
  const [pitchLanguage, setPitchLanguage] = useState<'english' | 'malayalam' | 'manglish'>('english');
  const [editingPitch, setEditingPitch] = useState<string | null>(null);
  const [editPitchText, setEditPitchText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [classificationResult, setClassificationResult] = useState<{ classification: string; suggested_next: string } | null>(null);
  const [statusEdit, setStatusEdit] = useState(lead.status);
  const [lostReason, setLostReason] = useState(lead.lost_reason);
  const [nextFollowup, setNextFollowup] = useState(lead.next_followup_at?.slice(0, 16) || '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function generate(action: string, extra?: Record<string, string>) {
    setGenerating(action);
    try {
      const res = await fetch(`/api/leads/${lead.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, serviceId: selectedService, language: pitchLanguage, ...extra }),
      });
      const data = await res.json();
      if (!data.success) { showToast(data.error ?? 'Generation failed', 'error'); return; }

      if (action === 'pitch') {
        setPitches((p) => [data.data, ...p]);
        showToast('Pitch generated!');
        setActiveTab('pitch');
      } else if (action === 'research') {
        showToast('Research done!');
        setActiveTab('overview');
        window.location.reload();
      } else if (action === 'call_note') {
        showToast('Call note ready!');
        setActiveTab('call');
        window.location.reload();
      }
    } finally {
      setGenerating(null);
    }
  }

  async function savePitchEdit(pitchId: string) {
    const res = await fetch(`/api/pitches/${pitchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_text: editPitchText, edited_by: session.id }),
    });
    if (res.ok) {
      setPitches((p) => p.map((pitch) => pitch.id === pitchId ? { ...pitch, message_text: editPitchText } : pitch));
      setEditingPitch(null);
      showToast('Pitch saved');
    }
  }

  async function logReply() {
    if (!replyText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'received', message_text: replyText, classify: true }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((m) => [...m, data.data.message]);
        setClassificationResult(data.data.classification);
        setReplyText('');
        showToast('Reply logged');
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveStatus() {
    setSaving(true);
    const updates: Record<string, string> = { status: statusEdit };
    if (statusEdit === 'Lost') updates.lost_reason = lostReason;
    if (nextFollowup) updates.next_followup_at = new Date(nextFollowup).toISOString();

    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.success) {
      setLead(data.data);
      showToast('Saved');
    } else {
      showToast(data.error ?? 'Save failed', 'error');
    }
    setSaving(false);
  }

  const latestPitch = pitches[0] ?? null;
  const canEdit = session.role === 'admin' || lead.assigned_to === session.id;

  const TABS = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'pitch', label: `📝 Pitch${pitches.length > 0 ? ` (${pitches.length})` : ''}` },
    { id: 'call', label: '📞 Call Note' },
    { id: 'messages', label: `💬 Messages${messages.length > 0 ? ` (${messages.length})` : ''}` },
    { id: 'activity', label: '⏱️ Activity' },
  ] as const;

  return (
    <div className="p-6 flex flex-col gap-6 animate-fade-in max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Link href="/leads" className="text-sm mb-2 inline-flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            ← Back to Leads
          </Link>
          <h1 className="text-2xl font-bold text-white">{lead.business_name}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {lead.category} · {lead.city}
            {lead.google_maps_url && (
              <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer" className="ml-2" style={{ color: 'var(--brand-400)' }}>
                📍 Maps
              </a>
            )}
          </p>
        </div>

        {/* AI generate buttons */}
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary btn-sm"
              onClick={() => generate('research')}
              disabled={!!generating}
            >
              {generating === 'research' ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : '🔍'}
              Research
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => generate('call_note')}
              disabled={!!generating}
            >
              {generating === 'call_note' ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : '📞'}
              Call Note
            </button>
            <button
              className="btn-primary btn-sm"
              onClick={() => generate('pitch')}
              disabled={!!generating}
            >
              {generating === 'pitch' ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : '✨'}
              Generate Pitch
            </button>
          </div>
        )}
      </div>

      {/* Status / Followup bar */}
      <div className="card flex flex-wrap items-center gap-4">
        <div className="form-group">
          <label className="label">Status</label>
          <select className="select text-sm" value={statusEdit} onChange={(e) => setStatusEdit(e.target.value)}>
            {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        {statusEdit === 'Lost' && (
          <div className="form-group">
            <label className="label">Lost Reason</label>
            <select className="select text-sm" value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
              <option value="">Select reason</option>
              {lostReasons.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="label">Next Follow-up</label>
          <input type="datetime-local" className="input text-sm" value={nextFollowup} onChange={(e) => setNextFollowup(e.target.value)} />
        </div>
        <button className="btn-primary btn-sm mt-4" onClick={saveStatus} disabled={saving}>
          {saving ? '⏳' : '💾'} Save
        </button>
      </div>

      {/* Audit chips */}
      {research?.audit_results && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-2">🔍 Presence Audit</h3>
          <AuditChips auditResults={research.audit_results} />
          {research.gaps_found && (
            <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Gaps:</strong> {research.gaps_found}
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-b-2 border-blue-500 text-white' : ''}`}
              style={activeTab !== tab.id ? { color: 'var(--text-secondary)' } : {}}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3">Contact Info</h3>
                <div className="flex flex-col gap-2 text-sm">
                  {[
                    ['📱 Phone', lead.phone],
                    ['💬 WhatsApp', lead.whatsapp_number],
                    ['🌐 Website', lead.website],
                    ['📸 Instagram', lead.instagram],
                    ['👤 Facebook', lead.facebook],
                    ['📍 Address', lead.address],
                    ['🏷️ Source', lead.source],
                    ['⭐ Rating', lead.rating ? `${lead.rating} (${lead.review_count} reviews)` : ''],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span style={{ color: 'var(--text-muted)', minWidth: '120px' }}>{k}</span>
                      <span className="text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {research && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-3">🤖 AI Research</h3>
                  <div className="flex flex-col gap-3 text-sm">
                    {research.owner_name && research.owner_name !== 'unknown' && (
                      <div><span style={{ color: 'var(--text-muted)' }}>Owner: </span><span className="text-white">{research.owner_name}</span></div>
                    )}
                    {research.summary && <p style={{ color: 'var(--text-secondary)' }}>{research.summary}</p>}
                    {research.opportunity_summary && (
                      <div className="rounded-xl p-3" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <p className="text-sm" style={{ color: 'var(--brand-400)' }}>{research.opportunity_summary}</p>
                      </div>
                    )}
                    {research.recommended_service_id && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Recommended: </span>
                        <span className="badge-blue">
                          {services.find((s) => s.id === research.recommended_service_id)?.name ?? research.recommended_service_id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pitch */}
          {activeTab === 'pitch' && (
            <div className="flex flex-col gap-4">
              {/* Pitch controls */}
              <div className="card flex flex-wrap gap-3 items-end">
                <div className="form-group">
                  <label className="label">Service</label>
                  <select className="select text-sm" value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
                    {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Language</label>
                  <select className="select text-sm" value={pitchLanguage} onChange={(e) => setPitchLanguage(e.target.value as typeof pitchLanguage)}>
                    <option value="english">English</option>
                    <option value="malayalam">Malayalam</option>
                    <option value="manglish">Manglish</option>
                  </select>
                </div>
                <button className="btn-primary btn-sm" onClick={() => generate('pitch')} disabled={!!generating}>
                  {generating === 'pitch' ? '⏳ Generating...' : '✨ Generate New Pitch'}
                </button>
              </div>

              {pitches.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✍️</div>
                  <p style={{ color: 'var(--text-secondary)' }}>No pitches yet — generate one above</p>
                </div>
              ) : (
                pitches.map((pitch) => (
                  <div key={pitch.id} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="badge-purple text-xs">v{pitch.version}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {services.find((s) => s.id === pitch.service_id)?.name}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(pitch.generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {canEdit && (
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => {
                            if (editingPitch === pitch.id) {
                              setEditingPitch(null);
                            } else {
                              setEditingPitch(pitch.id);
                              setEditPitchText(pitch.message_text);
                            }
                          }}
                        >
                          {editingPitch === pitch.id ? 'Cancel' : '✏️ Edit'}
                        </button>
                      )}
                    </div>

                    {editingPitch === pitch.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          className="textarea"
                          value={editPitchText}
                          onChange={(e) => setEditPitchText(e.target.value)}
                          rows={5}
                        />
                        <div className="flex gap-2">
                          <button className="btn-primary btn-sm" onClick={() => savePitchEdit(pitch.id)}>Save</button>
                          <button className="btn-secondary btn-sm" onClick={() => setEditingPitch(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                          {pitch.message_text}
                        </p>
                        {pitch.wa_link && (
                          <a
                            href={pitch.wa_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-wa btn-sm mt-4 inline-flex"
                            onClick={async () => {
                              // Log as sent
                              await fetch(`/api/leads/${lead.id}/messages`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ direction: 'sent', message_text: pitch.message_text }),
                              });
                            }}
                          >
                            📱 Send on WhatsApp
                          </a>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Call Note */}
          {activeTab === 'call' && (
            callNote ? (
              <div className="flex flex-col gap-4">
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-2">📋 Brief</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{callNote.call_prep_note}</p>
                </div>
                {callNote.opening_lines && (
                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-2">💬 Opening Lines</h3>
                    <div className="flex flex-col gap-2">
                      {callNote.opening_lines.split('\n').filter(Boolean).map((line, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="badge-blue shrink-0">{i + 1}</span>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{line}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {callNote.objection_handlers && (
                  <div className="card">
                    <h3 className="text-sm font-semibold text-white mb-2">🛡️ Objection Handlers</h3>
                    <div className="flex flex-col gap-4">
                      {callNote.objection_handlers.split('\n\n').filter(Boolean).map((block, i) => {
                        const [q, ...a] = block.split('\n');
                        return (
                          <div key={i}>
                            <p className="text-sm font-medium text-white">{q}</p>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{a.join('\n')}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📞</div>
                <p style={{ color: 'var(--text-secondary)' }}>Generate a call note to see it here</p>
                <button className="btn-primary" onClick={() => generate('call_note')} disabled={!!generating}>
                  {generating === 'call_note' ? '⏳ Generating...' : 'Generate Call Note'}
                </button>
              </div>
            )
          )}

          {/* Messages */}
          {activeTab === 'messages' && (
            <div className="flex flex-col gap-4">
              <div className="card">
                <MessageThread messages={messages} />
              </div>

              {/* Log reply */}
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-3">📥 Log a Reply</h3>
                <textarea
                  className="textarea"
                  placeholder="Paste the lead's WhatsApp reply here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                />
                <button
                  className="btn-primary btn-sm mt-2"
                  onClick={logReply}
                  disabled={saving || !replyText.trim()}
                >
                  {saving ? '⏳ Logging...' : '📥 Log Reply & Classify'}
                </button>

                {classificationResult && (
                  <div className="mt-4 rounded-xl p-4 animate-fade-in"
                    style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`badge-${classificationResult.classification === 'interested' ? 'green' : classificationResult.classification === 'objection' ? 'yellow' : 'red'}`}>
                        {classificationResult.classification}
                      </span>
                      <span className="text-xs font-semibold text-white">AI Classification</span>
                    </div>
                    {classificationResult.suggested_next && (
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Suggested next message:</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{classificationResult.suggested_next}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity */}
          {activeTab === 'activity' && (
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4">Activity Timeline</h3>
              <div className="flex flex-col gap-3">
                {activity.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No activity recorded yet</p>
                ) : (
                  [...activity].reverse().map((act) => (
                    <div key={act.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                          style={{ background: 'var(--brand-500)' }} />
                        <div className="w-px flex-1 mt-1" style={{ background: 'var(--border)' }} />
                      </div>
                      <div className="pb-4">
                        <p className="text-sm text-white">{act.content}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {new Date(act.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
