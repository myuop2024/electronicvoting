'use client';

import Link from 'next/link';
import { Vote } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Vote className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            ObserverNet
          </span>
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Secure, transparent elections powered by blockchain technology
        </p>
      </div>
    </div>
  );
}
