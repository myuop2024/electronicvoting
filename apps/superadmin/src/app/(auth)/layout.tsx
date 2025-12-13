'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30">
            <Shield className="h-7 w-7" />
          </div>
          <div className="text-center">
            <span className="text-2xl font-bold text-white">
              ObserverNet
            </span>
            <div className="mt-1">
              <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
                Super Admin
              </span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-purple-900/50 bg-slate-900/80 p-8 shadow-xl backdrop-blur-sm">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Platform-wide administration and monitoring
        </p>
      </div>
    </div>
  );
}
