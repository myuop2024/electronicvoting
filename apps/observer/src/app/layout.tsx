import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ObserverNet - Public Blockchain Observer Portal',
  description: 'Verify elections in real-time with zero-knowledge proofs and blockchain transparency',
  keywords: ['blockchain', 'voting', 'elections', 'zero-knowledge', 'verification', 'transparency'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
