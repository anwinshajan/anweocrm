'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  initialData: Record<string, string>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function BrandClient({ initialData }: Props) {
  // Use a single key 'full_knowledge' for the entire company data
  const [knowledge, setKnowledge] = useState(initialData['full_knowledge'] || '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [confusionPopup, setConfusionPopup] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function saveKnowledge(val: string = knowledge) {
    setSaving(true);
    try {
      const res = await fetch('/api/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'full_knowledge', value: val }),
      });
      if (!res.ok) throw new Error();
      showToast('Knowledge Base saved');
      
      // Evaluate if AI is confused
      const evalRes = await fetch('/api/brand/evaluate', { method: 'POST' });
      const evalData = await evalRes.json();
      if (evalData.success && evalData.data.isConfused) {
        setConfusionPopup(evalData.data.reason);
      }
      
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function sendChatMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setChatLoading(true);

    try {
      const res = await fetch('/api/brand/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg,
          history: messages 
        }),
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Chat failed');
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      showToast(err.message || 'Failed to communicate with AI', 'error');
      // Remove the user message if it failed
      setMessages(messages);
    } finally {
      setChatLoading(false);
    }
  }

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  return (
    <div className="p-6 md:p-10 animate-fade-in max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col relative">
      {/* Confusion Popup Modal */}
      {confusionPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card-glass border border-orange-500/30 p-8 max-w-md w-full shadow-2xl relative">
            <div className="absolute -top-6 -right-6 text-6xl drop-shadow-xl">🤔</div>
            <h3 className="text-xl font-bold text-orange-400 mb-2 flex items-center gap-2">
              <span>⚠️</span> The AI is a bit confused...
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
              Based on what you just saved, the AI isn't sure it has enough context to write a perfect pitch. Here's what it said:
            </p>
            <div className="bg-black/30 p-4 rounded-xl border border-orange-500/20 mb-6 text-sm text-[var(--text-primary)] italic">
              "{confusionPopup}"
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => setConfusionPopup(null)} 
                className="btn-primary bg-orange-500 hover:bg-orange-600 border-none"
              >
                I'll add more details
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type} absolute top-4 right-4 z-50`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
          Brand Knowledge Base
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Provide all details about your company here. The AI will use this to write pitches and emails. Chat with the AI to refine your data!
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Left Side: Single Text Box */}
        <div className="flex-1 flex flex-col card-glass p-0 border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-2)]">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🏢</span> Company Data
            </h2>
            <button
              onClick={() => saveKnowledge()}
              disabled={saving}
              className="btn-primary text-xs py-1.5 px-4"
            >
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
          
          <textarea
            className="flex-1 w-full p-6 bg-transparent text-[var(--text-primary)] focus:outline-none resize-none leading-relaxed"
            placeholder="Enter everything the AI needs to know about your brand...&#10;&#10;e.g.&#10;- Company Name: Anweo Marketing&#10;- Target Audience: Local retail shops&#10;- Tone of Voice: Professional and urgent&#10;- Unique Offer: We guarantee 10 leads or your money back."
            value={knowledge}
            onChange={(e) => setKnowledge(e.target.value)}
            onBlur={(e) => {
              if (e.target.value !== initialData['full_knowledge']) {
                saveKnowledge(e.target.value);
              }
            }}
          />
        </div>

        {/* Right Side: AI Chat */}
        <div className="flex-1 lg:max-w-md flex flex-col card-glass p-0 border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-2)]">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-blue-400">✨</span> Chat with AI
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Ask the AI if it understands your brand, or ask for suggestions to improve your knowledge base.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
            {messages.length === 0 ? (
              <div className="text-center mt-10 opacity-50">
                <div className="text-4xl mb-3">👋</div>
                <p className="text-sm">Hi! I'm your AI CRM Assistant.</p>
                <p className="text-xs mt-1">Ask me anything about your brand data!</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-[var(--surface-3)] text-[var(--text-primary)] rounded-bl-none border border-[var(--border)]'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-[var(--surface-3)] text-[var(--text-primary)] rounded-2xl rounded-bl-none px-4 py-3 text-sm border border-[var(--border)]">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={sendChatMessage} className="p-3 border-t border-[var(--border)] bg-[var(--surface-2)]">
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1 text-sm bg-black/30"
                placeholder="Ask the AI a question..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={chatLoading}
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim() || chatLoading}
                className="btn-primary px-4 flex items-center justify-center"
              >
                ↑
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
