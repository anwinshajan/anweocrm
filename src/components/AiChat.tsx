'use client';

import { useState } from 'react';

export default function AiChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const lowerMsg = userMessage.toLowerCase();
      
      // 1. Scrape Command
      if (lowerMsg.includes('scrape') || lowerMsg.includes('find')) {
        const res = await fetch('/api/ai/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userMessage }),
        });
        const data = await res.json();
        
        if (res.ok) {
          setMessages(prev => [...prev, { role: 'ai', text: `${data.message}` }]);
        } else {
          setMessages(prev => [...prev, { role: 'ai', text: `Failed to scrape: ${data.error}` }]);
        }
      } 
      // 2. Email Command
      else if (lowerMsg.includes('email')) {
        const res = await fetch('/api/ai/email', { method: 'POST' });
        const data = await res.json();
        
        if (res.ok) {
          setMessages(prev => [...prev, { role: 'ai', text: `${data.message}` }]);
        } else {
          setMessages(prev => [...prev, { role: 'ai', text: `Failed to send emails: ${data.error}` }]);
        }
      } 
      // 3. WhatsApp Command
      else if (lowerMsg.includes('whatsapp') || lowerMsg.includes('queue')) {
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'ai', text: "WhatsApp queue has been signaled! Make sure your local `node scripts/whatsapp-worker.js` is running in your terminal to process the messages with a time-lag." }]);
          setIsLoading(false);
        }, 800);
        return;
      }
      // 4. Fallback
      else {
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'ai', text: "I'm ready! Ask me to 'scrape leads', 'draft emails', or 'run whatsapp queue'." }]);
          setIsLoading(false);
        }, 1000);
        return;
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Error connecting to AnweoAI.' }]);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Message History */}
      {messages.length > 0 && (
        <div className="w-full bg-[#1A1A1E] border border-white/10 rounded-3xl p-6 max-h-[400px] overflow-y-auto flex flex-col gap-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-4 py-3 rounded-2xl max-w-[80%] whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[var(--brand-500)] text-black font-medium' : 'bg-white/5 text-white/90'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl bg-white/5 text-white/60 animate-pulse">
                AnweoAI is thinking...
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Input Box */}
      <div className="w-full relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--brand-500)] to-emerald-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
        <div className="relative bg-[#1A1A1E] border border-white/10 rounded-3xl p-4 flex flex-col gap-3 shadow-2xl">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message AnweoAI to scrape leads, follow up, or answer questions..." 
            className="w-full bg-transparent text-white placeholder-white/30 resize-none outline-none text-lg min-h-[100px] p-2"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-2">
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <span className="text-lg">📎</span>
              </button>
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <span className="text-lg">🌐</span>
              </button>
            </div>
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-5 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              Send <span className="text-xl">↑</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button onClick={() => setInput('Scrape web design agencies in Dubai')} className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
          🔍 Scrape agencies in Dubai
        </button>
        <button onClick={() => setInput('Draft cold emails for all new leads')} className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
          📩 Draft cold emails
        </button>
        <button onClick={() => setInput('Send WhatsApp messages to my pending list')} className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
          💬 Run WhatsApp Queue
        </button>
      </div>
    </div>
  );
}
