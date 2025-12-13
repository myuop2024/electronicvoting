'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        mfaCode: showMfa ? mfaCode : undefined,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'MFA_REQUIRED') {
          setShowMfa(true);
          setError('');
        } else {
          setError(result.error);
        }
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white">
          Admin Portal
        </h1>
        <p className="mt-1 text-slate-400">
          Sign in to manage your organization
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-300">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@organization.com"
              required
              disabled={loading}
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-3 text-sm text-white transition-colors placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-10 text-sm text-white transition-colors placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {showMfa && (
          <div>
            <label htmlFor="mfaCode" className="mb-1.5 block text-sm font-medium text-slate-300">
              Two-Factor Code
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                id="mfaCode"
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="Enter 6-digit code"
                required
                disabled={loading}
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-3 text-sm tracking-widest text-white transition-colors placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Enter the code from your authenticator app
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-400">Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow transition-all hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing in...
            </>
          ) : (
            'Sign in to Admin Portal'
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-800 pt-4">
        <p className="text-center text-sm text-slate-500">
          Need access?{' '}
          <Link href="mailto:support@observernet.com" className="text-indigo-400 hover:text-indigo-300">
            Contact your organization admin
          </Link>
        </p>
      </div>
    </div>
  );
}
