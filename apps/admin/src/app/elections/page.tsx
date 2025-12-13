'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// Mock data
const elections = [
  {
    id: '1',
    name: '2024 Board of Directors Election',
    slug: 'board-election-2024',
    status: 'active',
    type: 'single_choice',
    turnout: 67.2,
    totalVoters: 5420,
    votesCast: 3642,
    startDate: '2024-03-01T09:00:00Z',
    endDate: '2024-03-20T18:00:00Z',
    contests: 3,
    createdBy: 'Admin User',
  },
  {
    id: '2',
    name: 'Budget Referendum Q1 2024',
    slug: 'budget-referendum-q1-2024',
    status: 'active',
    type: 'referendum',
    turnout: 45.1,
    totalVoters: 8900,
    votesCast: 4014,
    startDate: '2024-03-10T00:00:00Z',
    endDate: '2024-03-18T23:59:00Z',
    contests: 1,
    createdBy: 'Admin User',
  },
  {
    id: '3',
    name: 'Committee Chair Selection',
    slug: 'committee-chair-2024',
    status: 'draft',
    type: 'ranked_choice',
    turnout: 0,
    totalVoters: 1100,
    votesCast: 0,
    startDate: '2024-04-01T12:00:00Z',
    endDate: '2024-04-15T18:00:00Z',
    contests: 5,
    createdBy: 'Staff User',
  },
  {
    id: '4',
    name: 'Annual General Meeting Resolutions',
    slug: 'agm-2024',
    status: 'ended',
    type: 'approval',
    turnout: 72.8,
    totalVoters: 3200,
    votesCast: 2330,
    startDate: '2024-02-01T09:00:00Z',
    endDate: '2024-02-28T18:00:00Z',
    contests: 8,
    createdBy: 'Admin User',
  },
  {
    id: '5',
    name: 'Emergency Policy Vote',
    slug: 'emergency-policy-2024',
    status: 'paused',
    type: 'single_choice',
    turnout: 23.4,
    totalVoters: 500,
    votesCast: 117,
    startDate: '2024-03-05T00:00:00Z',
    endDate: '2024-03-12T23:59:00Z',
    contests: 1,
    createdBy: 'Admin User',
  },
];

const statusColors = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  draft: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  ended: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  paused: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const typeLabels = {
  single_choice: 'Single Choice',
  multiple_choice: 'Multiple Choice',
  ranked_choice: 'Ranked Choice',
  approval: 'Approval Voting',
  referendum: 'Referendum',
};

export default function ElectionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  const filteredElections = elections
    .filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      if (sortBy === 'oldest') return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'turnout') return b.turnout - a.turnout;
      return 0;
    });

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
          <option value="ended">Ended</option>
          <option value="paused">Paused</option>
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
          <option value="turnout">Highest Turnout</option>
        </select>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Active', count: elections.filter((e) => e.status === 'active').length, color: 'text-emerald-400' },
          { label: 'Draft', count: elections.filter((e) => e.status === 'draft').length, color: 'text-slate-400' },
          { label: 'Ended', count: elections.filter((e) => e.status === 'ended').length, color: 'text-blue-400' },
          { label: 'Paused', count: elections.filter((e) => e.status === 'paused').length, color: 'text-orange-400' },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() => setStatusFilter(stat.label.toLowerCase())}
            className={`rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-left transition-colors hover:border-slate-700 ${
              statusFilter === stat.label.toLowerCase() ? 'border-blue-500 bg-blue-500/10' : ''
            }`}
          >
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
          </button>
        ))}
      </div>

      {/* Elections List */}
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
          filteredElections.map((election) => (
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
                        statusColors[election.status as keyof typeof statusColors]
                      }`}
                    >
                      {election.status === 'active' && (
                        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                      {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(election.startDate).toLocaleDateString()} -{' '}
                      {new Date(election.endDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Vote className="h-4 w-4" />
                      {election.contests} contest{election.contests !== 1 ? 's' : ''}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-xs">
                      {typeLabels[election.type as keyof typeof typeLabels]}
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
                        {election.status === 'active' && (
                          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-orange-400 outline-none hover:bg-slate-700">
                            <Pause className="h-4 w-4" />
                            Pause Election
                          </DropdownMenu.Item>
                        )}
                        {election.status === 'paused' && (
                          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-emerald-400 outline-none hover:bg-slate-700">
                            <Play className="h-4 w-4" />
                            Resume Election
                          </DropdownMenu.Item>
                        )}
                        <DropdownMenu.Separator className="my-1 h-px bg-slate-700" />
                        <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 outline-none hover:bg-slate-700">
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
                    {election.totalVoters.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Votes Cast</p>
                  <p className="text-lg font-semibold text-white">
                    {election.votesCast.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Turnout</p>
                  <p className="text-lg font-semibold text-white">{election.turnout}%</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs text-slate-500">Created by</p>
                  <p className="text-sm text-slate-300">{election.createdBy}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                    style={{ width: `${election.turnout}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
