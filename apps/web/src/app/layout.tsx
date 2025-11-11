import '../styles/globals.css';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from '../i18n/request';

export const metadata = {
  title: 'ObserverNet Elections',
  description: 'Transparent, verifiable online elections for observation networks.'
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const messages = await getMessages();
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-slate-50 text-slate-900">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
