'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  MoreHorizontal,
  Users,
  Shield,
  Mail,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  Key,
  Download,
  Filter,
  UserPlus,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// Mock data
const users = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@civicfoundation.org',
    organization: 'Civic Foundation',
    orgId: '1',
    platformRole: 'user',
    orgRole: 'owner',
    status: 'active',
    verified: true,
    mfaEnabled: true,
    lastActive: '2024-03-15T14:30:00Z',
    createdAt: '2023-01-15T00:00:00Z',
  },
  {
    id: '2',
    name: 'Dr. Michael Chen',
    email: 'mchen@university.edu',
    organization: 'University Council',
    orgId: '2',
    platformRole: 'user',
    orgRole: 'owner',
    status: 'active',
    verified: true,
    mfaEnabled: true,
    lastActive: '2024-03-15T10:15:00Z',
    createdAt: '2023-03-20T00:00:00Z',
  },
  {
    id: '3',
    name: 'Admin User',
    email: 'admin@observernet.com',
    organization: null,
    orgId: null,
    platformRole: 'admin',
    orgRole: null,
    status: 'active',
    verified: true,
    mfaEnabled: true,
    lastActive: '2024-03-15T16:00:00Z',
    createdAt: '2022-01-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'Support Agent',
    email: 'support@observernet.com',
    organization: null,
    orgId: null,
    platformRole: 'support',
    orgRole: null,
    status: 'active',
    verified: true,
    mfaEnabled: false,
    lastActive: '2024-03-15T11:45:00Z',
    createdAt: '2023-06-01T00:00:00Z',
  },
  {
    id: '5',
    name: 'Tom Wilson',
    email: 'tom@hoanetwork.com',
    organization: 'HOA Network',
    orgId: '3',
    platformRole: 'user',
    orgRole: 'owner',
    status: 'active',
    verified: true,
    mfaEnabled: false,
    lastActive: '2024-03-14T16:45:00Z',
    createdAt: '2024-03-01T00:00:00Z',
  },
  {
    id: '6',
    name: 'Jane Doe',
    email: 'jane@example.com',
    organization: 'Civic Foundation',
    orgId: '1',
    platformRole: 'user',
    orgRole: 'admin',
    status: 'suspended',
    verified: true,
    mfaEnabled: false,
    lastActive: '2024-02-20T09:00:00Z',
    createdAt: '2023-08-15T00:00:00Z',
  },
];

const platformRoleColors = {
  superadmin: 'bg-purple-500/20 text-purple-400',
  admin: 'bg-indigo-500/20 text-indigo-400',
  support: 'bg-blue-500/20 text-blue-400',
  moderator: 'bg-emerald-500/20 text-emerald-400',
  user: 'bg-slate-500/20 text-slate-400',
};

const statusColors = {
  active: 'bg-emerald-500/20 text-emerald-400',
  suspended: 'bg-red-500/20 text-red-400',
  pending: 'bg-orange-500/20 text-orange-400',
};

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredUsers = users.filter((user) => {
    if (statusFilter !== 'all' && user.status !== statusFilter) return false;
    if (roleFilter !== 'all' && user.platformRole !== roleFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.organization?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage all users across the platform.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            <UserPlus className="h-4 w-4" />
            Invite User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Users', count: users.length, icon: Users, color: 'text-white' },
          { label: 'Active', count: users.filter((u) => u.status === 'active').length, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Platform Staff', count: users.filter((u) => u.platformRole !== 'user').length, icon: Shield, color: 'text-indigo-400' },
          { label: 'MFA Enabled', count: users.filter((u) => u.mfaEnabled).length, icon: Key, color: 'text-blue-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color} opacity-50`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or organization..."
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
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Roles</option>
          <option value="superadmin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="support">Support</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Security
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
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-medium text-white">
                        {user.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.name}</p>
                        <p className="text-sm text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {user.organization ? (
                      <Link
                        href={`/organizations/${user.orgId}`}
                        className="text-slate-300 hover:text-indigo-400"
                      >
                        {user.organization}
                      </Link>
                    ) : (
                      <span className="text-slate-500">Platform Staff</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${platformRoleColors[user.platformRole as keyof typeof platformRoleColors]}`}>
                      {user.platformRole}
                    </span>
                    {user.orgRole && (
                      <span className="ml-2 text-xs text-slate-500">({user.orgRole})</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusColors[user.status as keyof typeof statusColors]}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {user.verified && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400" title="Email Verified">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {user.mfaEnabled && (
                        <span className="flex items-center gap-1 text-xs text-blue-400" title="MFA Enabled">
                          <Key className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {!user.mfaEnabled && (
                        <span className="text-xs text-orange-400">No MFA</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-400">
                    {new Date(user.lastActive).toLocaleDateString()}
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
                            View Profile
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700">
                            <Edit className="h-4 w-4" />
                            Edit
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700">
                            <Mail className="h-4 w-4" />
                            Send Email
                          </DropdownMenu.Item>
                          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700">
                            <Key className="h-4 w-4" />
                            Reset Password
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="my-1 h-px bg-slate-700" />
                          {user.status === 'active' ? (
                            <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 outline-none hover:bg-slate-700">
                              <Ban className="h-4 w-4" />
                              Suspend
                            </DropdownMenu.Item>
                          ) : (
                            <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-emerald-400 outline-none hover:bg-slate-700">
                              <CheckCircle className="h-4 w-4" />
                              Activate
                            </DropdownMenu.Item>
                          )}
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
            Showing {filteredUsers.length} of {users.length} users
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
