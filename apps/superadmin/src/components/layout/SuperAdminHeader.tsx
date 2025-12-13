'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Bell,
  User,
  LogOut,
  Settings,
  Shield,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface SuperAdminHeaderProps {
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export function SuperAdminHeader({ user }: SuperAdminHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const pathname = usePathname();

  // Generate breadcrumb from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    return { href, label };
  });

  return (
    <header className="fixed top-0 left-64 right-0 z-20 flex h-16 items-center border-b border-slate-800 bg-slate-950/95 backdrop-blur px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/dashboard" className="text-slate-400 hover:text-white">
          Platform
        </Link>
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center gap-2">
            <span className="text-slate-600">/</span>
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-white">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-slate-400 hover:text-white">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Right Section */}
      <div className="ml-auto flex items-center gap-3">
        {/* Global Search */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-600 hover:text-white"
        >
          <Search className="h-4 w-4" />
          <span className="hidden lg:inline">Search platform...</span>
          <kbd className="ml-2 hidden rounded bg-slate-700 px-1.5 py-0.5 text-xs lg:inline">
            ⌘K
          </kbd>
        </button>

        {/* Live Activity Indicator */}
        <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
          <Activity className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>

        {/* Alerts */}
        <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
          <AlertTriangle className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            2
          </span>
        </button>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-500" />
        </button>

        {/* User Menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-medium text-white">
                {user?.name?.[0] || 'S'}
              </div>
              <div className="hidden text-left lg:block">
                <p className="text-sm font-medium text-white">
                  {user?.name || 'Super Admin'}
                </p>
                <p className="text-xs text-indigo-400">
                  {user?.role || 'Platform Administrator'}
                </p>
              </div>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[200px] rounded-lg border border-slate-700 bg-slate-800 p-1 shadow-xl"
              sideOffset={8}
              align="end"
            >
              <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700">
                <User className="h-4 w-4" />
                Profile
              </DropdownMenu.Item>
              <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700">
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenu.Item>
              <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-700">
                <Shield className="h-4 w-4" />
                Security
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-700" />
              <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 outline-none hover:bg-slate-700">
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
