'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  Menu,
  X,
  Search,
  Bell,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Sun,
  Moon,
  HelpCircle,
  Keyboard,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface AdminHeaderProps {
  onMenuToggle: () => void;
  isSidebarCollapsed: boolean;
  user?: {
    name: string;
    email: string;
    image?: string;
    role: string;
  };
}

export function AdminHeader({ onMenuToggle, isSidebarCollapsed, user }: AdminHeaderProps) {
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
    <header
      className={clsx(
        'fixed top-0 right-0 z-20 flex h-16 items-center border-b border-slate-800 bg-slate-950/95 backdrop-blur transition-all duration-300',
        isSidebarCollapsed ? 'left-16' : 'left-64'
      )}
    >
      <div className="flex flex-1 items-center justify-between px-4 lg:px-6">
        {/* Left: Menu toggle + Breadcrumbs */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <nav className="hidden items-center gap-2 text-sm md:flex">
            <Link href="/dashboard" className="text-slate-400 hover:text-white">
              Home
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
        </div>

        {/* Right: Search, Notifications, User */}
        <div className="flex items-center gap-2">
          {/* Global Search */}
          {isSearchOpen ? (
            <div className="relative">
              <input
                type="text"
                placeholder="Search elections, voters..."
                className="w-64 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                autoFocus
                onBlur={() => setIsSearchOpen(false)}
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-400 hover:border-slate-600 hover:text-white"
            >
              <Search className="h-4 w-4" />
              <span className="hidden lg:inline">Search...</span>
              <kbd className="ml-2 hidden rounded bg-slate-700 px-1.5 py-0.5 text-xs lg:inline">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Keyboard Shortcuts */}
          <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <Keyboard className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* User Menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-800">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                    {user?.name?.[0] || 'U'}
                  </div>
                )}
                <div className="hidden text-left lg:block">
                  <p className="text-sm font-medium text-white">
                    {user?.name || 'Admin User'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {user?.role || 'Organization Admin'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
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
                  <HelpCircle className="h-4 w-4" />
                  Help & Support
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
      </div>
    </header>
  );
}
