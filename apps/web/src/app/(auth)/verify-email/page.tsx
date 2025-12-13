'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Verification failed');
        }

        setStatus('success');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setStatus('error');
      }
    };

    verifyEmail();
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
          Verifying your email
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Please wait while we verify your email address...
        </p>
      </div>
    );
  }

  if (status === 'no-token') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <Mail className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Check your email
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          We've sent you a verification link. Please click the link in your email to verify your account.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Didn't receive the email?{' '}
          <button className="text-blue-600 hover:underline">
            Resend verification email
          </button>
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow transition-all hover:bg-blue-700"
        >
          Continue to sign in
        </Link>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Email verified
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Your email has been successfully verified. You can now access all features of your account.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow transition-all hover:bg-blue-700"
        >
          Sign in to your account
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Verification failed
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        {error || 'This verification link is invalid or has expired.'}
      </p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <button className="text-blue-600 hover:underline">
          Resend verification email
        </button>
        <Link
          href="/login"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
        <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
