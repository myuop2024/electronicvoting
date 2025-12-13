'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  MoreHorizontal,
  Building2,
  Users,
  Vote,
  Eye,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Filter,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// Mock data
const organizations = [
  {
    id: '1',
    name: 'Civic Foundation',
    slug: 'civic-foundation',
    plan: 'enterprise',
    status: 'active',
    users: 450,
    elections: 12,
    totalVotes: 28500,
    createdAt: '2023-01-15T00:00:00Z',
    lastActive: '2024-03-15T14:30:00Z',
    owner: 'Sarah Johnson',
    ownerEmail: 'sarah@civicfoundation.org',
  },
  {
    id: '2',
    name: 'University Council',
    slug: 'university-council',
    plan: 'professional',
    status: 'active',
    users: 1200,
    elections: 8,
    totalVotes: 15200,
    createdAt: '2023-03-20T00:00:00Z',
    lastActive: '2024-03-15T10:15:00Z',
    owner: 'Dr. Michael Chen',
    ownerEmail: 'mchen@university.edu',
  },
  {
    id: '3',
    name: 'HOA Network',
    slug: 'hoa-network',
    plan: 'starter',
    status: 'trial',
    users: 85,
    elections: 3,
    totalVotes: 420,
    createdAt: '2024-03-01T00:00:00Z',
    lastActive: '2024-03-14T16:45:00Z',
    owner: 'Tom Wilson',
    ownerEmail: 'tom@hoanetwork.com',
  },
  {
    id: '4',
    name: 'Labor Union Local 42',
    slug: 'labor-union-42',
    plan: 'professional',
    status: 'active',
    users: 320,
    elections: 5,
    totalVotes: 8900,
    createdAt: '2023-06-10T00:00:00Z',
    lastActive: '2024-03-15T09:00:00Z',
    owner: 'Maria Garcia',
    ownerEmail: 'mgarcia@local42.org',
  },
  {
    id: '5',
    name: 'Church of Good Will',
    slug: 'church-goodwill',
    plan: 'starter',
    status: 'suspended',
    users: 45,
    elections: 2,
    totalVotes: 180,
    createdAt: '2023-11-01T00:00:00Z',
    lastActive: '2024-02-20T11:30:00Z',
    owner: 'Rev. David Park',
    ownerEmail: 'david@churchgoodwill.org',
  },
];

const statusColors = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  trial: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const planColors = {
  enterprise: 'bg-purple-500/20 text-purple-400',
  professional: 'bg-blue-500/20 text-blue-400',
  starter: 'bg-slate-500/20 text-slate-400',
};

export default function OrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const filteredOrgs = organizations.filter((org) => {
    if (statusFilter !== 'all' && org.status !== statusFilter) return false;
    if (planFilter !== 'all' && org.plan !== planFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        org.name.toLowerCase().includes(query) ||
        org.owner.toLowerCase().includes(query) ||
        org.ownerEmail.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Organizations</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage all organizations on the platform.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            <Plus className="h-4 w-4" />
            Add Organization
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', count: organizations.length, color: 'text-white' },
          { label: 'Active', count: organizations.filter((o) => o.status === 'active').length, color: 'text-emerald-400' },
          { label: 'Trial', count: organizations.filter((o) => o.status === 'trial').length, color: 'text-blue-400' },
          { label: 'Suspended', count: organizations.filter((o) => o.status === 'suspended').length, color: 'text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search organizations, owners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Plans</option>
          <option value="enterprise">Enterprise</option>
          <option value="professional">Professional</option>
          <option value="starter">Starter</option>
        </select>
      </div>

      {/* Organizations Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Users
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Elections
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Last Active
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredOrgs.map((org) => (
                <tr key={org.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-lg font-bold text-white">
                        {org.name[0]}
                      </div>
                      <div>
                        <Link
                          href={`/organizations/${org.id}`}
                          className="font-medium text-white hover:text-indigo-400"
                        >
                          {org.name}
                        </Link>
                        <p className="text-sm text-slate-400">{org.ownerEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${planColors[org.plan as keyof typeof planColors]}`}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[org.status as keyof typeof statusColors]}`}>
                      {org.status === 'active' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                      {org.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{org.users}</td>
                  <td className="px-4 py-4 text-slate-300">{org.elections}</td>
                  <td className="px-4 py-4 text-sm text-slate-400">
                    {new Date(org.lastActive).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-right">
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
                            <Users className="h-4 w-4" />
                            Manage Users
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="my-1 h-px bg-slate-700" />
                          {org.status === 'active' ? (
                            <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-orange-400 outline-none hover:bg-slate-700">
                              <Ban className="h-4 w-4" />
                              Suspend
                            </DropdownMenu.Item>
                          ) : (
                            <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-emerald-400 outline-none hover:bg-slate-700">
                              <CheckCircle className="h-4 w-4" />
                              Activate
                            </DropdownMenu.Item>
                          )}
                          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 outline-none hover:bg-slate-700">
                            <Trash2 className="h-4 w-4" />
                            Delete
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
            Showing {filteredOrgs.length} of {organizations.length} organizations
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
