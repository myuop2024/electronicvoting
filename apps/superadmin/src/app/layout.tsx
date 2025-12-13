import '../styles/globals.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '../components/Providers';
import { SuperAdminLayout } from '../components/layout';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'Platform Admin | ObserverNet',
    template: '%s | ObserverNet Platform',
  },
  description: 'Operate Fabric clusters, manage organizations, and monitor platform health.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full bg-slate-950 font-sans text-slate-100 antialiased">
        <Providers>
          <SuperAdminLayout>{children}</SuperAdminLayout>
        </Providers>
      </body>
    </html>
  );
}
