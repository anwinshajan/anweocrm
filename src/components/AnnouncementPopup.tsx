'use client';

import { useEffect, useState } from 'react';
import type { Announcement } from '@/lib/types';

export default function AnnouncementPopup() {
  const [unread, setUnread] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch('/api/announcements/unread')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data && data.data.length > 0) {
          setUnread(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = async () => {
    const current = unread[currentIndex];
    
    // Mark read on server
    try {
      await fetch('/api/announcements/unread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [current.id] })
      });
    } catch (e) {}

    // Move to next or close
    if (currentIndex < unread.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setUnread([]);
    }
  };

  if (unread.length === 0) return null;

  const current = unread[currentIndex];
  const isBroadcast = current.to_user === 'all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="card max-w-md w-full shadow-2xl animate-slide-up" style={{ border: '1px solid var(--brand-500)', background: 'var(--surface-2)' }}>
        <div className="flex items-center gap-3 mb-4 border-b border-[var(--border)] pb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-indigo-500/20 text-indigo-400">
            {isBroadcast ? '📢' : '💬'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{isBroadcast ? 'New Announcement' : 'New Message'}</h3>
            <p className="text-xs text-[var(--text-muted)]">{new Date(current.created_at).toLocaleString()}</p>
          </div>
        </div>
        
        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed mb-6">
          {current.message}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)] font-medium">
            {currentIndex + 1} of {unread.length}
          </span>
          <button className="btn-primary" onClick={handleDismiss}>
            {currentIndex < unread.length - 1 ? 'Next' : 'Got it!'}
          </button>
        </div>
      </div>
    </div>
  );
}
