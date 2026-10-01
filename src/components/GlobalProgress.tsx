'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * GlobalProgress — slim top-bar progress indicator that fires on every
 * route transition. Works without any external deps.
 */
export default function GlobalProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRoute = useRef(pathname + searchParams.toString());

  // Whenever the route changes, run the progress animation
  useEffect(() => {
    const current = pathname + searchParams.toString();
    if (current === prevRoute.current) return;
    prevRoute.current = current;

    // Route changed — reset and animate to near-complete
    setVisible(true);
    setProgress(10);

    if (timerRef.current) clearInterval(timerRef.current);

    // Quickly advance to 80%, then slow down
    let p = 10;
    timerRef.current = setInterval(() => {
      p = p < 70 ? p + 8 : p < 85 ? p + 2 : p + 0.5;
      if (p >= 90) {
        clearInterval(timerRef.current!);
        p = 90;
      }
      setProgress(p);
    }, 80);

    // Complete after a brief moment (page has rendered)
    const completeTimer = setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }, 600);

    return () => {
      clearInterval(timerRef.current!);
      clearTimeout(completeTimer);
    };
  }, [pathname, searchParams]);

  if (!visible && progress === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height: '3px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #b8ff33, #cbf851, #90cc14)',
          boxShadow: '0 0 10px rgba(184, 255, 51, 0.8), 0 0 4px rgba(184, 255, 51, 0.5)',
          borderRadius: '0 2px 2px 0',
          transition: 'width 0.15s ease-out, opacity 0.3s ease',
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
