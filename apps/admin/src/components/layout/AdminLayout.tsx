'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Mock user - replace with actual auth
  const user = {
    name: 'Election Manager',
    email: 'admin@demo.org',
    role: 'Organization Admin',
  };

  const currentOrg = {
    id: 'demo-org',
    name: 'Demo Organization',
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile sidebar backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless open */}
      <div className={clsx('hidden lg:block', isMobileSidebarOpen && 'block')}>
        <AdminSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          currentOrg={currentOrg}
        />
      </div>

      {/* Mobile sidebar */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden">
          <AdminSidebar currentOrg={currentOrg} />
        </div>
      )}

      {/* Header */}
      <AdminHeader
        onMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isSidebarCollapsed={isSidebarCollapsed}
        user={user}
      />

      {/* Main content */}
      <main
        className={clsx(
          'min-h-screen pt-16 transition-all duration-300',
          isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
        )}
      >
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
