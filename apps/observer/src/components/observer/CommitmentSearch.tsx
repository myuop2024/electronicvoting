'use client';

import { useState } from 'react';
import { Search, CheckCircle2, XCircle, Shield, Calendar, Hash } from 'lucide-react';

interface SearchResult {
  found: boolean;
  commitmentHash: string;
  electionId: string;
  electionName: string;
  submittedAt: string;
  fabricTxId: string;
  fabricBlockNum: number;
  status: string;
}

export function CommitmentSearch({ electionId }: { electionId: string }) {
  const [searchHash, setSearchHash] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchHash) return;

    setIsSearching(true);

    // Simulate API call to /api/v1/voting/verify
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock search result
    const mockResult: SearchResult = {
      found: Math.random() > 0.3,
      commitmentHash: searchHash,
      electionId: electionId,
      electionName: 'National Board Election 2025',
      submittedAt: new Date().toISOString(),
      fabricTxId: `0x${Math.random().toString(16).slice(2, 18)}`,
      fabricBlockNum: Math.floor(Math.random() * 100) + 200,
      status: 'confirmed',
    };

    setResult(mockResult);
    setIsSearching(false);
  };

  return (
    <div className="space-y-6">
      <div className="glass-dark rounded-2xl p-6 border border-slate-700/30">
        <div className="flex items-center gap-2 mb-6">
          <Search className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Commitment Search</h2>
        </div>

        <p className="text-gray-400 mb-6">
          Search for any ballot commitment hash to verify it was recorded on the blockchain.
        </p>

        <div className="flex gap-3">
          <input
            type="text"
            value={searchHash}
            onChange={(e) => setSearchHash(e.target.value)}
            placeholder="Enter commitment hash or receipt code..."
            className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={!searchHash || isSearching}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center gap-2"
          >
            {isSearching ? (
              <>
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Search
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`glass-dark rounded-2xl p-6 border ${
            result.found
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-red-500/30 bg-red-500/5'
          }`}
        >
          <div className="flex items-center gap-3 mb-6">
            {result.found ? (
              <>
                <div className="h-12 w-12 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Ballot Found ✓</h3>
                  <p className="text-sm text-gray-400">Verified on blockchain</p>
                </div>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Not Found</h3>
                  <p className="text-sm text-gray-400">No ballot with this commitment hash</p>
                </div>
              </>
            )}
          </div>

          {result.found && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900/30 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <Calendar className="h-4 w-4" />
                    Submitted At
                  </div>
                  <p className="text-white font-medium">
                    {new Date(result.submittedAt).toLocaleString()}
                  </p>
                </div>

                <div className="p-4 bg-slate-900/30 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <Shield className="h-4 w-4" />
                    Status
                  </div>
                  <span className="inline-flex px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium border border-green-500/30">
                    {result.status}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-900/30 rounded-xl">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <Hash className="h-4 w-4" />
                  Blockchain Transaction
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Transaction ID</p>
                  <code className="block text-sm text-white font-mono break-all">
                    {result.fabricTxId}
                  </code>
                  <p className="text-xs text-gray-400 mt-2">Block Number</p>
                  <code className="block text-sm text-white font-mono">
                    #{result.fabricBlockNum}
                  </code>
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-sm text-blue-400">
                  ✓ This ballot commitment is permanently recorded on the Hyperledger Fabric blockchain
                  and can be independently verified by anyone.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Searches */}
      <div className="glass-dark rounded-2xl p-6 border border-slate-700/30">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Verifications</h3>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg hover:bg-slate-900/50 transition"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <code className="text-sm text-gray-400 font-mono">
                  {Math.random().toString(16).slice(2, 18)}...
                </code>
              </div>
              <span className="text-xs text-gray-500">
                {Math.floor(Math.random() * 60)} min ago
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
