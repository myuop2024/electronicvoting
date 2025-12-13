'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Building2,
  Users,
  Server,
  Shield,
  Settings,
  BarChart3,
  Database,
  Activity,
  CreditCard,
  Bell,
  FileText,
  Globe,
  Zap,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/fabric', label: 'Fabric Network', icon: Database },
  { href: '/infrastructure', label: 'Infrastructure', icon: Server },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/billing', label: 'Billing', icon: CreditCard },
];

const systemNavItems: NavItem[] = [
  { href: '/audit-logs', label: 'Audit Logs', icon: FileText },
  { href: '/security', label: 'Security', icon: Shield, badge: '2', badgeColor: 'bg-red-500' },
  { href: '/notifications', label: 'Notifications', icon: Bell, badge: 5 },
  { href: '/feature-flags', label: 'Feature Flags', icon: Zap },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarLinkProps {
  item: NavItem;
  isActive: boolean;
}

function SidebarLink({ item, isActive }: SidebarLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={clsx(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-indigo-600/20 text-indigo-400'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className={`rounded-full ${item.badgeColor || 'bg-slate-600'} px-2 py-0.5 text-xs font-semibold text-white`}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function SuperAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-800 bg-slate-950">
      {/* Header */}
      <div className="flex h-16 items-center border-b border-slate-800 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white">
            ON
          </div>
          <div>
            <p className="font-semibold text-white">ObserverNet</p>
            <p className="text-xs text-indigo-400">Platform Admin</p>
          </div>
        </div>
      </div>

      {/* System Health Indicator */}
      <div className="border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase">System Status</span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Operational
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-slate-500">
          Platform
        </p>
        {navItems.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}

        <div className="my-4 border-t border-slate-800" />

        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-slate-500">
          System
        </p>
        {systemNavItems.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-slate-800 p-4">
        <Link
          href="/help"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <HelpCircle className="h-4 w-4" />
          Documentation
        </Link>
      </div>
    </aside>
  );
}
