'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  Users,
  Vote,
  Copy,
  Trash2,
  Pause,
  Play,
  Eye,
  Edit,
  Download,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface Election {
  id: string;
  name: string;
  slug: string;
  status: string;
  votingStartAt: string;
  votingEndAt: string;
  voterCount: number;
  voteCount: number;
  contestCount: number;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  DRAFT: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  CLOSED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PAUSED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  PUBLISHED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  ARCHIVED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function ElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchElections();
  }, [statusFilter]);

  async function fetchElections() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter.toUpperCase());
      }
      params.set('limit', '50');

      const res = await fetch(`/api/elections?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch elections');
      }
      const data = await res.json();
      setElections(data.elections || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
      setElections([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredElections = elections
    .filter((e) => {
      if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.votingStartAt).getTime() - new Date(a.votingStartAt).getTime();
      if (sortBy === 'oldest') return new Date(a.votingStartAt).getTime() - new Date(b.votingStartAt).getTime();
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  // Calculate status counts
  const statusCounts = {
    ACTIVE: elections.filter((e) => e.status === 'ACTIVE').length,
    DRAFT: elections.filter((e) => e.status === 'DRAFT').length,
    CLOSED: elections.filter((e) => e.status === 'CLOSED').length,
    PUBLISHED: elections.filter((e) => e.status === 'PUBLISHED').length,
  };

  async function deleteElection(id: string) {
    if (!confirm('Are you sure you want to delete this election?')) return;
    try {
      const res = await fetch(`/api/elections/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      fetchElections();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Elections</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage all your elections, contests, and voting periods.
          </p>
        </div>
        <Link
          href="/elections/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          Create Election
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search elections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 focus:border-blue-500 focus:outline-none"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Active', count: statusCounts.ACTIVE, color: 'text-emerald-400', filter: 'active' },
          { label: 'Published', count: statusCounts.PUBLISHED, color: 'text-cyan-400', filter: 'published' },
          { label: 'Draft', count: statusCounts.DRAFT, color: 'text-slate-400', filter: 'draft' },
          { label: 'Closed', count: statusCounts.CLOSED, color: 'text-blue-400', filter: 'closed' },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() => setStatusFilter(stat.filter)}
            className={`rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-left transition-colors hover:border-slate-700 ${
              statusFilter === stat.filter ? 'border-blue-500 bg-blue-500/10' : ''
            }`}
          >
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {error}
          <button onClick={fetchElections} className="ml-4 underline">
            Retry
          </button>
        </div>
      )}

      {/* Elections List */}
      {!loading && !error && (
        <div className="space-y-4">
          {filteredElections.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <Vote className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-lg font-medium text-white">No elections found</h3>
              <p className="mt-2 text-sm text-slate-400">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first election to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Link
                  href="/elections/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                >
                  <Plus className="h-4 w-4" />
                  Create Election
                </Link>
              )}
            </div>
          ) : (
            filteredElections.map((election) => {
              const turnout = election.voterCount > 0 ? (election.voteCount / election.voterCount) * 100 : 0;
              return (
                <div
                  key={election.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-slate-700"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* Election Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/elections/${election.id}`}
                          className="text-lg font-semibold text-white hover:text-blue-400"
                        >
                          {election.name}
                        </Link>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            statusColors[election.status] || statusColors.DRAFT
                          }`}
                        >
                          {election.status === 'ACTIVE' && (
                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                          {election.status}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(election.votingStartAt).toLocaleDateString()} -{' '}
                          {new Date(election.votingEndAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Vote className="h-4 w-4" />
                          {election.contestCount} contest{election.contestCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/elections/${election.id}`}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/elections/${election.id}/edit`}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="z-50 min-w-[160px] rounded-lg border border-slate-700 bg-slate-800 p-1 shadow-xl"
                            sideOffset={5}
                          >
                            <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700">
                              <Copy className="h-4 w-4" />
                              Duplicate
                            </DropdownMenu.Item>
                            <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700">
                              <Download className="h-4 w-4" />
                              Export Results
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className="my-1 h-px bg-slate-700" />
                            <DropdownMenu.Item
                              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 outline-none hover:bg-slate-700"
                              onClick={() => deleteElection(election.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-500">Eligible Voters</p>
                      <p className="text-lg font-semibold text-white">
                        {election.voterCount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Votes Cast</p>
                      <p className="text-lg font-semibold text-white">
                        {election.voteCount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Turnout</p>
                      <p className="text-lg font-semibold text-white">{turnout.toFixed(1)}%</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs text-slate-500">Created</p>
                      <p className="text-sm text-slate-300">
                        {new Date(election.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                        style={{ width: `${Math.min(turnout, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
