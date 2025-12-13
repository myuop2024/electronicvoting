'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-900/30 text-red-500">
          <ShieldAlert className="h-10 w-10" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-white">Restricted Area</h1>
        <p className="mb-6 text-slate-400">
          Access to the Super Admin portal is restricted to platform administrators only. This access attempt has been logged.
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:from-purple-500 hover:to-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Safety
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        <div className="mt-8 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-left">
          <p className="text-xs text-amber-400">
            <strong>Security Notice:</strong> All unauthorized access attempts are monitored and logged. If you require administrative access, please contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
