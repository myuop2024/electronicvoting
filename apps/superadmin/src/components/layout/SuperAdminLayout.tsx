'use client';

import { SuperAdminSidebar } from './SuperAdminSidebar';
import { SuperAdminHeader } from './SuperAdminHeader';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  // Mock user - replace with actual auth
  const user = {
    name: 'Super Admin',
    email: 'superadmin@observernet.com',
    role: 'Platform Administrator',
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <SuperAdminSidebar />
      <SuperAdminHeader user={user} />
      <main className="min-h-screen pl-64 pt-16">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
