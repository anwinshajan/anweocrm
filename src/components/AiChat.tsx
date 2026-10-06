'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
      // 4. Default AI Chat Query (Reports, Questions, etc.)
      else {
        // Prepare message history for the API
        const apiMessages = [...messages, { role: 'user', text: userMessage }].map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text
        }));

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages }),
        });
        
        const data = await res.json();
        
        if (res.ok) {
          const aiText = data.data?.reply || data.reply || data.message || "No response received.";
          setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
        } else {
          setMessages(prev => [...prev, { role: 'ai', text: `Connection Error: ${data.error || 'Unknown Error'}` }]);
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'ai', text: `System Error: ${e.message}` }]);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="w-full flex flex-col gap-4 transition-all duration-500">
      {/* Message History */}
      {messages.length > 0 && (
        <div className="w-full bg-[#1A1A1E] border border-white/10 rounded-3xl p-6 h-[65vh] max-h-[800px] overflow-y-auto flex flex-col gap-6 shadow-2xl">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-5 py-4 rounded-2xl max-w-[85%] overflow-x-auto ${msg.role === 'user' ? 'bg-[var(--brand-500)] text-black font-medium whitespace-pre-wrap' : 'bg-white/5 text-white/90 border border-white/5 shadow-lg'}`}>
                {msg.role === 'user' ? (
                  msg.text
                ) : (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({node, ...props}) => <table className="w-full text-sm text-left border-collapse my-4" {...props} />,
                      thead: ({node, ...props}) => <thead className="bg-white/10 text-white font-semibold uppercase text-xs tracking-wider" {...props} />,
                      th: ({node, ...props}) => <th className="px-4 py-3 border border-white/10" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-3 border border-white/5 bg-white/5" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-white" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 text-white" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2 text-emerald-400" {...props} />,
                      p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-[var(--brand-400)]" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 mb-4 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-5 mb-4 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="pl-1" {...props} />,
                      hr: ({node, ...props}) => <hr className="my-5 border-white/10" {...props} />,
                      code: ({node, className, children, ...props}) => {
                        const match = /language-(\w+)/.exec(className || '');
                        return !match ? (
                          <code className="bg-black/30 text-[var(--brand-400)] px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>
                        ) : (
                          <pre className="bg-black/50 p-4 rounded-xl overflow-x-auto border border-white/10 my-4 text-sm font-mono text-emerald-300 shadow-inner">
                            <code className={className} {...props}>{children}</code>
                          </pre>
                        )
                      }
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="px-5 py-4 rounded-2xl bg-white/5 text-white/60 animate-pulse border border-white/5">
                AnweoAI is thinking...
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Input Box */}
      <div className="w-full relative group mt-2">
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

      {/* Quick Prompts - Hide when conversation starts */}
      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 animate-fade-in">
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
      )}
    </div>
  );
}
