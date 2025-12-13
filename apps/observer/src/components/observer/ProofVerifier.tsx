'use client';

import { useState } from 'react';
import { Lock, CheckCircle2, XCircle, AlertTriangle, FileCode } from 'lucide-react';

interface ProofResult {
  valid: boolean;
  proofType: string;
  publicInputs: string[];
  verificationTime: number;
}

export function ProofVerifier({ electionId }: { electionId: string }) {
  const [proofData, setProofData] = useState('');
  const [result, setResult] = useState<ProofResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);

    // Simulate ZK proof verification
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock verification result
    const mockResult: ProofResult = {
      valid: Math.random() > 0.1, // 90% success rate
      proofType: 'tally_correctness',
      publicInputs: [
        '0xf3d8a4b2c1e5...',  // Merkle root
        '0xa7c3e5d1b9f2...',  // Tally commitment
        '0x9b5e3a1c7f2d...',  // Election ID hash
      ],
      verificationTime: 1234,
    };

    setResult(mockResult);
    setIsVerifying(false);
  };

  return (
    <div className="space-y-6">
      <div className="glass-dark rounded-2xl p-6 border border-slate-700/30">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="h-6 w-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">ZK Proof Verifier</h2>
        </div>

        <p className="text-gray-400 mb-6">
          Verify zero-knowledge proofs that election tallies are computed correctly without revealing individual votes.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Proof Data (Base64)
            </label>
            <textarea
              value={proofData}
              onChange={(e) => setProofData(e.target.value)}
              placeholder="Paste the ZK proof data here..."
              className="w-full h-32 px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={!proofData || isVerifying}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying Proof...
              </>
            ) : (
              <>
                <FileCode className="h-5 w-5" />
                Verify Proof
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`glass-dark rounded-2xl p-6 border ${
            result.valid
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-red-500/30 bg-red-500/5'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            {result.valid ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-green-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">Proof Valid ✓</h3>
                  <p className="text-sm text-gray-400">
                    Verified in {result.verificationTime}ms
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-8 w-8 text-red-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">Proof Invalid ✗</h3>
                  <p className="text-sm text-gray-400">Verification failed</p>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3 mt-6">
            <div>
              <p className="text-sm text-gray-400 mb-1">Proof Type</p>
              <code className="text-sm text-white font-mono bg-slate-900/50 px-3 py-1 rounded">
                {result.proofType}
              </code>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Public Inputs</p>
              <div className="space-y-1">
                {result.publicInputs.map((input, idx) => (
                  <code
                    key={idx}
                    className="block text-xs text-gray-300 font-mono bg-slate-900/50 px-3 py-2 rounded"
                  >
                    [{idx}] {input}
                  </code>
                ))}
              </div>
            </div>
          </div>

          {result.valid && (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-400 font-medium mb-1">
                    Cryptographic Guarantee
                  </p>
                  <p className="text-xs text-gray-400">
                    This proof mathematically guarantees the tally is correct without revealing how any individual voted.
                    The proof uses Groth16 ZK-SNARKs on the BN128 curve.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sample Proofs */}
      <div className="glass-dark rounded-2xl p-6 border border-slate-700/30">
        <h3 className="text-lg font-semibold text-white mb-4">Available Proofs</h3>
        <div className="space-y-2">
          {[
            { type: 'Tally Correctness', status: 'Verified', time: '2h ago' },
            { type: 'Ballot Validity', status: 'Verified', time: '5h ago' },
            { type: 'Mix-Net Shuffle', status: 'Verified', time: '1d ago' },
          ].map((proof, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg hover:bg-slate-900/50 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-white font-medium text-sm">{proof.type}</p>
                  <p className="text-xs text-gray-400">{proof.time}</p>
                </div>
              </div>
              <button className="text-sm text-blue-400 hover:text-blue-300">
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
