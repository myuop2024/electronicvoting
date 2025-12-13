import Link from 'next/link';
import {
  Shield,
  Vote,
  BarChart3,
  Globe,
  Smartphone,
  Lock,
  Users,
  FileCheck,
  ArrowRight,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { PublicHeader } from '../components/layout/PublicHeader';
import { Footer } from '../components/layout/Footer';

const features = [
  {
    icon: Shield,
    title: 'Blockchain Security',
    description: 'Every vote is recorded on Hyperledger Fabric with tamper-proof cryptographic verification.',
  },
  {
    icon: Vote,
    title: 'Multiple Vote Types',
    description: 'Support for plurality, approval, ranked-choice, and weighted voting systems.',
  },
  {
    icon: Smartphone,
    title: 'WhatsApp Voting',
    description: 'Cast ballots through secure WhatsApp conversations with full verification.',
  },
  {
    icon: Globe,
    title: 'Multi-Language',
    description: 'Run elections in multiple languages with complete localization support.',
  },
  {
    icon: Lock,
    title: 'Identity Verification',
    description: 'Integrate with Didit.me for secure identity verification and fraud prevention.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Results',
    description: 'Live dashboards with channel breakdown and geographic analytics.',
  },
];

const stats = [
  { value: '10M+', label: 'Votes Cast' },
  { value: '500+', label: 'Organizations' },
  { value: '99.9%', label: 'Uptime' },
  { value: '150+', label: 'Countries' },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 py-16 sm:py-20 lg:py-32">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur">
                  <Shield className="h-4 w-4" />
                  Blockchain-Secured Voting
                </div>
                <h1 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl">
                  Run Verifiable Elections with{' '}
                  <span className="text-blue-200">Civic-Grade Trust</span>
                </h1>
                <p className="mt-6 text-base text-blue-100 sm:text-lg lg:text-xl">
                  Launch multi-channel elections, verify identities securely, and store
                  tamper-evident ballots on Hyperledger Fabric. Completely transparent.
                  Zero platform fees.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:mt-10 sm:flex-row sm:justify-center lg:justify-start">
                  <Link
                    href="/org/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-blue-700 shadow-lg transition hover:bg-blue-50 hover:shadow-xl sm:px-8 sm:py-4"
                  >
                    Host an Election
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/verify"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-6 py-3 text-base font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:px-8 sm:py-4"
                  >
                    <Play className="h-5 w-5" />
                    Watch Demo
                  </Link>
                </div>
              </div>
              <div className="relative hidden lg:block">
                <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
                <div className="relative rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-xl">
                  <div className="rounded-xl bg-slate-900 p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Election Dashboard</h3>
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                        Live
                      </span>
                    </div>
                    <div className="space-y-3">
                      {['Alice Johnson - 42%', 'Bob Smith - 35%', 'Carol Williams - 23%'].map(
                        (item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                            <div className="flex-1">
                              <div className="h-2 w-full rounded-full bg-slate-700">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                                  style={{ width: item.split(' - ')[1] }}
                                />
                              </div>
                              <p className="mt-1 text-xs text-slate-400">{item}</p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4 text-sm text-slate-400">
                      <span>2,847 votes cast</span>
                      <span>67% turnout</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-b border-slate-200 bg-white py-8 sm:py-12 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold text-blue-600 sm:text-3xl lg:text-4xl">{stat.value}</p>
                  <p className="mt-1 text-xs text-slate-600 sm:text-sm dark:text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 sm:py-20 lg:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
                Everything You Need for Secure Elections
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg dark:text-slate-400">
                Built for transparency, accessibility, and trust. Our platform handles every
                aspect of modern digital voting.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-blue-200 hover:shadow-lg sm:p-8 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900"
                >
                  <div className="inline-flex rounded-xl bg-blue-50 p-3 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/20 dark:text-blue-400">
                    <feature.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900 sm:text-lg dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 sm:text-base dark:text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-slate-100 py-16 sm:py-20 lg:py-32 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
                How It Works
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg dark:text-slate-400">
                Launch your first election in minutes. Our platform guides you through every step.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  step: '1',
                  title: 'Create Election',
                  description: 'Set up your election with custom branding, voting rules, and candidate list.',
                  icon: FileCheck,
                },
                {
                  step: '2',
                  title: 'Invite Voters',
                  description: 'Upload your voter list or generate access codes. Enable identity verification.',
                  icon: Users,
                },
                {
                  step: '3',
                  title: 'Collect Votes',
                  description: 'Voters cast ballots via web or WhatsApp. Each vote is blockchain-secured.',
                  icon: Vote,
                },
                {
                  step: '4',
                  title: 'Publish Results',
                  description: 'View real-time tallies, export reports, and share verifiable results.',
                  icon: BarChart3,
                },
              ].map((item) => (
                <div key={item.step} className="relative text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white shadow-lg sm:h-16 sm:w-16 sm:text-2xl">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900 sm:mt-6 sm:text-lg dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 sm:text-sm dark:text-slate-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Verify Vote CTA */}
        <section className="py-16 sm:py-20 lg:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 sm:rounded-3xl">
              <div className="grid lg:grid-cols-2">
                <div className="p-6 sm:p-8 lg:p-12">
                  <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
                    Already Cast Your Vote?
                  </h2>
                  <p className="mt-4 text-base text-slate-300 sm:text-lg">
                    Verify your ballot is included in the final tally using your commitment hash.
                    Every vote is traceable on the blockchain.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:gap-4">
                    <Link
                      href="/verify"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:px-6 sm:py-3 sm:text-base"
                    >
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      Verify Your Vote
                    </Link>
                    <Link
                      href="/how-it-works"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:px-6 sm:py-3 sm:text-base"
                    >
                      Learn More
                    </Link>
                  </div>
                </div>
                <div className="hidden items-center justify-center bg-slate-800/50 p-8 lg:flex">
                  <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6">
                    <p className="text-sm text-slate-400">Commitment Hash</p>
                    <code className="mt-2 block break-all font-mono text-sm text-emerald-400">
                      a7f3b2c1d4e5f6...9a8b7c6d5e4f3
                    </code>
                    <div className="mt-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm text-emerald-400">Verified on Fabric</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-t border-slate-200 bg-white py-16 sm:py-20 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
                Trusted by Organizations Worldwide
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg dark:text-slate-400">
                From small community groups to national organizations, our platform scales to meet your needs.
              </p>
            </div>
            <div className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  quote: "Finally, a voting platform we can trust. The blockchain verification gives our members complete confidence.",
                  author: "Sarah Chen",
                  role: "Union President",
                  org: "Workers United",
                },
                {
                  quote: "The WhatsApp integration increased our voter turnout by 40%. People love the convenience.",
                  author: "Miguel Santos",
                  role: "Executive Director",
                  org: "Community Action Network",
                },
                {
                  quote: "Setting up our board election took 15 minutes. The support team was incredibly helpful.",
                  author: "Emma Thompson",
                  role: "Board Secretary",
                  org: "National Housing Coalition",
                },
              ].map((testimonial, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:rounded-2xl sm:p-6 dark:border-slate-800 dark:bg-slate-800"
                >
                  <p className="text-sm text-slate-700 sm:text-base dark:text-slate-300">"{testimonial.quote}"</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 sm:h-10 sm:w-10" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 sm:text-base dark:text-white">{testimonial.author}</p>
                      <p className="text-xs text-slate-600 sm:text-sm dark:text-slate-400">
                        {testimonial.role}, {testimonial.org}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-blue-600 py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
              Ready to Run Your Election?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-blue-100 sm:text-lg">
              Join hundreds of organizations running transparent, verifiable elections.
              Get started in minutes.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row sm:gap-4">
              <Link
                href="/org/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-blue-700 shadow-lg transition hover:bg-blue-50 sm:px-8 sm:py-4"
              >
                Create Free Account
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10 sm:px-8 sm:py-4"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
