'use client';

import { useState } from 'react';
import {
  Building2,
  Users,
  Shield,
  Bell,
  Palette,
  Globe,
  Key,
  Webhook,
  Database,
  Mail,
  Save,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

// Mock data
const orgSettings = {
  name: 'Demo Organization',
  slug: 'demo-org',
  logo: null,
  description: 'A demonstration organization for ObserverNet',
  website: 'https://example.org',
  supportEmail: 'support@example.org',
  timezone: 'America/New_York',
  defaultLanguage: 'en',
};

const teamMembers = [
  { id: '1', name: 'Admin User', email: 'admin@example.org', role: 'owner', status: 'active', lastActive: '2024-03-15T10:30:00Z' },
  { id: '2', name: 'Staff Member', email: 'staff@example.org', role: 'admin', status: 'active', lastActive: '2024-03-15T09:15:00Z' },
  { id: '3', name: 'Observer', email: 'observer@example.org', role: 'observer', status: 'active', lastActive: '2024-03-14T16:45:00Z' },
  { id: '4', name: 'Pending User', email: 'pending@example.org', role: 'staff', status: 'pending', lastActive: null },
];

const apiKeys = [
  { id: '1', name: 'Production API', prefix: 'ev_prod_...a1b2', createdAt: '2024-01-15', lastUsed: '2024-03-15', status: 'active' },
  { id: '2', name: 'Development API', prefix: 'ev_dev_...c3d4', createdAt: '2024-02-20', lastUsed: '2024-03-14', status: 'active' },
];

const webhooks = [
  { id: '1', url: 'https://api.example.org/webhooks/votes', events: ['vote.created'], status: 'active', lastTriggered: '2024-03-15T10:28:00Z' },
  { id: '2', url: 'https://slack.com/api/webhook', events: ['election.started', 'election.ended'], status: 'active', lastTriggered: '2024-03-10T09:00:00Z' },
];

const roleColors = {
  owner: 'bg-purple-500/20 text-purple-400',
  admin: 'bg-blue-500/20 text-blue-400',
  manager: 'bg-emerald-500/20 text-emerald-400',
  staff: 'bg-slate-500/20 text-slate-400',
  observer: 'bg-orange-500/20 text-orange-400',
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('organization');
  const [settings, setSettings] = useState(orgSettings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Save to API
    await new Promise((r) => setTimeout(r, 1000));
    setIsSaving(false);
  };

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

            <div className="space-y-6">
              {/* Logo Upload */}
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-800 text-2xl font-bold text-white">
                  {settings.name[0]}
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
                    value={settings.name}
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
                      value={settings.slug}
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
                  value={settings.description}
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
                    value={settings.website}
                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Timezone
                  </label>
                  <select
                    value={settings.timezone}
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
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Default Language
                  </label>
                  <select
                    value={settings.defaultLanguage}
                    onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Team Tab */}
        <Tabs.Content value="team" className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Team Members</h3>
              <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
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
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white">
                            {member.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-white">{member.name}</p>
                            <p className="text-sm text-slate-400">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[member.role as keyof typeof roleColors]}`}>
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
                          <button className="ml-1 rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-red-400">
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

              <div className="flex items-center justify-between py-4 border-b border-slate-800">
                <div>
                  <p className="font-medium text-white">IP Allowlist</p>
                  <p className="text-sm text-slate-400">Restrict access to specific IPs</p>
                </div>
                <button className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
                  Configure
                </button>
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
                { id: 'weekly_summary', label: 'Weekly Summary', description: 'Weekly overview of all elections' },
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
              <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                <Plus className="h-4 w-4" />
                Create Key
              </button>
            </div>

            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <div className="flex items-center gap-4">
                    <Key className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-white">{key.name}</p>
                      <p className="text-sm text-slate-400 font-mono">{key.prefix}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span>Last used: {key.lastUsed}</span>
                    <button className="rounded p-1 hover:bg-slate-700 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Webhooks */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Webhooks</h3>
              <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                <Plus className="h-4 w-4" />
                Add Webhook
              </button>
            </div>

            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm text-white">{webhook.url}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {webhook.events.map((event) => (
                          <span key={event} className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                            {event}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-sm text-emerald-400">
                        <CheckCircle className="h-4 w-4" />
                        Active
                      </span>
                      <button className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Last triggered: {new Date(webhook.lastTriggered).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
