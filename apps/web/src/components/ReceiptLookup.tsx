'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

type ReceiptLookupProps = {
  electionId: string;
  commitmentHash: string;
};

type ReceiptResponse = {
  commitmentHash: string;
  fabricTxId: string;
  verified: boolean;
  talliedAt?: string;
};

export function ReceiptLookup({ electionId, commitmentHash }: ReceiptLookupProps) {
  const [receipt, setReceipt] = useState<ReceiptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReceipt() {
      try {
        setError(null);
        const response = await axios.get<ReceiptResponse>(`/api/elections/${electionId}/receipt/${commitmentHash}`);
        setReceipt(response.data);
      } catch (err) {
        console.error(err);
        setError('Unable to locate receipt. Please confirm your commitment hash or try again later.');
      }
    }
    fetchReceipt();
  }, [commitmentHash, electionId]);

  if (error) {
    return <p className="mt-6 text-sm text-red-600">{error}</p>;
  }

  if (!receipt) {
    return <p className="mt-6 text-sm text-slate-500">Retrieving receipt from Fabric...</p>;
  }

  return (
    <div className="mt-8 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow">
      <div>
        <p className="text-xs uppercase text-slate-500">Commitment Hash</p>
        <p className="font-mono text-sm text-slate-900">{receipt.commitmentHash}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-slate-500">Fabric Transaction ID</p>
        <p className="font-mono text-sm text-emerald-600">{receipt.fabricTxId}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-slate-500">Verification Status</p>
        <p className="text-sm font-semibold text-slate-900">{receipt.verified ? 'Included in tally' : 'Pending inclusion'}</p>
      </div>
      {receipt.talliedAt ? (
        <div>
          <p className="text-xs uppercase text-slate-500">Tallied At</p>
          <p className="text-sm text-slate-900">{new Date(receipt.talliedAt).toLocaleString()}</p>
        </div>
      ) : null}
    </div>
  );
}
