'use client';

import { useState } from 'react';
import axios from 'axios';
import { ElectionPolicySchema } from '@electronicvoting/proto/schemas';

const defaultPolicy = ElectionPolicySchema.parse({
  startAt: new Date().toISOString(),
  endAt: new Date(Date.now() + 86_400_000).toISOString(),
  allowOffline: true,
  allowChannels: ['web', 'whatsapp', 'api'],
  verificationMode: 'hybrid',
  voteType: 'plurality',
  geoFence: undefined,
  deviceLimit: 5,
  ipThrottle: 100,
  captcha: true
});

type PolicyDesignerProps = {
  electionId: string;
};

export function PolicyDesigner({ electionId }: PolicyDesignerProps) {
  const [policy, setPolicy] = useState(defaultPolicy);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const updatePolicy = async () => {
    setStatus('saving');
    try {
      const payload = ElectionPolicySchema.parse(policy);
      await axios.put(`/api/elections/${electionId}/policies`, payload);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Election policies</h2>
          <p className="text-sm text-slate-300">Configure verification requirements, rate limits, and vote types.</p>
        </div>
        <button
          type="button"
          onClick={updatePolicy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Save policies
        </button>
      </div>
      <section className="grid gap-6 md:grid-cols-2">
        <fieldset className="space-y-3 rounded-lg border border-slate-800 p-4">
          <legend className="text-sm font-semibold uppercase tracking-wide text-slate-400">Verification</legend>
          <label className="flex items-center justify-between text-sm text-slate-200">
            Mode
            <select
              value={policy.verificationMode}
              onChange={(event) => setPolicy((prev) => ({ ...prev, verificationMode: event.target.value as typeof prev.verificationMode }))}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
            >
              <option value="code-only">Code only</option>
              <option value="didit-only">Didit only</option>
              <option value="hybrid">Hybrid (both)</option>
            </select>
          </label>
          <label className="flex items-center justify-between text-sm text-slate-200">
            CAPTCHA
            <input
              type="checkbox"
              checked={policy.captcha}
              onChange={(event) => setPolicy((prev) => ({ ...prev, captcha: event.target.checked }))}
            />
          </label>
        </fieldset>
        <fieldset className="space-y-3 rounded-lg border border-slate-800 p-4">
          <legend className="text-sm font-semibold uppercase tracking-wide text-slate-400">Rate limits</legend>
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Device limit per voter
            <input
              type="number"
              value={policy.deviceLimit ?? 0}
              onChange={(event) =>
                setPolicy((prev) => ({ ...prev, deviceLimit: Number.parseInt(event.target.value, 10) || 0 }))
              }
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-white"
            />
          </label>
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            IP throttle per hour
            <input
              type="number"
              value={policy.ipThrottle ?? 0}
              onChange={(event) =>
                setPolicy((prev) => ({ ...prev, ipThrottle: Number.parseInt(event.target.value, 10) || 0 }))
              }
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-white"
            />
          </label>
        </fieldset>
      </section>
      {status === 'success' ? (
        <p className="text-sm text-emerald-400">Policies saved successfully.</p>
      ) : null}
      {status === 'error' ? <p className="text-sm text-red-400">Could not save policies.</p> : null}
    </div>
  );
}
