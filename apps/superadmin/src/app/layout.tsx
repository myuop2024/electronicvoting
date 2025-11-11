import '../styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'ObserverNet Super Admin',
  description: 'Operate Fabric clusters, provider integrations, and security automation.'
};

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-slate-100 text-slate-900">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-10 py-10">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">ObserverNet Operations</h1>
              <p className="text-sm text-slate-500">Fabric health, provider onboarding, and AI governance.</p>
            </div>
            <nav className="flex gap-4 text-sm">
              <a href="/fabric" className="font-medium text-blue-600">
                Fabric Control
              </a>
              <a href="/providers" className="font-medium text-blue-600">
                Providers
              </a>
              <a href="/security" className="font-medium text-blue-600">
                Security
              </a>
            </nav>
          </header>
          <main className="flex-1 rounded-xl bg-white p-8 shadow-lg">{children}</main>
        </div>
      </body>
    </html>
  );
}
