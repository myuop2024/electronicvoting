'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  Clock,
  Vote,
  Loader2,
  ArrowRight,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Button, Card, Alert, Input } from '@electronicvoting/ui';
import { PublicHeader } from '../../components/layout/PublicHeader';
import { Footer } from '../../components/layout/Footer';

interface VerificationResult {
  found: boolean;
  commitmentHash: string;
  electionId?: string;
  electionName?: string;
  fabricTxId?: string;
  fabricBlockNum?: number;
  verified?: boolean;
  submittedAt?: string;
  talliedAt?: string;
  channel?: string;
}

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const initialHash = searchParams.get('hash') || '';

  const [hash, setHash] = useState(initialHash);
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hash.trim()) return;

    setIsSearching(true);
    setError(null);
    setResult(null);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock result - would be API call
    if (hash.length >= 10) {
      setResult({
        found: true,
        commitmentHash: hash,
        electionId: 'election-123',
        electionName: 'Annual Board Election 2024',
        fabricTxId: 'fabric-tx-abc123def456',
        fabricBlockNum: 1247,
        verified: true,
        submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        talliedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        channel: 'web',
      });
    } else {
      setResult({
        found: false,
        commitmentHash: hash,
      });
    }

    setIsSearching(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1 bg-slate-50 py-12 dark:bg-slate-950 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
              Verify Your Vote
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600 dark:text-slate-400">
              Enter your commitment hash to verify that your vote was recorded on the blockchain
              and included in the final tally.
            </p>
          </div>

          {/* Search Form */}
          <Card className="mt-10 p-6 sm:p-8">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label
                  htmlFor="hash"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Commitment Hash
                </label>
                <div className="mt-1.5 flex gap-3">
                  <Input
                    id="hash"
                    type="text"
                    value={hash}
                    onChange={(e) => setHash(e.target.value)}
                    placeholder="Enter your commitment hash..."
                    className="font-mono"
                  />
                  <Button type="submit" loading={isSearching}>
                    <Search className="mr-2 h-4 w-4" />
                    Verify
                  </Button>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Your commitment hash was provided when you submitted your ballot.
                </p>
              </div>
            </form>

            {/* Results */}
            {result && (
              <div className="mt-8 border-t border-slate-200 pt-8 dark:border-slate-700">
                {result.found ? (
                  <div className="space-y-6">
                    {/* Success Banner */}
                    <div className="flex items-center gap-4 rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900/20">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                          Vote Verified!
                        </h3>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          Your vote was successfully recorded and verified on the blockchain.
                        </p>
                      </div>
                    </div>

                    {/* Election Info */}
                    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Vote className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {result.electionName}
                        </p>
                        <Link
                          href={`/e/${result.electionId}`}
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View Election Details
                          <ArrowRight className="ml-1 inline h-3 w-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Commitment Hash
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                          <code className="truncate font-mono text-sm text-slate-900 dark:text-slate-100">
                            {result.commitmentHash}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(result.commitmentHash)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Fabric Transaction
                        </label>
                        <p className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">
                          {result.fabricTxId}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Block Number
                        </label>
                        <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                          #{result.fabricBlockNum}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Voting Channel
                        </label>
                        <p className="mt-1 text-sm capitalize text-slate-900 dark:text-slate-100">
                          {result.channel}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Submitted At
                        </label>
                        <p className="mt-1 flex items-center gap-1 text-sm text-slate-900 dark:text-slate-100">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {result.submittedAt && new Date(result.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Status
                        </label>
                        <p className="mt-1 flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          {result.talliedAt ? 'Included in Tally' : 'Pending Tally'}
                        </p>
                      </div>
                    </div>

                    {/* Blockchain Explorer Link */}
                    <div className="flex justify-center">
                      <a
                        href={`https://explorer.example.com/tx/${result.fabricTxId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        View on Blockchain Explorer
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                      <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                      Vote Not Found
                    </h3>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">
                      We couldn't find a vote with this commitment hash. Please check that you entered
                      the hash correctly.
                    </p>
                    <Alert variant="info" className="mt-4">
                      <p className="text-sm">
                        Make sure you're using the exact hash provided when you submitted your ballot.
                        Hashes are case-sensitive.
                      </p>
                    </Alert>
                  </div>
                )}
              </div>
            )}

            {error && (
              <Alert variant="error" className="mt-4">
                {error}
              </Alert>
            )}
          </Card>

          {/* How It Works */}
          <div className="mt-12">
            <h2 className="text-center text-xl font-semibold text-slate-900 dark:text-white">
              How Vote Verification Works
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: Vote,
                  title: 'Submit Your Vote',
                  description: 'When you cast your ballot, a unique cryptographic hash is generated.',
                },
                {
                  icon: Shield,
                  title: 'Blockchain Record',
                  description: 'Your vote is recorded on Hyperledger Fabric with the commitment hash.',
                },
                {
                  icon: CheckCircle2,
                  title: 'Verify Anytime',
                  description: 'Use your hash to confirm your vote was counted in the final results.',
                },
              ].map((step, index) => (
                <Card key={index} className="p-5 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    {step.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-12">
            <h2 className="text-center text-xl font-semibold text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <div className="mt-6 space-y-4">
              {[
                {
                  q: 'Is my vote anonymous?',
                  a: 'Yes. The commitment hash proves your vote was counted without revealing who you voted for or identifying you personally.',
                },
                {
                  q: 'What if I lost my commitment hash?',
                  a: 'Contact the election administrator. They may be able to help you verify your participation through other means.',
                },
                {
                  q: 'Can I change my vote?',
                  a: "This depends on the election's settings. Some elections allow vote changes during the voting period.",
                },
              ].map((faq, index) => (
                <Card key={index} className="p-5">
                  <h3 className="font-medium text-slate-900 dark:text-white">{faq.q}</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{faq.a}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
