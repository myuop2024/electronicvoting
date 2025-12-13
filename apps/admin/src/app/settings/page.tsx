'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Users,
  Shield,
  Bell,
  Webhook,
  Key,
  Save,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';

// Types
interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string;
  timezone: string;
}

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  lastActive: string | null;
  joinedAt: string;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  key?: string; // Only on creation
  scopes: string[];
  status: string;
  lastUsed: string | null;
  createdAt: string;
}

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  secret?: string; // Only on creation
  events: string[];
  status: string;
  lastTriggered: string | null;
  createdAt: string;
}

// API Functions
async function fetchOrganization() {
  const res = await fetch('/api/settings/organization');
  if (!res.ok) throw new Error('Failed to fetch organization');
  return res.json();
}

async function updateOrganization(data: Partial<OrgSettings>) {
  const res = await fetch('/api/settings/organization', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update');
  }
  return res.json();
}

async function fetchTeam() {
  const res = await fetch('/api/settings/team');
  if (!res.ok) throw new Error('Failed to fetch team');
  return res.json();
}

async function inviteMember(data: { email: string; role: string }) {
  const res = await fetch('/api/settings/team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to invite');
  }
  return res.json();
}

async function removeMember(id: string) {
  const res = await fetch(`/api/settings/team/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to remove');
  }
  return res.json();
}

async function fetchApiKeys() {
  const res = await fetch('/api/settings/api-keys');
  if (!res.ok) throw new Error('Failed to fetch API keys');
  return res.json();
}

async function createApiKey(data: { name: string; scopes?: string[] }) {
  const res = await fetch('/api/settings/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create');
  }
  return res.json();
}

async function revokeApiKey(id: string) {
  const res = await fetch(`/api/settings/api-keys/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to revoke');
  return res.json();
}

async function fetchWebhooks() {
  const res = await fetch('/api/settings/webhooks');
  if (!res.ok) throw new Error('Failed to fetch webhooks');
  return res.json();
}

async function createWebhook(data: { name: string; url: string; events: string[] }) {
  const res = await fetch('/api/settings/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create');
  }
  return res.json();
}

async function deleteWebhook(id: string) {
  const res = await fetch(`/api/settings/webhooks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete');
  return res.json();
}

const roleColors: Record<string, string> = {
  owner: 'bg-purple-500/20 text-purple-400',
  admin: 'bg-blue-500/20 text-blue-400',
  manager: 'bg-emerald-500/20 text-emerald-400',
  staff: 'bg-slate-500/20 text-slate-400',
  observer: 'bg-orange-500/20 text-orange-400',
  viewer: 'bg-slate-500/20 text-slate-400',
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('organization');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  // Organization query
  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: fetchOrganization,
  });

  const [settings, setSettings] = useState<Partial<OrgSettings>>({});

  // Initialize settings when data loads
  if (orgData?.organization && Object.keys(settings).length === 0) {
    setSettings(orgData.organization);
  }

  // Team query
  const { data: teamData } = useQuery({
    queryKey: ['team'],
    queryFn: fetchTeam,
    enabled: activeTab === 'team',
  });

  // API Keys query
  const { data: apiKeysData } = useQuery({
    queryKey: ['api-keys'],
    queryFn: fetchApiKeys,
    enabled: activeTab === 'api',
  });

  // Webhooks query
  const { data: webhooksData } = useQuery({
    queryKey: ['webhooks'],
    queryFn: fetchWebhooks,
    enabled: activeTab === 'api',
  });

  // Mutations
  const saveOrgMutation = useMutation({
    mutationFn: updateOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: inviteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setShowInviteDialog(false);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: removeMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setNewApiKey(data.apiKey.key);
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: createWebhook,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setNewWebhookSecret(data.webhook.secret);
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const handleSaveOrg = () => {
    saveOrgMutation.mutate(settings);
  };

  const teamMembers = teamData?.members || [];
  const apiKeys = apiKeysData?.apiKeys || [];
  const webhooks = webhooksData?.webhooks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your organization settings and preferences.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-900/50 p-1">
          {[
            { value: 'organization', label: 'Organization', icon: Building2 },
            { value: 'team', label: 'Team', icon: Users },
            { value: 'security', label: 'Security', icon: Shield },
            { value: 'notifications', label: 'Notifications', icon: Bell },
            { value: 'api', label: 'API & Webhooks', icon: Webhook },
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

        {/* Organization Tab */}
        <Tabs.Content value="organization" className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-6 text-lg font-semibold text-white">Organization Profile</h3>

            {orgLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Logo Upload */}
                <div className="flex items-center gap-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-800 text-2xl font-bold text-white">
                    {settings.name?.[0] || 'O'}
                  </div>
                  <div>
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                      Upload Logo
                    </button>
                    <p className="mt-1 text-xs text-slate-500">PNG, JPG up to 2MB</p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={settings.name || ''}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      URL Slug
                    </label>
                    <div className="mt-1 flex items-center">
                      <span className="rounded-l-lg border border-r-0 border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-500">
                        observernet.com/
                      </span>
                      <input
                        type="text"
                        value={settings.slug || ''}
                        onChange={(e) => setSettings({ ...settings, slug: e.target.value })}
                        className="flex-1 rounded-r-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Description
                  </label>
                  <textarea
                    value={settings.description || ''}
                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Website
                    </label>
                    <input
                      type="url"
                      value={settings.websiteUrl || ''}
                      onChange={(e) => setSettings({ ...settings, websiteUrl: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={settings.contactEmail || ''}
                      onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Timezone
                  </label>
                  <select
                    value={settings.timezone || 'UTC'}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveOrg}
                    disabled={saveOrgMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {saveOrgMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {saveOrgMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* Team Tab */}
        <Tabs.Content value="team" className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Team Members</h3>
              <button
                onClick={() => setShowInviteDialog(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                Invite Member
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-700">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                      Member
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                      Last Active
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {teamMembers.map((member: TeamMember) => (
                    <tr key={member.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white">
                            {member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white">{member.name}</p>
                            <p className="text-sm text-slate-400">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[member.role] || roleColors.staff}`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {member.status === 'active' ? (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle className="h-4 w-4" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-400">
                            <AlertTriangle className="h-4 w-4" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {member.lastActive
                          ? new Date(member.lastActive).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white">
                          <Edit className="h-4 w-4" />
                        </button>
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => removeMemberMutation.mutate(member.id)}
                            className="ml-1 rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Tabs.Content>

        {/* Security Tab */}
        <Tabs.Content value="security" className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-6 text-lg font-semibold text-white">Security Settings</h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-slate-800">
                <div>
                  <p className="font-medium text-white">Two-Factor Authentication</p>
                  <p className="text-sm text-slate-400">Require 2FA for all team members</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-slate-800">
                <div>
                  <p className="font-medium text-white">Session Timeout</p>
                  <p className="text-sm text-slate-400">Auto-logout after inactivity</p>
                </div>
                <select className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white">
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="240">4 hours</option>
                  <option value="480">8 hours</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-white">Audit Log Retention</p>
                  <p className="text-sm text-slate-400">How long to keep audit logs</p>
                </div>
                <select className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white">
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                  <option value="forever">Forever</option>
                </select>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Notifications Tab */}
        <Tabs.Content value="notifications" className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-6 text-lg font-semibold text-white">Email Notifications</h3>

            <div className="space-y-4">
              {[
                { id: 'election_started', label: 'Election Started', description: 'When an election begins voting' },
                { id: 'election_ended', label: 'Election Ended', description: 'When voting period closes' },
                { id: 'turnout_milestone', label: 'Turnout Milestones', description: 'At 25%, 50%, 75% turnout' },
                { id: 'paper_ballot', label: 'Paper Ballot Uploaded', description: 'New paper ballots awaiting review' },
                { id: 'security_alert', label: 'Security Alerts', description: 'Failed logins, suspicious activity' },
              ].map((notification) => (
                <div key={notification.id} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
                  <div>
                    <p className="font-medium text-white">{notification.label}</p>
                    <p className="text-sm text-slate-400">{notification.description}</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" defaultChecked className="peer sr-only" />
                    <div className="h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </Tabs.Content>

        {/* API Tab */}
        <Tabs.Content value="api" className="mt-6 space-y-6">
          {/* API Keys */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">API Keys</h3>
              <button
                onClick={() => setShowApiKeyDialog(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                Create Key
              </button>
            </div>

            <div className="space-y-3">
              {apiKeys.map((key: ApiKey) => (
                <div key={key.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <div className="flex items-center gap-4">
                    <Key className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-white">{key.name}</p>
                      <p className="text-sm text-slate-400 font-mono">{key.prefix}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span>Last used: {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}</span>
                    <button
                      onClick={() => revokeKeyMutation.mutate(key.id)}
                      className="rounded p-1 hover:bg-slate-700 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {apiKeys.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">No API keys created yet</p>
              )}
            </div>
          </div>

          {/* Webhooks */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Webhooks</h3>
              <button
                onClick={() => setShowWebhookDialog(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                Add Webhook
              </button>
            </div>

            <div className="space-y-3">
              {webhooks.map((webhook: WebhookItem) => (
                <div key={webhook.id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white">{webhook.name}</p>
                      <p className="font-mono text-sm text-slate-400">{webhook.url}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {webhook.events.map((event: string) => (
                          <span key={event} className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                            {event}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-sm text-emerald-400">
                        <CheckCircle className="h-4 w-4" />
                        {webhook.status}
                      </span>
                      <button
                        onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {webhook.lastTriggered && (
                    <p className="mt-2 text-xs text-slate-500">
                      Last triggered: {new Date(webhook.lastTriggered).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
              {webhooks.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">No webhooks configured yet</p>
              )}
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Invite Member Dialog */}
      <InviteDialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        onInvite={(email, role) => inviteMutation.mutate({ email, role })}
        isPending={inviteMutation.isPending}
      />

      {/* Create API Key Dialog */}
      <ApiKeyDialog
        open={showApiKeyDialog}
        onClose={() => {
          setShowApiKeyDialog(false);
          setNewApiKey(null);
        }}
        onCreate={(name) => createKeyMutation.mutate({ name })}
        isPending={createKeyMutation.isPending}
        newKey={newApiKey}
      />

      {/* Create Webhook Dialog */}
      <WebhookDialog
        open={showWebhookDialog}
        onClose={() => {
          setShowWebhookDialog(false);
          setNewWebhookSecret(null);
        }}
        onCreate={(data) => createWebhookMutation.mutate(data)}
        isPending={createWebhookMutation.isPending}
        newSecret={newWebhookSecret}
      />
    </div>
  );
}

// Invite Dialog Component
function InviteDialog({ open, onClose, onInvite, isPending }: {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string, role: string) => void;
  isPending: boolean;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <Dialog.Title className="text-lg font-semibold text-white">Invite Team Member</Dialog.Title>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                placeholder="colleague@example.org"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="viewer">Viewer</option>
                <option value="observer">Observer</option>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700">
              Cancel
            </button>
            <button
              onClick={() => onInvite(email, role)}
              disabled={!email || isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Invite'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// API Key Dialog Component
function ApiKeyDialog({ open, onClose, onCreate, isPending, newKey }: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  isPending: boolean;
  newKey: string | null;
}) {
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <Dialog.Title className="text-lg font-semibold text-white">
            {newKey ? 'API Key Created' : 'Create API Key'}
          </Dialog.Title>

          {newKey ? (
            <div className="mt-4">
              <p className="text-sm text-slate-400 mb-3">
                Copy your API key now. It will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newKey}
                  readOnly
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-mono text-sm text-white"
                />
                <button onClick={copyKey} className="rounded-lg bg-slate-700 p-2 text-slate-300 hover:bg-slate-600">
                  {copied ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Key Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Production API"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={onClose} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700">
                  Cancel
                </button>
                <button
                  onClick={() => onCreate(name)}
                  disabled={!name || isPending}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Key'}
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Webhook Dialog Component
function WebhookDialog({ open, onClose, onCreate, isPending, newSecret }: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; url: string; events: string[] }) => void;
  isPending: boolean;
  newSecret: string | null;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const availableEvents = [
    'election.created',
    'election.started',
    'election.ended',
    'vote.created',
    'voter.verified',
    'paper_ballot.uploaded',
  ];

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const copySecret = () => {
    if (newSecret) {
      navigator.clipboard.writeText(newSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <Dialog.Title className="text-lg font-semibold text-white">
            {newSecret ? 'Webhook Created' : 'Add Webhook'}
          </Dialog.Title>

          {newSecret ? (
            <div className="mt-4">
              <p className="text-sm text-slate-400 mb-3">
                Save your webhook secret. It will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSecret}
                  readOnly
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-mono text-sm text-white"
                />
                <button onClick={copySecret} className="rounded-lg bg-slate-700 p-2 text-slate-300 hover:bg-slate-600">
                  {copied ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="My Webhook"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="https://api.example.org/webhook"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Events</label>
                <div className="flex flex-wrap gap-2">
                  {availableEvents.map((event) => (
                    <button
                      key={event}
                      type="button"
                      onClick={() => toggleEvent(event)}
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        events.includes(event)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={onClose} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700">
                  Cancel
                </button>
                <button
                  onClick={() => onCreate({ name, url, events })}
                  disabled={!name || !url || events.length === 0 || isPending}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Webhook'}
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
