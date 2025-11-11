import '../styles/globals.css';
import type { ReactNode } from 'react';
import { Providers } from '../components/Providers';

export const metadata = {
  title: 'ObserverNet Admin Portal',
  description: 'Manage elections, policies, allowlists, and paper ballot ingestion.'
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-slate-950 text-slate-100">
        <Providers>
          <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-8 py-10">
            <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">ObserverNet Admin</h1>
            <nav className="flex gap-4 text-sm text-slate-300">
              <a href="/dashboard" className="hover:text-white">
                Dashboard
              </a>
              <a href="/security" className="hover:text-white">
                Security
              </a>
              <a href="/settings" className="hover:text-white">
                Settings
              </a>
            </nav>
          </header>
            <main className="flex-1 rounded-xl bg-slate-900/60 p-8 shadow-lg">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
