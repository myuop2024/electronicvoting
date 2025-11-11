'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

type FabricHealth = {
  height: number;
  lastEventTime: string;
  peers: Array<{ name: string; status: 'online' | 'offline'; lastBlock: number }>;
};

export function FabricStatus() {
  const [health, setHealth] = useState<FabricHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await axios.get<FabricHealth>('/api/superadmin/fabric');
        setHealth(response.data);
      } catch (err) {
        console.error(err);
        setError('Unable to reach Fabric health endpoint.');
      }
    }
    load();
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!health) {
    return <p className="text-sm text-slate-500">Checking Fabric network...</p>;
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Ledger height</p>
        <p className="text-xl font-semibold text-slate-900">{health.height}</p>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Last event</p>
        <p className="text-sm text-slate-900">{new Date(health.lastEventTime).toLocaleString()}</p>
      </div>
      <div>
        <p className="text-sm text-slate-500">Peers</p>
        <ul className="mt-2 space-y-2">
          {health.peers.map((peer) => (
            <li key={peer.name} className="flex items-center justify-between text-sm">
              <span>{peer.name}</span>
              <span className={peer.status === 'online' ? 'text-emerald-600' : 'text-red-600'}>
                {peer.status.toUpperCase()} • block {peer.lastBlock}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
