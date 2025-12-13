'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown, Bell, Search, User, LogOut, Settings, Building2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../lib/utils';

// Mobile Menu Context
const MobileMenuContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

export function useMobileMenu() {
  return React.useContext(MobileMenuContext);
}

// Header Component
interface HeaderProps {
  logo?: React.ReactNode;
  user?: {
    name: string;
    email: string;
    avatarUrl?: string;
    orgName?: string;
  };
  onLogout?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onOrgSwitch?: () => void;
  notifications?: number;
  onNotificationsClick?: () => void;
  searchEnabled?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  logo,
  user,
  onLogout,
  onProfileClick,
  onSettingsClick,
  onOrgSwitch,
  notifications,
  onNotificationsClick,
  searchEnabled,
  onSearch,
  className,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <MobileMenuContext.Provider value={{ isOpen: mobileMenuOpen, setIsOpen: setMobileMenuOpen }}>
      <header
        className={cn(
          'sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/80',
          className
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            {logo && <div className="flex shrink-0 items-center">{logo}</div>}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex lg:items-center lg:gap-1">{children}</nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            {searchEnabled && (
              <button
                type="button"
                className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 sm:block dark:text-slate-400 dark:hover:bg-slate-800"
                onClick={() => onSearch?.('')}
              >
                <Search className="h-5 w-5" />
              </button>
            )}

            {/* Notifications */}
            {onNotificationsClick && (
              <button
                type="button"
                className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                onClick={onNotificationsClick}
              >
                <Bell className="h-5 w-5" />
                {notifications && notifications > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                    {notifications > 99 ? '99+' : notifications}
                  </span>
                )}
              </button>
            )}

            {/* User Menu */}
            {user && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg p-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="hidden text-left md:block">
                      <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                      {user.orgName && (
                        <p className="text-xs text-slate-500">{user.orgName}</p>
                      )}
                    </div>
                    <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="z-50 min-w-[200px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                    align="end"
                    sideOffset={8}
                  >
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
                    {onProfileClick && (
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 outline-none hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={onProfileClick}
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </DropdownMenu.Item>
                    )}
                    {onSettingsClick && (
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 outline-none hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={onSettingsClick}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </DropdownMenu.Item>
                    )}
                    {onOrgSwitch && (
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 outline-none hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={onOrgSwitch}
                      >
                        <Building2 className="h-4 w-4" />
                        Switch Organization
                      </DropdownMenu.Item>
                    )}
                    {onLogout && (
                      <>
                        <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 outline-none hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          onClick={onLogout}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </DropdownMenu.Item>
                      </>
                    )}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 lg:hidden dark:border-slate-800 dark:bg-slate-900">
            <nav className="flex flex-col gap-1">{children}</nav>
          </div>
        )}
      </header>
    </MobileMenuContext.Provider>
  );
};

// Nav Link Component
interface NavLinkProps {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  exact?: boolean;
  className?: string;
}

export const NavLink: React.FC<NavLinkProps> = ({ href, icon, children, exact, className }) => {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </Link>
  );
};

// Sidebar Component
interface SidebarProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ children, header, footer, className, collapsed }) => {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900',
        collapsed ? 'w-16' : 'w-64',
        'hidden lg:flex',
        className
      )}
    >
      {header && (
        <div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-4 dark:border-slate-800">
          {header}
        </div>
      )}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-1">{children}</div>
      </nav>
      {footer && (
        <div className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-800">{footer}</div>
      )}
    </aside>
  );
};

// Sidebar Link Component
interface SidebarLinkProps {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  badge?: string | number;
  exact?: boolean;
  collapsed?: boolean;
}

export const SidebarLink: React.FC<SidebarLinkProps> = ({
  href,
  icon,
  children,
  badge,
  exact,
  collapsed,
}) => {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? String(children) : undefined}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {!collapsed && <span className="flex-1">{children}</span>}
      {!collapsed && badge !== undefined && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-200 px-1.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
          {badge}
        </span>
      )}
    </Link>
  );
};

// Sidebar Section Component
interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  collapsed?: boolean;
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({ title, children, collapsed }) => {
  return (
    <div className="py-2">
      {title && !collapsed && (
        <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h3>
      )}
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
};

// Breadcrumbs Component
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  return (
    <nav className={cn('flex items-center gap-2 text-sm', className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-slate-400">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-900 dark:text-white">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
