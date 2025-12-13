'use client';

import { Shield, CheckCircle2, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Block {
  number: number;
  hash: string;
  timestamp: string;
  commitments: number;
  txCount: number;
}

export function BlockchainTimeline({ electionId }: { electionId: string }) {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    // Mock blockchain data - in production, fetch from Fabric
    const mockBlocks: Block[] = Array.from({ length: 10 }, (_, i) => ({
      number: 324 - i,
      hash: `0x${Math.random().toString(16).slice(2, 18)}...`,
      timestamp: new Date(Date.now() - i * 120000).toISOString(),
      commitments: Math.floor(Math.random() * 20) + 5,
      txCount: Math.floor(Math.random() * 30) + 10,
    }));

    setBlocks(mockBlocks);
  }, [electionId]);

  return (
    <div className="glass-dark rounded-2xl p-6 border border-slate-700/30">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-400" />
          Blockchain Timeline
        </h2>
        <span className="text-sm text-gray-400">Latest {blocks.length} blocks</span>
      </div>

      <div className="space-y-4">
        {blocks.map((block, idx) => (
          <div
            key={block.number}
            className="relative border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/30 transition group"
          >
            {/* Timeline connector */}
            {idx < blocks.length - 1 && (
              <div className="absolute left-6 top-full h-4 w-0.5 bg-slate-700 group-hover:bg-blue-500/30 transition" />
            )}

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-blue-400" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-white font-semibold">Block #{block.number}</h3>
                    <code className="text-xs text-gray-400 font-mono">{block.hash}</code>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {new Date(block.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-400">Ballot Commitments</p>
                    <p className="text-lg font-semibold text-white">{block.commitments}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total Transactions</p>
                    <p className="text-lg font-semibold text-white">{block.txCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <button className="px-6 py-2 rounded-lg border border-slate-700/50 hover:border-blue-500/50 text-gray-400 hover:text-white transition">
          Load More Blocks
        </button>
      </div>
    </div>
  );
}
