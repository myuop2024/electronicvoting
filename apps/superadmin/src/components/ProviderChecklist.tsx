'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

type ChecklistItem = {
  id: string;
  label: string;
  status: 'connected' | 'missing' | 'pending';
  docsUrl: string;
};

export function ProviderChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    async function load() {
      const response = await axios.get<ChecklistItem[]>('/api/superadmin/providers');
      setItems(response.data);
    }
    load();
  }, []);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">{item.label}</p>
            <a href={item.docsUrl} className="text-xs text-blue-600" target="_blank" rel="noreferrer">
              Integration guide
            </a>
          </div>
          <span
            className={
              item.status === 'connected'
                ? 'text-xs font-semibold uppercase text-emerald-600'
                : item.status === 'pending'
                ? 'text-xs font-semibold uppercase text-amber-600'
                : 'text-xs font-semibold uppercase text-red-600'
            }
          >
            {item.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
