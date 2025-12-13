'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  Shield,
  Eye,
  Edit,
  Trash2,
  Users,
  FileSpreadsheet,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// Mock data
const voters = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+1 (555) 123-4567',
    status: 'active',
    verified: true,
    elections: 3,
    lastVoted: '2024-03-15T10:30:00Z',
    registeredAt: '2023-01-15T00:00:00Z',
  },
  {
    id: '2',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+1 (555) 234-5678',
    status: 'active',
    verified: true,
    elections: 2,
    lastVoted: '2024-03-14T14:45:00Z',
    registeredAt: '2023-03-20T00:00:00Z',
  },
  {
    id: '3',
    name: 'Bob Wilson',
    email: 'bob.wilson@example.com',
    phone: '+1 (555) 345-6789',
    status: 'pending',
    verified: false,
    elections: 0,
    lastVoted: null,
    registeredAt: '2024-03-10T00:00:00Z',
  },
  {
    id: '4',
    name: 'Alice Johnson',
    email: 'alice.j@example.com',
    phone: '+1 (555) 456-7890',
    status: 'active',
    verified: true,
    elections: 5,
    lastVoted: '2024-03-12T09:15:00Z',
    registeredAt: '2022-06-01T00:00:00Z',
  },
  {
    id: '5',
    name: 'Charlie Brown',
    email: 'charlie.b@example.com',
    phone: null,
    status: 'suspended',
    verified: true,
    elections: 1,
    lastVoted: '2023-11-20T11:00:00Z',
    registeredAt: '2023-11-01T00:00:00Z',
  },
];

const statusColors = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
  inactive: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function VotersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVoters, setSelectedVoters] = useState<string[]>([]);

  const filteredVoters = voters.filter((v) => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        v.name.toLowerCase().includes(query) ||
        v.email.toLowerCase().includes(query) ||
        v.phone?.includes(query)
      );
    }
    return true;
  });

  const toggleVoter = (id: string) => {
    setSelectedVoters((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedVoters.length === filteredVoters.length) {
      setSelectedVoters([]);
    } else {
      setSelectedVoters(filteredVoters.map((v) => v.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Voter Registry</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage voter accounts, verification, and access.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700">
            <Download className="h-4 w-4" />
            Export
          </button>
          <Link
            href="/voters/import"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
          >
            <Upload className="h-4 w-4" />
            Import
          </Link>
          <Link
            href="/voters/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Add Voter
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/voters/allowlists"
          className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700"
        >
          <div className="rounded-lg bg-blue-600/20 p-3">
            <Users className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-white">Allowlists</p>
            <p className="text-sm text-slate-400">Manage voter allowlists</p>
          </div>
        </Link>
        <Link
          href="/voters/codes"
          className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700"
        >
          <div className="rounded-lg bg-emerald-600/20 p-3">
            <Shield className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-white">Access Codes</p>
            <p className="text-sm text-slate-400">Generate voting codes</p>
          </div>
        </Link>
        <Link
          href="/voters/imports"
          className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700"
        >
          <div className="rounded-lg bg-purple-600/20 p-3">
            <FileSpreadsheet className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <p className="font-medium text-white">Import History</p>
            <p className="text-sm text-slate-400">View past imports</p>
          </div>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedVoters.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3">
          <span className="text-sm text-blue-300">
            {selectedVoters.length} voter{selectedVoters.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button className="rounded-lg border border-blue-500/50 px-3 py-1.5 text-sm font-medium text-blue-300 hover:bg-blue-500/10">
              Send Email
            </button>
            <button className="rounded-lg border border-blue-500/50 px-3 py-1.5 text-sm font-medium text-blue-300 hover:bg-blue-500/10">
              Export Selected
            </button>
            <button className="rounded-lg border border-red-500/50 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/10">
              Suspend
            </button>
          </div>
        </div>
      )}

      {/* Voters Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedVoters.length === filteredVoters.length && filteredVoters.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Voter
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Elections
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Last Voted
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredVoters.map((voter) => (
                <tr
                  key={voter.id}
                  className={`transition-colors hover:bg-slate-800/50 ${
                    selectedVoters.includes(voter.id) ? 'bg-blue-500/10' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedVoters.includes(voter.id)}
                      onChange={() => toggleVoter(voter.id)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white">
                        {voter.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-white">{voter.name}</p>
                        <p className="text-xs text-slate-400">
                          Registered {new Date(voter.registeredAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Mail className="h-3.5 w-3.5 text-slate-500" />
                        {voter.email}
                      </div>
                      {voter.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Phone className="h-3.5 w-3.5 text-slate-500" />
                          {voter.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          statusColors[voter.status as keyof typeof statusColors]
                        }`}
                      >
                        {voter.status.charAt(0).toUpperCase() + voter.status.slice(1)}
                      </span>
                      {voter.verified && (
                        <CheckCircle className="h-4 w-4 text-emerald-400" title="Verified" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white">{voter.elections}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {voter.lastVoted
                      ? new Date(voter.lastVoted).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className="z-50 min-w-[160px] rounded-lg border border-slate-700 bg-slate-800 p-1 shadow-xl"
                          sideOffset={5}
                          align="end"
                        >
                          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700">
                            <Eye className="h-4 w-4" />
                            View Details
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700">
                            <Edit className="h-4 w-4" />
                            Edit
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700">
                            <Mail className="h-4 w-4" />
                            Send Email
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="my-1 h-px bg-slate-700" />
                          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 outline-none hover:bg-slate-700">
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
          <p className="text-sm text-slate-400">
            Showing {filteredVoters.length} of {voters.length} voters
          </p>
          <div className="flex gap-2">
            <button className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
              Previous
            </button>
            <button className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
