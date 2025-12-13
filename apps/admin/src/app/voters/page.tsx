'use client';

import { useState, useEffect } from 'react';
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
  Loader2,
  Hash,
  MapPin,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface Voter {
  id: string;
  electionId: string;
  electionName: string;
  voterHashPrefix: string;
  status: string;
  channel: string;
  region: string | null;
  district: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PENDING: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  VERIFIED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  VOTED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  REVOKED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const channelColors: Record<string, string> = {
  WEB: 'bg-blue-500/20 text-blue-400',
  WHATSAPP: 'bg-emerald-500/20 text-emerald-400',
  USSD: 'bg-purple-500/20 text-purple-400',
  PAPER: 'bg-orange-500/20 text-orange-400',
};

export default function VotersPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVoters, setSelectedVoters] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchVoters();
  }, [statusFilter, page]);

  async function fetchVoters() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter.toUpperCase());
      }
      params.set('page', page.toString());
      params.set('limit', '20');

      const res = await fetch(`/api/voters?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch voters');
      }
      const data = await res.json();
      setVoters(data.voters || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.message);
      setVoters([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredVoters = voters.filter((v) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        v.voterHashPrefix.toLowerCase().includes(query) ||
        v.electionName.toLowerCase().includes(query) ||
        v.region?.toLowerCase().includes(query) ||
        v.district?.toLowerCase().includes(query)
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
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="voted">Voted</option>
          <option value="revoked">Revoked</option>
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
          <button onClick={fetchVoters} className="ml-4 underline">
            Retry
          </button>
        </div>
      )}

      {/* Voters Table */}
      {!loading && !error && (
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
                    Voter ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Election
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Channel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Verified
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredVoters.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Users className="mx-auto h-12 w-12 text-slate-600" />
                      <h3 className="mt-4 text-lg font-medium text-white">No voters found</h3>
                      <p className="mt-2 text-sm text-slate-400">
                        {searchQuery || statusFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Import voters to get started'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredVoters.map((voter) => (
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
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-slate-500" />
                          <code className="font-mono text-sm text-slate-300">{voter.voterHashPrefix}</code>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Added {new Date(voter.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/elections/${voter.electionId}`}
                          className="text-sm font-medium text-blue-400 hover:text-blue-300"
                        >
                          {voter.electionName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${channelColors[voter.channel] || 'bg-slate-500/20 text-slate-400'}`}>
                          {voter.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {voter.region || voter.district ? (
                          <div className="flex items-center gap-1 text-sm text-slate-400">
                            <MapPin className="h-3.5 w-3.5" />
                            {[voter.region, voter.district].filter(Boolean).join(', ')}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            statusColors[voter.status] || statusColors.PENDING
                          }`}
                        >
                          {voter.status === 'VOTED' && (
                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                          )}
                          {voter.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {voter.verifiedAt ? (
                          <div className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle className="h-4 w-4" />
                            {new Date(voter.verifiedAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-slate-500">Not verified</span>
                        )}
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
                                <CheckCircle className="h-4 w-4" />
                                Verify
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator className="my-1 h-px bg-slate-700" />
                              <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 outline-none hover:bg-slate-700">
                                <XCircle className="h-4 w-4" />
                                Revoke Access
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
              Showing {filteredVoters.length} of {total} voters
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
