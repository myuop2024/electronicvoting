import Link from 'next/link';
import { Card } from '@electronicvoting/ui';

const features = [
  {
    title: 'Verify Your Vote',
    description: 'Check your commitment hash against the Fabric ledger in real-time.'
  },
  {
    title: 'WhatsApp Voting',
    description: 'Cast ballots through an audited conversational flow with fallback to web.'
  },
  {
    title: 'Transparent Results',
    description: 'Public dashboards separate online and offline tallies with live updates.'
  }
];

export default function LandingPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20">
      <section className="text-center">
        <p className="text-sm uppercase tracking-wide text-slate-600">ObserverNet Election Platform</p>
        <h1 className="mt-4 text-4xl font-bold text-slate-900">Run verifiable elections with civic-grade trust.</h1>
        <p className="mt-4 text-lg text-slate-600">
          Launch multi-channel elections, verify identities with Didit.me, and store tamper-evident ballots on Hyperledger Fabric without fees.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/org/signup"
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-white shadow hover:bg-blue-700"
          >
            Host an Election
          </Link>
          <Link href="/verify" className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700">
            Verify a Vote
          </Link>
        </div>
      </section>
      <section className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} title={feature.title}>
            <p className="text-sm text-slate-600">{feature.description}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
