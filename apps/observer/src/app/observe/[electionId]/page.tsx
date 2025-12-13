'use client';

import { use, useEffect, useState } from 'react';
import { Shield, Activity, Search, Eye, Lock, CheckCircle2, AlertCircle, TrendingUp, Users, FileCheck } from 'lucide-react';
import { TurnoutChart } from '@/components/observer/TurnoutChart';
import { BlockchainTimeline } from '@/components/observer/BlockchainTimeline';
import { ProofVerifier } from '@/components/observer/ProofVerifier';
import { CommitmentSearch } from '@/components/observer/CommitmentSearch';

interface ElectionData {
  id: string;
  name: string;
  status: 'active' | 'closed';
  totalEligible: number;
  totalVoted: number;
  turnoutPercent: number;
  contests: Array<{
    id: string;
    title: string;
    options: Array<{ id: string; name: string; votes?: number }>;
  }>;
  zkProof?: {
    valid: boolean;
    tallyProof: string;
  };
  blockchainStats: {
    totalBlocks: number;
    totalCommitments: number;
    lastBlockTime: string;
  };
}

export default function ElectionObservePage({ params }: { params: Promise<{ electionId: string }> }) {
  const resolvedParams = use(params);
  const { electionId } = resolvedParams;

  const [election, setElection] = useState<ElectionData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'blockchain' | 'proofs' | 'search'>('overview');

  useEffect(() => {
    // Fetch election data
    // In production, this would call /api/v1/elections/{electionId}/observer
    const mockData: ElectionData = {
      id: electionId,
      name: 'National Board Election 2025',
      status: 'active',
      totalEligible: 5000,
      totalVoted: 2847,
      turnoutPercent: 56.94,
      contests: [
        {
          id: 'c1',
          title: 'Board President',
          options: [
            { id: 'o1', name: 'Alice Johnson', votes: 1234 },
            { id: 'o2', name: 'Bob Smith', votes: 987 },
            { id: 'o3', name: 'Carol Williams', votes: 626 },
          ],
        },
      ],
      zkProof: {
        valid: true,
        tallyProof: 'groth16:0xabc123...',
      },
      blockchainStats: {
        totalBlocks: 324,
        totalCommitments: 2847,
        lastBlockTime: new Date().toISOString(),
      },
    };

    setElection(mockData);
  }, [electionId]);

  if (!election) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading election data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Eye className="h-6 w-6 text-blue-400" />
              <div>
                <h1 className="text-lg font-semibold text-white">{election.name}</h1>
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      election.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-700 text-gray-400'
                    }`}
                  >
                    <Activity className="h-3 w-3" />
                    {election.status === 'active' ? 'Live' : 'Closed'}
                  </span>
                  <span className="text-gray-400">ID: {election.id}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href="/"
                className="px-4 py-2 text-gray-300 hover:text-white transition"
              >
                Home
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b border-white/10 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-dark rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Users className="h-4 w-4" />
                Turnout
              </div>
              <div className="text-3xl font-bold text-white">{election.turnoutPercent}%</div>
              <div className="text-sm text-gray-400 mt-1">
                {election.totalVoted.toLocaleString()} / {election.totalEligible.toLocaleString()} voted
              </div>
            </div>

            <div className="glass-dark rounded-xl p-4 border border-green-500/20">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Shield className="h-4 w-4" />
                Blockchain
              </div>
              <div className="text-3xl font-bold text-white">
                {election.blockchainStats.totalBlocks}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {election.blockchainStats.totalCommitments.toLocaleString()} commitments
              </div>
            </div>

            <div className="glass-dark rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Lock className="h-4 w-4" />
                ZK Proofs
              </div>
              <div className="flex items-center gap-2">
                {election.zkProof?.valid ? (
                  <>
                    <CheckCircle2 className="h-8 w-8 text-green-400" />
                    <span className="text-2xl font-bold text-white">Valid</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-8 w-8 text-yellow-400" />
                    <span className="text-2xl font-bold text-white">Pending</span>
                  </>
                )}
              </div>
              <div className="text-sm text-gray-400 mt-1">Cryptographically verified</div>
            </div>

            <div className="glass-dark rounded-xl p-4 border border-orange-500/20">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <FileCheck className="h-4 w-4" />
                Mix-Net
              </div>
              <div className="text-3xl font-bold text-white">5/5</div>
              <div className="text-sm text-gray-400 mt-1">Nodes operational</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/10 bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'blockchain', label: 'Blockchain', icon: Shield },
              { id: 'proofs', label: 'ZK Proofs', icon: Lock },
              { id: 'search', label: 'Search', icon: Search },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Turnout Chart */}
            <div className="glass-dark rounded-2xl p-6 border border-slate-700/30">
              <h2 className="text-2xl font-bold text-white mb-6">Live Turnout</h2>
              <TurnoutChart electionId={election.id} />
            </div>

            {/* Results (if closed) */}
            {election.status === 'closed' && (
              <div className="glass-dark rounded-2xl p-6 border border-slate-700/30">
                <h2 className="text-2xl font-bold text-white mb-6">Results</h2>
                {election.contests.map((contest) => (
                  <div key={contest.id} className="mb-6 last:mb-0">
                    <h3 className="text-xl font-semibold text-white mb-4">{contest.title}</h3>
                    <div className="space-y-3">
                      {contest.options.map((option) => {
                        const total = contest.options.reduce((sum, o) => sum + (o.votes || 0), 0);
                        const percent = total > 0 ? ((option.votes || 0) / total) * 100 : 0;

                        return (
                          <div key={option.id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-white font-medium">{option.name}</span>
                              <span className="text-gray-400">
                                {(option.votes || 0).toLocaleString()} votes ({percent.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'blockchain' && (
          <div className="space-y-8">
            <BlockchainTimeline electionId={election.id} />

            <div className="glass-dark rounded-2xl p-6 border border-slate-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">Hyperledger Explorer</h2>
              <p className="text-gray-400 mb-6">
                Browse the complete blockchain ledger for this election.
              </p>
              <iframe
                src="/explorer"
                className="w-full h-[600px] rounded-xl border border-slate-700/50"
                title="Blockchain Explorer"
              />
            </div>
          </div>
        )}

        {activeTab === 'proofs' && (
          <div className="space-y-8">
            <ProofVerifier electionId={election.id} />
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-8">
            <CommitmentSearch electionId={election.id} />
          </div>
        )}
      </main>
    </div>
  );
}
