'use client';

import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white">
              ObserverNet
            </span>
            <span className="ml-2 rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-400">
              Admin
            </span>
          </div>
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Organization administration portal
        </p>
      </div>
    </div>
  );
}
