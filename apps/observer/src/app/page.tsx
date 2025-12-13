'use client';

import Link from 'next/link';
import { Shield, Eye, Activity, Lock, Search, ArrowRight } from 'lucide-react';

export default function ObserverHome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-xl bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold text-white">ObserverNet</span>
              <span className="text-sm text-blue-400 font-medium">Observer Portal</span>
            </div>
            <div className="flex gap-4">
              <Link
                href="/"
                className="text-gray-300 hover:text-white transition px-3 py-2"
              >
                Main Site
              </Link>
              <Link
                href="/verify"
                className="text-gray-300 hover:text-white transition px-3 py-2"
              >
                Verify Vote
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 cyber-grid opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium mb-6">
              <Eye className="h-4 w-4" />
              Public Verification Portal
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6">
              Observe Elections in
              <span className="block mt-2 gradient-text">Real-Time</span>
            </h1>

            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
              Track every vote commitment on the blockchain. Verify zero-knowledge proofs.
              Monitor turnout live. Complete transparency, unbreakable privacy.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="#explore"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-lg shadow-blue-500/30"
              >
                <Search className="h-5 w-5" />
                Explore Elections
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/20 hover:bg-white/10 text-white font-semibold transition backdrop-blur"
              >
                How It Works
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Live Stats */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Active Elections', value: '24', icon: Activity },
              { label: 'Votes Verified', value: '1.2M', icon: Shield },
              { label: 'Blockchain Blocks', value: '45,892', icon: Lock },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass-dark rounded-2xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <stat.icon className="h-6 w-6 text-blue-400" />
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </div>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Transparency You Can Trust
            </h2>
            <p className="text-xl text-gray-400">
              Every election component is publicly verifiable
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Blockchain Explorer',
                description: 'Browse the Hyperledger Fabric ledger. View every ballot commitment, block by block.',
                icon: '⛓️',
              },
              {
                title: 'ZK Proof Verification',
                description: 'Verify zero-knowledge proofs that tallies are correct without revealing individual votes.',
                icon: '🔐',
              },
              {
                title: 'Real-Time Turnout',
                description: 'Watch voter participation grow in real-time via WebSocket updates.',
                icon: '📊',
              },
              {
                title: 'Commitment Search',
                description: 'Search for any ballot commitment hash to verify it was recorded.',
                icon: '🔍',
              },
              {
                title: 'Merkle Tree Viewer',
                description: 'Explore the Merkle tree structure proving ballot inclusion.',
                icon: '🌳',
              },
              {
                title: 'Mix-Net Audit',
                description: 'Verify that the mix-net shuffle proofs are cryptographically valid.',
                icon: '🔄',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="glass-dark rounded-2xl p-6 border border-slate-700/30 hover:border-blue-500/30 transition group"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Elections Explorer */}
      <section id="explore" className="py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">
            Public Elections
          </h2>

          <div className="space-y-4">
            {[
              { name: 'National Board Election 2025', status: 'Active', votes: '2,847' },
              { name: 'Community Budget Vote', status: 'Active', votes: '1,203' },
              { name: 'Regional Leadership', status: 'Closed', votes: '5,432' },
            ].map((election) => (
              <Link
                key={election.name}
                href={`/observe/election-${election.name.toLowerCase().replace(/ /g, '-')}`}
                className="block glass-dark rounded-xl p-6 border border-slate-700/30 hover:border-blue-500/50 transition group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition">
                      {election.name}
                    </h3>
                    <p className="text-gray-400 mt-1">
                      {election.votes} ballots committed to blockchain
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        election.status === 'Active'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700/50 text-gray-400 border border-slate-600/30'
                      }`}
                    >
                      {election.status}
                    </span>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p className="mb-2">
              ObserverNet - The Future of Verifiable Democracy
            </p>
            <p className="text-sm">
              Powered by Hyperledger Fabric, Zero-Knowledge Proofs, and Threshold Mix-Nets
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
