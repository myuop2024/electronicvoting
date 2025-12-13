'use client';

import Link from 'next/link';
import {
  Building2,
  Users,
  Vote,
  Server,
  Database,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Globe,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Mock platform data
const platformStats = {
  totalOrganizations: 156,
  activeOrganizations: 142,
  totalUsers: 45230,
  activeElections: 47,
  totalVotesCast: 234567,
  fabricNodes: 12,
  fabricHealth: 100,
  apiLatency: 42,
  uptime: 99.98,
};

const growthData = [
  { month: 'Jan', orgs: 120, users: 32000, elections: 28 },
  { month: 'Feb', orgs: 128, users: 35000, elections: 32 },
  { month: 'Mar', orgs: 134, users: 38000, elections: 38 },
  { month: 'Apr', orgs: 142, users: 41000, elections: 42 },
  { month: 'May', orgs: 148, users: 43500, elections: 45 },
  { month: 'Jun', orgs: 156, users: 45230, elections: 47 },
];

const systemMetrics = [
  { time: '00:00', cpu: 45, memory: 62, requests: 1200 },
  { time: '04:00', cpu: 32, memory: 58, requests: 800 },
  { time: '08:00', cpu: 58, memory: 68, requests: 2400 },
  { time: '12:00', cpu: 72, memory: 75, requests: 3600 },
  { time: '16:00', cpu: 65, memory: 72, requests: 3200 },
  { time: '20:00', cpu: 48, memory: 65, requests: 1800 },
];

const recentOrgs = [
  { id: '1', name: 'Civic Foundation', plan: 'enterprise', elections: 12, users: 450, status: 'active' },
  { id: '2', name: 'University Council', plan: 'professional', elections: 8, users: 1200, status: 'active' },
  { id: '3', name: 'HOA Network', plan: 'starter', elections: 3, users: 85, status: 'trial' },
  { id: '4', name: 'Labor Union Local 42', plan: 'professional', elections: 5, users: 320, status: 'active' },
];

const alerts = [
  { id: '1', type: 'warning', message: 'High API latency detected in EU region', time: '5 min ago' },
  { id: '2', type: 'security', message: 'Unusual login attempts from IP 192.168.1.x', time: '12 min ago' },
  { id: '3', type: 'info', message: 'Fabric node fabric-peer-03 scheduled for maintenance', time: '1 hour ago' },
];

const fabricNodes = [
  { id: 'peer-01', type: 'Peer', status: 'healthy', region: 'US-East', uptime: '45d 12h' },
  { id: 'peer-02', type: 'Peer', status: 'healthy', region: 'US-West', uptime: '45d 12h' },
  { id: 'peer-03', type: 'Peer', status: 'maintenance', region: 'EU-West', uptime: '12d 8h' },
  { id: 'orderer-01', type: 'Orderer', status: 'healthy', region: 'US-East', uptime: '45d 12h' },
  { id: 'orderer-02', type: 'Orderer', status: 'healthy', region: 'EU-West', uptime: '45d 12h' },
];

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {trend && (
            <p className={`mt-1 flex items-center gap-1 text-sm ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {trendUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {trend}
            </p>
          )}
        </div>
        <div className={`rounded-lg p-3 ${color || 'bg-indigo-600/20'}`}>
          <Icon className={`h-6 w-6 ${color ? color.replace('bg-', 'text-').replace('/20', '-400') : 'text-indigo-400'}`} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Real-time overview of ObserverNet platform health and metrics.
        </p>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              <span className="font-medium text-orange-300">{alerts.length} Active Alerts</span>
            </div>
            <Link href="/alerts" className="text-sm text-orange-400 hover:text-orange-300">
              View all →
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {alerts.slice(0, 2).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between text-sm">
                <span className="text-orange-200">{alert.message}</span>
                <span className="text-orange-400/60">{alert.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Organizations"
          value={platformStats.totalOrganizations}
          icon={Building2}
          trend="+8 this month"
          trendUp
          color="bg-blue-600/20"
        />
        <StatCard
          label="Total Users"
          value={platformStats.totalUsers.toLocaleString()}
          icon={Users}
          trend="+12% growth"
          trendUp
          color="bg-emerald-600/20"
        />
        <StatCard
          label="Active Elections"
          value={platformStats.activeElections}
          icon={Vote}
          trend="+5 vs last week"
          trendUp
          color="bg-purple-600/20"
        />
        <StatCard
          label="Votes Cast (Total)"
          value={`${(platformStats.totalVotesCast / 1000).toFixed(0)}K`}
          icon={TrendingUp}
          trend="+23K today"
          trendUp
          color="bg-orange-600/20"
        />
      </div>

      {/* System Health Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Platform Uptime</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              {platformStats.uptime}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${platformStats.uptime}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">API Latency</span>
            <span className="text-white">{platformStats.apiLatency}ms</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-blue-500" style={{ width: '42%' }} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Fabric Network</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <Database className="h-4 w-4" />
              {platformStats.fabricHealth}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: '100%' }} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Active Nodes</span>
            <span className="text-white">{platformStats.fabricNodes} / 12</span>
          </div>
          <div className="mt-2 flex gap-1">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded ${i < platformStats.fabricNodes ? 'bg-emerald-500' : 'bg-slate-700'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Growth Chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">Platform Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
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
                  dataKey="users"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Metrics */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">System Metrics (24h)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={systemMetrics}>
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
                <Line type="monotone" dataKey="cpu" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="memory" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <span className="flex items-center gap-2 text-orange-400">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              CPU Usage
            </span>
            <span className="flex items-center gap-2 text-blue-400">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              Memory Usage
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Organizations */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Recent Organizations</h3>
            <Link href="/organizations" className="text-sm text-indigo-400 hover:text-indigo-300">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium uppercase text-slate-500">
                  <th className="pb-3">Organization</th>
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Elections</th>
                  <th className="pb-3">Users</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentOrgs.map((org) => (
                  <tr key={org.id}>
                    <td className="py-3">
                      <Link href={`/organizations/${org.id}`} className="font-medium text-white hover:text-indigo-400">
                        {org.name}
                      </Link>
                    </td>
                    <td className="py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                        org.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                        org.plan === 'professional' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {org.plan}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">{org.elections}</td>
                    <td className="py-3 text-slate-300">{org.users}</td>
                    <td className="py-3">
                      <span className={`flex items-center gap-1 text-sm ${
                        org.status === 'active' ? 'text-emerald-400' : 'text-orange-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          org.status === 'active' ? 'bg-emerald-400' : 'bg-orange-400'
                        }`} />
                        {org.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fabric Nodes */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Fabric Nodes</h3>
            <Link href="/fabric" className="text-sm text-indigo-400 hover:text-indigo-300">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {fabricNodes.map((node) => (
              <div key={node.id} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    node.status === 'healthy' ? 'bg-emerald-400' :
                    node.status === 'maintenance' ? 'bg-orange-400' : 'bg-red-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-white">{node.id}</p>
                    <p className="text-xs text-slate-500">{node.type} • {node.region}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{node.uptime}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
