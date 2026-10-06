import type { Metadata } from 'next';
import './globals.css';
import { Suspense } from 'react';
import GlobalProgress from '@/components/GlobalProgress';

export const metadata: Metadata = {
  title: 'Anweo CRM — Digital Marketing Agency',
  description: 'Internal CRM for Anweo — AI-powered lead management and WhatsApp outreach',
  robots: 'noindex, nofollow',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Suspense fallback={null}>
          <GlobalProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
