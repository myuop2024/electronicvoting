'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Vote,
  Users,
  FileText,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Plus,
  Upload,
  Download,
  Calendar,
  Activity,
  Shield,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
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

interface DashboardStats {
  activeElections: number;
  totalVoters: number;
  totalVotesCast: number;
  turnoutPercentage: number;
  pendingReviews: number;
  paperBallotsPending: number;
}

interface RecentElection {
  id: string;
  name: string;
  status: string;
  turnout: number;
  totalVoters: number;
  votesCast: number;
  endDate: string;
}

interface ActivityItem {
  id: number;
  type: string;
  message: string;
  time: string;
}

interface DeviceBreakdown {
  name: string;
  value: number;
  color: string;
}

interface TurnoutDataPoint {
  time: string;
  votes: number;
}

const quickActions = [
  { href: '/elections/new', label: 'Create Election', icon: Plus, color: 'bg-blue-600' },
  { href: '/voters/allowlists/upload', label: 'Upload Allowlist', icon: Upload, color: 'bg-emerald-600' },
  { href: '/voters/codes/generate', label: 'Generate Codes', icon: Download, color: 'bg-purple-600' },
  { href: '/paper-ballots', label: 'Review Ballots', icon: FileText, color: 'bg-orange-600' },
];

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {trend && (
            <p className={`mt-1 text-sm ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-slate-800 p-3">
          <Icon className="h-6 w-6 text-blue-400" />
        </div>
      </div>
    </div>
  );
}

function ElectionCard({ election }: { election: RecentElection }) {
  const statusColors = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    draft: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    ended: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    paused: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };

  return (
    <Link
      href={`/elections/${election.id}`}
      className="block rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-slate-700 hover:bg-slate-900"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-lg font-semibold text-white">{election.name}</h3>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                statusColors[election.status as keyof typeof statusColors]
              }`}
            >
              {election.status === 'active' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
            </span>
            <span className="text-sm text-slate-400">
              <Clock className="mr-1 inline h-3.5 w-3.5" />
              Ends {new Date(election.endDate).toLocaleDateString()}
            </span>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-slate-500" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-800 pt-4">
        <div>
          <p className="text-xs text-slate-500">Turnout</p>
          <p className="text-lg font-semibold text-white">{election.turnout}%</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Votes</p>
          <p className="text-lg font-semibold text-white">{election.votesCast.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Voters</p>
          <p className="text-lg font-semibold text-white">{election.totalVoters.toLocaleString()}</p>
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
    </Link>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    activeElections: 0,
    totalVoters: 0,
    totalVotesCast: 0,
    turnoutPercentage: 0,
    pendingReviews: 0,
    paperBallotsPending: 0,
  });
  const [recentElections, setRecentElections] = useState<RecentElection[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [turnoutData, setTurnoutData] = useState<TurnoutDataPoint[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceBreakdown[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const data = await res.json();
      setStats(data.stats);
      setRecentElections(data.recentElections || []);
      setRecentActivity(data.recentActivity || []);
      setTurnoutData(data.turnoutData || []);
      setDeviceBreakdown(data.deviceBreakdown || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
        {error}
        <button onClick={fetchDashboardData} className="ml-4 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Welcome back! Here's an overview of your elections.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`inline-flex items-center gap-2 rounded-lg ${action.color} px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105`}
            >
              <action.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Elections"
          value={stats.activeElections}
          icon={Vote}
        />
        <StatCard
          label="Total Voters"
          value={stats.totalVoters.toLocaleString()}
          icon={Users}
        />
        <StatCard
          label="Overall Turnout"
          value={`${stats.turnoutPercentage}%`}
          icon={TrendingUp}
        />
        <StatCard
          label="Pending Reviews"
          value={stats.pendingReviews + stats.paperBallotsPending}
          icon={AlertTriangle}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Turnout Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Today's Voting Activity</h2>
            <select className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300">
              <option>Board Election</option>
              <option>Budget Referendum</option>
              <option>All Elections</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={turnoutData}>
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
          <h2 className="mb-4 text-lg font-semibold text-white">Device Breakdown</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceBreakdown.map((entry, index) => (
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
            {deviceBreakdown.map((item) => (
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

      {/* Elections and Activity Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Elections */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Elections</h2>
            <Link
              href="/elections"
              className="text-sm font-medium text-blue-400 hover:text-blue-300"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-4">
            {recentElections.map((election) => (
              <ElectionCard key={election.id} election={election} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <Link href="/audit-log" className="text-sm text-blue-400 hover:text-blue-300">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const icons = {
                vote: <CheckCircle className="h-5 w-5 text-emerald-400" />,
                upload: <Upload className="h-5 w-5 text-blue-400" />,
                paper: <FileText className="h-5 w-5 text-orange-400" />,
                security: <Shield className="h-5 w-5 text-red-400" />,
                election: <Calendar className="h-5 w-5 text-purple-400" />,
              };
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-800/50"
                >
                  <div className="mt-0.5">
                    {icons[activity.type as keyof typeof icons]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200">{activity.message}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {(stats.pendingReviews > 0 || stats.paperBallotsPending > 0) && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-orange-300">Action Required</h3>
              <p className="mt-1 text-sm text-orange-200/80">
                You have {stats.paperBallotsPending} paper ballots awaiting OCR review and{' '}
                {stats.pendingReviews} voter registrations pending approval.
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  href="/paper-ballots"
                  className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-500"
                >
                  Review Paper Ballots
                </Link>
                <Link
                  href="/voters?status=pending"
                  className="rounded-lg border border-orange-500/50 px-3 py-1.5 text-sm font-medium text-orange-300 hover:bg-orange-500/10"
                >
                  Review Voters
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
