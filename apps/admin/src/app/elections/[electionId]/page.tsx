'use client';

import { useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import {
  ArrowLeft,
  Edit,
  Pause,
  Play,
  Copy,
  Trash2,
  Share2,
  Download,
  Users,
  Vote,
  Clock,
  BarChart3,
  FileText,
  Settings,
  ExternalLink,
  RefreshCw,
  Eye,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import * as Tabs from '@radix-ui/react-tabs';

// Mock data
const electionData = {
  id: '1',
  name: '2024 Board of Directors Election',
  slug: 'board-election-2024',
  description: 'Annual election to select the Board of Directors for the upcoming fiscal year. All members in good standing are eligible to vote.',
  status: 'active',
  startDate: '2024-03-01T09:00:00Z',
  endDate: '2024-03-20T18:00:00Z',
  timezone: 'America/New_York',
  totalVoters: 5420,
  votesCast: 3642,
  turnout: 67.2,
  allowlistRequired: true,
  accessCodeRequired: false,
  anonymousVoting: true,
  resultsVisibility: 'after_end',
  contests: [
    {
      id: '1',
      title: 'President',
      type: 'single_choice',
      totalVotes: 3642,
      options: [
        { id: '1', title: 'Jane Smith', votes: 1821, percentage: 50.0 },
        { id: '2', title: 'John Doe', votes: 1457, percentage: 40.0 },
        { id: '3', title: 'Bob Wilson', votes: 364, percentage: 10.0 },
      ],
    },
    {
      id: '2',
      title: 'Vice President',
      type: 'single_choice',
      totalVotes: 3580,
      options: [
        { id: '1', title: 'Alice Johnson', votes: 2148, percentage: 60.0 },
        { id: '2', title: 'Charlie Brown', votes: 1432, percentage: 40.0 },
      ],
    },
    {
      id: '3',
      title: 'Board Members (Select 3)',
      type: 'multiple_choice',
      totalVotes: 3500,
      options: [
        { id: '1', title: 'David Lee', votes: 2450, percentage: 70.0 },
        { id: '2', title: 'Emma Davis', votes: 2100, percentage: 60.0 },
        { id: '3', title: 'Frank Miller', votes: 1925, percentage: 55.0 },
        { id: '4', title: 'Grace Kim', votes: 1750, percentage: 50.0 },
        { id: '5', title: 'Henry Chen', votes: 1400, percentage: 40.0 },
      ],
    },
  ],
};

const turnoutTimeline = [
  { time: 'Mar 1', votes: 450 },
  { time: 'Mar 3', votes: 820 },
  { time: 'Mar 5', votes: 1100 },
  { time: 'Mar 7', votes: 1450 },
  { time: 'Mar 9', votes: 1890 },
  { time: 'Mar 11', votes: 2340 },
  { time: 'Mar 13', votes: 2780 },
  { time: 'Mar 15', votes: 3200 },
  { time: 'Mar 17', votes: 3450 },
  { time: 'Mar 19', votes: 3642 },
];

const deviceStats = [
  { name: 'Mobile', value: 62, color: '#3b82f6' },
  { name: 'Desktop', value: 31, color: '#10b981' },
  { name: 'Tablet', value: 7, color: '#f59e0b' },
];

const recentVoters = [
  { id: '1', name: 'Voter #3642', time: '2 minutes ago', device: 'iPhone' },
  { id: '2', name: 'Voter #3641', time: '5 minutes ago', device: 'Desktop' },
  { id: '3', name: 'Voter #3640', time: '8 minutes ago', device: 'Android' },
  { id: '4', name: 'Voter #3639', time: '12 minutes ago', device: 'Desktop' },
  { id: '5', name: 'Voter #3638', time: '15 minutes ago', device: 'iPad' },
];

const statusColors = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  draft: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  ended: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  paused: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export default function ElectionDetailPage({
  params,
}: {
  params: Promise<{ electionId: string }>;
}) {
  const { electionId } = use(params);
  const [activeTab, setActiveTab] = useState('overview');

  const election = electionData;
  const timeRemaining = new Date(election.endDate).getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/elections"
            className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{election.name}</h1>
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
            <p className="mt-1 text-sm text-slate-400">
              {election.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(election.startDate).toLocaleDateString()} - {new Date(election.endDate).toLocaleDateString()}
              </span>
              <a
                href={`/e/${election.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-4 w-4" />
                View Public Page
              </a>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <Link
            href={`/elections/${electionId}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <Edit className="h-4 w-4" />
            <span className="hidden sm:inline">Edit</span>
          </Link>
          {election.status === 'active' && (
            <button className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-500">
              <Pause className="h-4 w-4" />
              <span className="hidden sm:inline">Pause</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Voters</p>
              <p className="mt-1 text-3xl font-bold text-white">
                {election.totalVoters.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-blue-600/20 p-3">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Votes Cast</p>
              <p className="mt-1 text-3xl font-bold text-white">
                {election.votesCast.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-600/20 p-3">
              <Vote className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Turnout</p>
              <p className="mt-1 text-3xl font-bold text-white">{election.turnout}%</p>
            </div>
            <div className="rounded-lg bg-purple-600/20 p-3">
              <TrendingUp className="h-6 w-6 text-purple-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                style={{ width: `${election.turnout}%` }}
              />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Time Remaining</p>
              <p className="mt-1 text-3xl font-bold text-white">
                {daysRemaining}d {hoursRemaining}h
              </p>
            </div>
            <div className="rounded-lg bg-orange-600/20 p-3">
              <Clock className="h-6 w-6 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900/50 p-1">
          {[
            { value: 'overview', label: 'Overview', icon: BarChart3 },
            { value: 'results', label: 'Results', icon: Vote },
            { value: 'voters', label: 'Voters', icon: Users },
            { value: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Content value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Turnout Timeline */}
            <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Voting Timeline</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={turnoutTimeline}>
                    <defs>
                      <linearGradient id="colorVotes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="votes"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorVotes)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Device Breakdown</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {deviceStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {deviceStats.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-slate-300">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Recent Voters</h3>
            <div className="space-y-3">
              {recentVoters.map((voter) => (
                <div
                  key={voter.id}
                  className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600/20">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span className="font-medium text-white">{voter.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span>{voter.device}</span>
                    <span>{voter.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Tabs.Content>

        {/* Results Tab */}
        <Tabs.Content value="results" className="mt-6">
          <div className="space-y-6">
            {election.contests.map((contest) => (
              <div
                key={contest.id}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{contest.title}</h3>
                    <p className="text-sm text-slate-400">
                      {contest.totalVotes.toLocaleString()} votes • {contest.type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {contest.options.map((option, index) => {
                    const isLeading = index === 0;
                    return (
                      <div key={option.id}>
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isLeading && (
                              <span className="rounded bg-emerald-600/20 px-1.5 py-0.5 text-xs font-medium text-emerald-400">
                                Leading
                              </span>
                            )}
                            <span className="font-medium text-white">{option.title}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-white">
                              {option.votes.toLocaleString()}
                            </span>
                            <span className="ml-2 text-sm text-slate-400">
                              ({option.percentage}%)
                            </span>
                          </div>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isLeading ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${option.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Tabs.Content>

        {/* Voters Tab */}
        <Tabs.Content value="voters" className="mt-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Voter Management</h3>
              <div className="flex gap-2">
                <Link
                  href={`/voters/allowlists?election=${electionId}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
                >
                  <Users className="h-4 w-4" />
                  Manage Allowlist
                </Link>
                <Link
                  href={`/voters/codes?election=${electionId}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
                >
                  <FileText className="h-4 w-4" />
                  Access Codes
                </Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                <p className="text-2xl font-bold text-white">{election.totalVoters.toLocaleString()}</p>
                <p className="text-sm text-slate-400">Eligible Voters</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{election.votesCast.toLocaleString()}</p>
                <p className="text-sm text-slate-400">Have Voted</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                <p className="text-2xl font-bold text-orange-400">
                  {(election.totalVoters - election.votesCast).toLocaleString()}
                </p>
                <p className="text-sm text-slate-400">Not Yet Voted</p>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Settings Tab */}
        <Tabs.Content value="settings" className="mt-6">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Election Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-white">Allowlist Required</p>
                    <p className="text-sm text-slate-400">Only allowlisted voters can participate</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    election.allowlistRequired ? 'bg-emerald-600/20 text-emerald-400' : 'bg-slate-600/20 text-slate-400'
                  }`}>
                    {election.allowlistRequired ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 py-2">
                  <div>
                    <p className="font-medium text-white">Access Code Required</p>
                    <p className="text-sm text-slate-400">Voters need a unique code to vote</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    election.accessCodeRequired ? 'bg-emerald-600/20 text-emerald-400' : 'bg-slate-600/20 text-slate-400'
                  }`}>
                    {election.accessCodeRequired ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 py-2">
                  <div>
                    <p className="font-medium text-white">Anonymous Voting</p>
                    <p className="text-sm text-slate-400">Votes cannot be linked to voters</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    election.anonymousVoting ? 'bg-emerald-600/20 text-emerald-400' : 'bg-slate-600/20 text-slate-400'
                  }`}>
                    {election.anonymousVoting ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 py-2">
                  <div>
                    <p className="font-medium text-white">Results Visibility</p>
                    <p className="text-sm text-slate-400">When results are shown to voters</p>
                  </div>
                  <span className="rounded-full bg-blue-600/20 px-3 py-1 text-xs font-medium text-blue-400">
                    {election.resultsVisibility.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
              <h3 className="mb-4 text-lg font-semibold text-red-400">Danger Zone</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Cancel Election</p>
                    <p className="text-sm text-slate-400">Permanently cancel this election</p>
                  </div>
                  <button className="rounded-lg border border-red-500/50 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10">
                    Cancel Election
                  </button>
                </div>
                <div className="flex items-center justify-between border-t border-red-500/20 pt-4">
                  <div>
                    <p className="font-medium text-white">Delete Election</p>
                    <p className="text-sm text-slate-400">Permanently delete this election and all data</p>
                  </div>
                  <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">
                    Delete Election
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
