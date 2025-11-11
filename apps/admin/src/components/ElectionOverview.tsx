'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const fetchDashboard = async () => {
  const { data } = await axios.get('/api/admin/dashboard');
  return data as {
    activeElections: number;
    pendingReviews: number;
    turnout: number;
    offlineBallotsPending: number;
  };
};

export function ElectionOverview() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: fetchDashboard });

  if (isLoading || !data) {
    return <p className="text-sm text-slate-400">Loading election analytics...</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard label="Active elections" value={data.activeElections} />
      <StatCard label="Pending reviews" value={data.pendingReviews} />
      <StatCard label="Turnout" value={`${data.turnout}%`} />
      <StatCard label="Offline ballots to audit" value={data.offlineBallotsPending} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
