'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Vote,
  Clock,
  Users,
  CheckCircle2,
  Shield,
  MessageSquare,
  Globe,
  Calendar,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button, Card, Badge, Progress } from '@electronicvoting/ui';

interface ElectionLandingProps {
  election: {
    id: string;
    name: string;
    description: string;
    orgName: string;
    orgLogoUrl: string | null;
    primaryColor: string;
    heroImageUrl: string | null;
    votingStartAt: string;
    votingEndAt: string;
    status: string;
    verificationMode: string;
    allowChannels: string[];
    languages: string[];
    contestCount: number;
    voterCount: number;
    votescast: number;
  };
}

export function ElectionLanding({ election }: ElectionLandingProps) {
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const turnoutPercentage = Math.round((election.votescast / election.voterCount) * 100);
  const isOpen = election.status === 'VOTING_OPEN';
  const endDate = new Date(election.votingEndAt);
  const now = new Date();
  const timeRemaining = endDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Would navigate to verification/vote flow
    window.location.href = `/e/${election.id}/vote?code=${accessCode}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header
        className="relative overflow-hidden py-12 sm:py-16 lg:py-20"
        style={{
          background: `linear-gradient(135deg, ${election.primaryColor} 0%, ${election.primaryColor}dd 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          {/* Org Info */}
          <div className="mb-6 flex items-center justify-center gap-3">
            {election.orgLogoUrl ? (
              <img
                src={election.orgLogoUrl}
                alt={election.orgName}
                className="h-10 w-10 rounded-lg bg-white p-1"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <Vote className="h-5 w-5 text-white" />
              </div>
            )}
            <span className="text-sm font-medium text-white/90">{election.orgName}</span>
          </div>

          <h1 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            {election.name}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/80 sm:text-lg">
            {election.description}
          </p>

          {/* Status Badge */}
          <div className="mt-6 flex items-center justify-center gap-3">
            {isOpen ? (
              <Badge variant="success" className="bg-emerald-500 text-white">
                <span className="mr-1.5 h-2 w-2 animate-pulse rounded-full bg-white" />
                Voting Open
              </Badge>
            ) : (
              <Badge variant="secondary">{election.status}</Badge>
            )}
            {daysRemaining > 0 && isOpen && (
              <Badge variant="outline" className="border-white/30 text-white">
                <Clock className="mr-1 h-3.5 w-3.5" />
                {daysRemaining} days left
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto -mt-8 max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Join Card */}
          <div className="lg:col-span-2">
            <Card className="p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {isOpen ? 'Cast Your Vote' : 'Election Information'}
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                {isOpen
                  ? 'Enter your access code to begin the voting process. Your vote is secure and verifiable.'
                  : 'This election is currently not accepting votes.'}
              </p>

              {isOpen && (
                <form onSubmit={handleJoin} className="mt-6">
                  <div>
                    <label
                      htmlFor="accessCode"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Access Code
                    </label>
                    <input
                      type="text"
                      id="accessCode"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                      placeholder="Enter your access code"
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center font-mono text-lg tracking-widest placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                      maxLength={12}
                    />
                    <p className="mt-2 text-sm text-slate-500">
                      Your access code was sent via email or SMS
                    </p>
                  </div>
                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    loading={isLoading}
                    className="mt-4"
                    style={{ backgroundColor: election.primaryColor }}
                  >
                    Continue to Vote
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              )}

              {/* Alternative Access */}
              <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Other ways to access:
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {election.allowChannels.includes('whatsapp') && (
                    <a
                      href={`https://wa.me/15551234567?text=VOTE%20${election.id}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                    >
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      Vote via WhatsApp
                    </a>
                  )}
                  <Link
                    href={`/e/${election.id}/verify`}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                  >
                    <Shield className="h-4 w-4 text-blue-600" />
                    Verify with Didit
                  </Link>
                </div>
              </div>
            </Card>

            {/* Election Details */}
            <Card className="mt-6 p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Election Details
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Voting Period
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(election.votingStartAt).toLocaleDateString()} -{' '}
                      {endDate.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <Vote className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Contests
                    </p>
                    <p className="text-sm text-slate-500">
                      {election.contestCount} positions to vote on
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Verification
                    </p>
                    <p className="text-sm text-slate-500">
                      {election.verificationMode === 'HYBRID'
                        ? 'Code + Identity'
                        : election.verificationMode}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Languages
                    </p>
                    <p className="text-sm text-slate-500">
                      {election.languages.join(', ').toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Turnout Card */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                  Voter Turnout
                </h3>
                <Users className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-4">
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    {turnoutPercentage}%
                  </span>
                  <span className="text-sm text-slate-500">
                    {election.votescast.toLocaleString()} / {election.voterCount.toLocaleString()}
                  </span>
                </div>
                <Progress value={turnoutPercentage} className="mt-3" />
              </div>
            </Card>

            {/* Security Info */}
            <Card className="p-5">
              <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                <Shield className="h-4 w-4 text-blue-600" />
                Security Features
              </h3>
              <ul className="mt-4 space-y-3">
                {[
                  'End-to-end encrypted',
                  'Blockchain verified',
                  'Anonymous ballot',
                  'Tamper-evident',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Help */}
            <Card className="p-5">
              <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                <Info className="h-4 w-4 text-blue-600" />
                Need Help?
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Contact the election administrator if you have questions or issues with your access code.
              </p>
              <a
                href="/help"
                className="mt-3 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View Help Center
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          <p>
            Powered by{' '}
            <a href="/" className="font-medium text-blue-600 hover:text-blue-700">
              ObserverNet
            </a>{' '}
            - Transparent, Verifiable Elections
          </p>
        </div>
      </footer>
    </div>
  );
}
