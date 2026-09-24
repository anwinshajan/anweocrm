import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anweo CRM — Digital Marketing Agency',
  description: 'Internal CRM for Anweo — AI-powered lead management and WhatsApp outreach',
  robots: 'noindex, nofollow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
