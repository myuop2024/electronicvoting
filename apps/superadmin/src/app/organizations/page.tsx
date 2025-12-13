'use client';

import { useState, useEffect } from 'react';
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
  Loader2,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  memberCount: number;
  electionCount: number;
  logoUrl: string | null;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  TRIAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SUSPENDED: 'bg-red-500/20 text-red-400 border-red-500/30',
  ARCHIVED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const planColors: Record<string, string> = {
  ENTERPRISE: 'bg-purple-500/20 text-purple-400',
  PROFESSIONAL: 'bg-blue-500/20 text-blue-400',
  STARTER: 'bg-slate-500/20 text-slate-400',
  FREE: 'bg-slate-500/20 text-slate-400',
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchOrganizations();
  }, [statusFilter, planFilter, page]);

  async function fetchOrganizations() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter.toUpperCase());
      }
      if (planFilter !== 'all') {
        params.set('plan', planFilter.toUpperCase());
      }
      params.set('page', page.toString());
      params.set('limit', '20');

      const res = await fetch(`/api/organizations?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch organizations');
      }
      const data = await res.json();
      setOrganizations(data.organizations || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.message);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrgStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      fetchOrganizations();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function deleteOrg(id: string) {
    if (!confirm('Are you sure you want to delete this organization?')) return;
    try {
      const res = await fetch(`/api/organizations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      fetchOrganizations();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const filteredOrgs = organizations.filter((org) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        org.name.toLowerCase().includes(query) ||
        org.ownerName?.toLowerCase().includes(query) ||
        org.ownerEmail?.toLowerCase().includes(query)
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
          { label: 'Total', count: total, color: 'text-white' },
          { label: 'Active', count: organizations.filter((o) => o.status === 'ACTIVE').length, color: 'text-emerald-400' },
          { label: 'Trial', count: organizations.filter((o) => o.status === 'TRIAL').length, color: 'text-blue-400' },
          { label: 'Suspended', count: organizations.filter((o) => o.status === 'SUSPENDED').length, color: 'text-red-400' },
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
          <option value="archived">Archived</option>
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
          <option value="free">Free</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {error}
          <button onClick={fetchOrganizations} className="ml-4 underline">
            Retry
          </button>
        </div>
      )}

      {/* Organizations Table */}
      {!loading && !error && (
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
                    Members
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Elections
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Building2 className="mx-auto h-12 w-12 text-slate-600" />
                      <h3 className="mt-4 text-lg font-medium text-white">No organizations found</h3>
                      <p className="mt-2 text-sm text-slate-400">
                        {searchQuery || statusFilter !== 'all' || planFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Create your first organization to get started'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {org.logoUrl ? (
                            <img
                              src={org.logoUrl}
                              alt={org.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-lg font-bold text-white">
                              {org.name[0]}
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/organizations/${org.id}`}
                              className="font-medium text-white hover:text-indigo-400"
                            >
                              {org.name}
                            </Link>
                            <p className="text-sm text-slate-400">{org.ownerEmail || org.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${planColors[org.plan] || planColors.FREE}`}>
                          {org.plan}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[org.status] || statusColors.ACTIVE}`}>
                          {org.status === 'ACTIVE' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                          {org.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-300">{org.memberCount}</td>
                      <td className="px-4 py-4 text-slate-300">{org.electionCount}</td>
                      <td className="px-4 py-4 text-sm text-slate-400">
                        {new Date(org.createdAt).toLocaleDateString()}
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
                                Manage Members
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator className="my-1 h-px bg-slate-700" />
                              {org.status === 'ACTIVE' ? (
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-orange-400 outline-none hover:bg-slate-700"
                                  onClick={() => updateOrgStatus(org.id, 'SUSPENDED')}
                                >
                                  <Ban className="h-4 w-4" />
                                  Suspend
                                </DropdownMenu.Item>
                              ) : (
                                <DropdownMenu.Item
                                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-emerald-400 outline-none hover:bg-slate-700"
                                  onClick={() => updateOrgStatus(org.id, 'ACTIVE')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Activate
                                </DropdownMenu.Item>
                              )}
                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 outline-none hover:bg-slate-700"
                                onClick={() => deleteOrg(org.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
            <p className="text-sm text-slate-400">
              Showing {filteredOrgs.length} of {total} organizations
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
