'use client';

import Link from 'next/link';
import { ShieldX, ArrowLeft, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-900/30 text-red-500">
          <ShieldX className="h-10 w-10" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-white">Access Denied</h1>
        <p className="mb-6 text-slate-400">
          You don't have permission to access the admin portal. This area is restricted to organization administrators and staff.
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back Home
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          If you believe this is an error, please contact your organization administrator.
        </p>
      </div>
    </div>
  );
}
