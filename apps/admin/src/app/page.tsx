import Link from 'next/link';
import { ElectionOverview } from '../components/ElectionOverview';

const quickActions = [
  { href: '/elections/new', label: 'Create election' },
  { href: '/allowlists', label: 'Upload allowlist' },
  { href: '/codes', label: 'Generate voting codes' },
  { href: '/paper', label: 'Paper ballots' }
];

export default function AdminHomePage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-white">Welcome back, Election Manager</h2>
          <p className="mt-2 text-sm text-slate-300">
            Monitor turnout, enforce security policies, and publish transparent results.
          </p>
        </div>
        <div className="flex gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>
      <ElectionOverview />
    </div>
  );
}
