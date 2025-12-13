'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Vote,
  Users,
  FileText,
  ClipboardList,
  KeyRound,
  Settings,
  BarChart3,
  Bell,
  Shield,
  HelpCircle,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  children?: { href: string; label: string }[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    href: '/elections',
    label: 'Elections',
    icon: Vote,
    children: [
      { href: '/elections', label: 'All Elections' },
      { href: '/elections/new', label: 'Create Election' },
      { href: '/elections/templates', label: 'Templates' },
    ],
  },
  {
    href: '/voters',
    label: 'Voters',
    icon: Users,
    children: [
      { href: '/voters', label: 'Voter Registry' },
      { href: '/voters/allowlists', label: 'Allowlists' },
      { href: '/voters/codes', label: 'Access Codes' },
      { href: '/voters/imports', label: 'Import History' },
    ],
  },
  {
    href: '/paper-ballots',
    label: 'Paper Ballots',
    icon: FileText,
    badge: 12,
  },
  { href: '/results', label: 'Results & Reports', icon: BarChart3 },
  { href: '/audit-log', label: 'Audit Log', icon: ClipboardList },
];

const bottomNavItems: NavItem[] = [
  { href: '/notifications', label: 'Notifications', icon: Bell, badge: 3 },
  { href: '/security', label: 'Security', icon: Shield },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help & Docs', icon: HelpCircle },
];

interface SidebarLinkProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
}

function SidebarLink({ item, isActive, isCollapsed }: SidebarLinkProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const Icon = item.icon;

  const hasChildren = item.children && item.children.length > 0;
  const isChildActive = hasChildren && item.children.some(c => pathname === c.href);

  if (hasChildren && !isCollapsed) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={clsx(
            'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive || isChildActive
              ? 'bg-blue-600/20 text-blue-400'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          )}
        >
          <span className="flex items-center gap-3">
            <Icon className="h-5 w-5" />
            {item.label}
          </span>
          <ChevronDown
            className={clsx(
              'h-4 w-4 transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        </button>
        {isExpanded && (
          <div className="ml-8 mt-1 space-y-1">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={clsx(
                  'block rounded-lg px-3 py-2 text-sm transition-colors',
                  pathname === child.href
                    ? 'bg-blue-600/10 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={clsx(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-blue-600/20 text-blue-400'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white',
        isCollapsed && 'justify-center'
      )}
      title={isCollapsed ? item.label : undefined}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!isCollapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  currentOrg?: { id: string; name: string; logo?: string };
}

export function AdminSidebar({ isCollapsed = false, currentOrg }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-slate-800 bg-slate-950 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Organization Switcher */}
      <div className="flex h-16 items-center border-b border-slate-800 px-4">
        {isCollapsed ? (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
            {currentOrg?.name?.[0] || 'O'}
          </div>
        ) : (
          <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
              {currentOrg?.name?.[0] || 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {currentOrg?.name || 'Demo Organization'}
              </p>
              <p className="text-xs text-slate-400">Admin Portal</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-slate-800 px-3 py-4 space-y-1">
        {bottomNavItems.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            isActive={pathname === item.href}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>
    </aside>
  );
}
