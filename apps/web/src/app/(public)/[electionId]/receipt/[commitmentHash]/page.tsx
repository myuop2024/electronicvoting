import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ReceiptLookup } from '@components/ReceiptLookup';

type ReceiptPageProps = {
  params: { electionId: string; commitmentHash: string };
};

export default function ReceiptPage({ params }: ReceiptPageProps) {
  const { electionId, commitmentHash } = params;
  if (!commitmentHash) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">Vote Receipt</h1>
      <p className="mt-2 text-sm text-slate-600">
        Use this receipt to verify the inclusion of your ballot on the Hyperledger Fabric ledger.
      </p>
      <Suspense fallback={<p className="mt-8 animate-pulse text-slate-500">Loading receipt...</p>}>
        <ReceiptLookup electionId={electionId} commitmentHash={commitmentHash} />
      </Suspense>
    </div>
  );
}
