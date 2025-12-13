'use client';

import { useState } from 'react';
import {
  Database,
  Server,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Settings,
  Terminal,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Clock,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import * as Tabs from '@radix-ui/react-tabs';

// Mock data
const networkStats = {
  totalBlocks: 1456789,
  totalTransactions: 234567,
  activeChannels: 3,
  endorsementTime: 42,
  commitTime: 156,
  chaincodeCount: 8,
};

const nodes = [
  {
    id: 'peer0.org1',
    type: 'Peer',
    organization: 'ObserverNet',
    region: 'US-East-1',
    status: 'healthy',
    cpu: 45,
    memory: 62,
    disk: 38,
    uptime: '45d 12h 30m',
    version: '2.5.4',
    lastBlock: 1456789,
  },
  {
    id: 'peer1.org1',
    type: 'Peer',
    organization: 'ObserverNet',
    region: 'US-West-2',
    status: 'healthy',
    cpu: 38,
    memory: 55,
    disk: 35,
    uptime: '45d 12h 30m',
    version: '2.5.4',
    lastBlock: 1456789,
  },
  {
    id: 'peer0.org2',
    type: 'Peer',
    organization: 'Validator-1',
    region: 'EU-West-1',
    status: 'healthy',
    cpu: 52,
    memory: 68,
    disk: 42,
    uptime: '30d 8h 15m',
    version: '2.5.4',
    lastBlock: 1456788,
  },
  {
    id: 'orderer0',
    type: 'Orderer',
    organization: 'ObserverNet',
    region: 'US-East-1',
    status: 'healthy',
    cpu: 28,
    memory: 45,
    disk: 22,
    uptime: '45d 12h 30m',
    version: '2.5.4',
    lastBlock: 1456789,
  },
  {
    id: 'orderer1',
    type: 'Orderer',
    organization: 'ObserverNet',
    region: 'EU-West-1',
    status: 'maintenance',
    cpu: 0,
    memory: 0,
    disk: 20,
    uptime: '0d 0h 0m',
    version: '2.5.4',
    lastBlock: 1456785,
  },
  {
    id: 'ca.org1',
    type: 'CA',
    organization: 'ObserverNet',
    region: 'US-East-1',
    status: 'healthy',
    cpu: 12,
    memory: 25,
    disk: 15,
    uptime: '45d 12h 30m',
    version: '1.5.6',
    lastBlock: null,
  },
];

const channels = [
  { id: 'votes-channel', blocks: 1456789, txCount: 234567, chaincodes: ['votes', 'elections', 'verification'] },
  { id: 'admin-channel', blocks: 45678, txCount: 12340, chaincodes: ['admin', 'audit'] },
  { id: 'system-channel', blocks: 12345, txCount: 8900, chaincodes: ['system'] },
];

const blockHistory = [
  { time: '00:00', blocks: 120 },
  { time: '04:00', blocks: 85 },
  { time: '08:00', blocks: 250 },
  { time: '12:00', blocks: 420 },
  { time: '16:00', blocks: 380 },
  { time: '20:00', blocks: 195 },
];

const transactionHistory = [
  { time: '00:00', tx: 1500 },
  { time: '04:00', tx: 800 },
  { time: '08:00', tx: 3200 },
  { time: '12:00', tx: 5800 },
  { time: '16:00', tx: 4900 },
  { time: '20:00', tx: 2400 },
];

const statusColors = {
  healthy: 'text-emerald-400',
  warning: 'text-orange-400',
  maintenance: 'text-blue-400',
  error: 'text-red-400',
};

const statusBgColors = {
  healthy: 'bg-emerald-500',
  warning: 'bg-orange-500',
  maintenance: 'bg-blue-500',
  error: 'bg-red-500',
};

export default function FabricPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const healthyNodes = nodes.filter((n) => n.status === 'healthy').length;
  const totalNodes = nodes.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hyperledger Fabric Network</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor blockchain network health, nodes, and transactions.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700">
            <Terminal className="h-4 w-4" />
            CLI Access
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Network Status Banner */}
      <div className={`rounded-xl p-4 ${
        healthyNodes === totalNodes
          ? 'border border-emerald-500/30 bg-emerald-500/10'
          : 'border border-orange-500/30 bg-orange-500/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {healthyNodes === totalNodes ? (
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-orange-400" />
            )}
            <div>
              <p className={`font-medium ${healthyNodes === totalNodes ? 'text-emerald-300' : 'text-orange-300'}`}>
                Network Status: {healthyNodes === totalNodes ? 'All Systems Operational' : 'Partial Degradation'}
              </p>
              <p className={`text-sm ${healthyNodes === totalNodes ? 'text-emerald-400/70' : 'text-orange-400/70'}`}>
                {healthyNodes} of {totalNodes} nodes healthy
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">
              Last block: <span className="font-mono text-white">#{networkStats.totalBlocks}</span>
            </span>
            <span className="text-slate-400">
              Block time: <span className="text-white">~3.2s</span>
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Blocks</p>
              <p className="mt-1 text-2xl font-bold text-white">{networkStats.totalBlocks.toLocaleString()}</p>
            </div>
            <Database className="h-8 w-8 text-indigo-400 opacity-50" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Transactions</p>
              <p className="mt-1 text-2xl font-bold text-white">{networkStats.totalTransactions.toLocaleString()}</p>
            </div>
            <Activity className="h-8 w-8 text-emerald-400 opacity-50" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Endorsement Time</p>
              <p className="mt-1 text-2xl font-bold text-white">{networkStats.endorsementTime}ms</p>
            </div>
            <Zap className="h-8 w-8 text-orange-400 opacity-50" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Active Channels</p>
              <p className="mt-1 text-2xl font-bold text-white">{networkStats.activeChannels}</p>
            </div>
            <Network className="h-8 w-8 text-blue-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900/50 p-1">
          {[
            { value: 'overview', label: 'Overview' },
            { value: 'nodes', label: 'Nodes' },
            { value: 'channels', label: 'Channels' },
            { value: 'logs', label: 'Logs' },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Content value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Block Production */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Block Production (24h)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={blockHistory}>
                    <defs>
                      <linearGradient id="colorBlocks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
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
                      dataKey="blocks"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorBlocks)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Transaction Throughput */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Transaction Throughput (24h)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={transactionHistory}>
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
                    <Line type="monotone" dataKey="tx" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Nodes Tab */}
        <Tabs.Content value="nodes" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nodes.map((node) => (
              <div
                key={node.id}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${statusBgColors[node.status as keyof typeof statusBgColors]}`} />
                    <div>
                      <p className="font-medium text-white">{node.id}</p>
                      <p className="text-xs text-slate-400">{node.type} • {node.organization}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${statusColors[node.status as keyof typeof statusColors]}`}>
                    {node.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500">CPU</p>
                    <p className="text-sm font-semibold text-white">{node.cpu}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Memory</p>
                    <p className="text-sm font-semibold text-white">{node.memory}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Disk</p>
                    <p className="text-sm font-semibold text-white">{node.disk}%</p>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{node.region}</span>
                    <span>v{node.version}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Uptime: {node.uptime}</span>
                    {node.lastBlock && (
                      <span className="font-mono text-slate-400">#{node.lastBlock}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Tabs.Content>

        {/* Channels Tab */}
        <Tabs.Content value="channels" className="mt-6">
          <div className="space-y-4">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{channel.id}</h3>
                    <p className="text-sm text-slate-400">
                      {channel.blocks.toLocaleString()} blocks • {channel.txCount.toLocaleString()} transactions
                    </p>
                  </div>
                  <button className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
                    View Details
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {channel.chaincodes.map((cc) => (
                    <span
                      key={cc}
                      className="rounded bg-indigo-500/20 px-2 py-1 text-xs font-medium text-indigo-400"
                    >
                      {cc}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Tabs.Content>

        {/* Logs Tab */}
        <Tabs.Content value="logs" className="mt-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Recent Logs</h3>
              <select className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300">
                <option>All Nodes</option>
                <option>peer0.org1</option>
                <option>peer1.org1</option>
                <option>orderer0</option>
              </select>
            </div>
            <div className="h-96 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs">
              <p className="text-slate-500">[2024-03-15 16:45:32.123] [peer0.org1] [INFO] Block #1456789 committed</p>
              <p className="text-emerald-400">[2024-03-15 16:45:32.100] [peer0.org1] [INFO] Transaction abc123... validated</p>
              <p className="text-slate-500">[2024-03-15 16:45:31.987] [orderer0] [INFO] Block #1456789 created</p>
              <p className="text-blue-400">[2024-03-15 16:45:31.850] [peer0.org1] [DEBUG] Endorsement request received</p>
              <p className="text-orange-400">[2024-03-15 16:45:30.234] [orderer1] [WARN] Node entering maintenance mode</p>
              <p className="text-slate-500">[2024-03-15 16:45:29.100] [peer0.org1] [INFO] Block #1456788 committed</p>
              <p className="text-slate-500">[2024-03-15 16:45:28.900] [peer1.org1] [INFO] Block #1456788 committed</p>
              <p className="text-emerald-400">[2024-03-15 16:45:28.850] [peer0.org2] [INFO] Block #1456788 validated</p>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
