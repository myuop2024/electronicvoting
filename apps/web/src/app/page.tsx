import Link from 'next/link';
import {
  Shield,
  Vote,
  BarChart3,
  Lock,
  Eye,
  Shuffle,
  CheckCircle2,
  ArrowRight,
  Zap,
  Globe,
  FileCode,
  Users,
  Smartphone,
  X,
  Check,
} from 'lucide-react';
import { PublicHeader } from '../components/layout/PublicHeader';
import { Footer } from '../components/layout/Footer';

const cryptoFeatures = [
  {
    icon: Lock,
    title: 'Zero-Knowledge Proofs',
    tagline: 'Mathematically Proven Correct Tallies',
    description: 'ZK-SNARKs prove tallies are computed correctly without revealing how anyone voted. No trust required — just math.',
    badge: 'Groth16',
    color: 'purple',
  },
  {
    icon: Shuffle,
    title: 'Threshold Mix-Net',
    tagline: 'Unbreakable Voter Anonymity',
    description: 'Multi-party threshold encryption with verifiable shuffles. Privacy guaranteed even if all-but-one servers are compromised.',
    badge: '5-of-5 Nodes',
    color: 'blue',
  },
  {
    icon: Shield,
    title: 'Hyperledger Blockchain',
    tagline: 'Immutable Public Audit Trail',
    description: 'Every ballot commitment anchored on permissioned blockchain. Tamper-proof, publicly verifiable, enterprise-grade.',
    badge: 'Fabric 2.5+',
    color: 'green',
  },
  {
    icon: Eye,
    title: 'Public Verifiability',
    tagline: 'Anyone Can Verify Results',
    description: 'Complete transparency without compromising privacy. Observers verify proofs, merkle trees, and blockchain independently.',
    badge: 'Open Data',
    color: 'orange',
  },
];

const platformComparison = [
  {
    feature: 'Zero-Knowledge Tally Proofs',
    observernet: true,
    helios: false,
    vocdoni: false,
    voatz: false,
  },
  {
    feature: 'Threshold Mix-Net Anonymity',
    observernet: true,
    helios: false,
    vocdoni: false,
    voatz: false,
  },
  {
    feature: 'Blockchain Verifiability',
    observernet: true,
    helios: false,
    vocdoni: true,
    voatz: true,
  },
  {
    feature: 'Coercion-Resistant Design',
    observernet: true,
    helios: false,
    vocdoni: false,
    voatz: false,
  },
  {
    feature: 'Open Source',
    observernet: true,
    helios: true,
    vocdoni: true,
    voatz: false,
  },
  {
    feature: 'Hybrid Paper/Digital',
    observernet: true,
    helios: false,
    vocdoni: false,
    voatz: false,
  },
  {
    feature: 'Real-Time Observer Portal',
    observernet: true,
    helios: false,
    vocdoni: false,
    voatz: false,
  },
];

const technicalHighlights = [
  {
    title: 'Cryptographic Primitives',
    items: ['AES-256-GCM encryption', 'SHA-256 commitments', 'ECDSA signatures', 'ElGamal threshold encryption'],
  },
  {
    title: 'Security Guarantees',
    items: ['End-to-end verifiability', 'Receipt-freeness', 'Coercion resistance', 'Ballot privacy'],
  },
  {
    title: 'Blockchain Integration',
    items: ['Hyperledger Fabric 2.5+', 'Merkle tree proofs', 'Public explorer', 'Immutable audit logs'],
  },
  {
    title: 'Compliance & Standards',
    items: ['OWASP ASVS L2', 'GDPR/CCPA/LGPD/PIPL', 'WCAG 2.1 AA', 'Automated DSAR'],
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-purple-950 to-slate-950 py-20 sm:py-32">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mb-8 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300 backdrop-blur">
                  <Zap className="h-4 w-4" />
                  The Future of Verifiable Democracy
                </div>
              </div>

              <h1 className="mx-auto max-w-5xl text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                The World's Most Advanced
                <span className="block mt-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Open-Source Verifiable Voting
                </span>
              </h1>

              <p className="mx-auto mt-8 max-w-3xl text-lg text-gray-300 sm:text-xl">
                Combining <strong className="text-white">zero-knowledge proofs</strong>,{' '}
                <strong className="text-white">threshold mix-nets</strong>, and{' '}
                <strong className="text-white">blockchain immutability</strong> for elections
                that are mathematically provable, completely transparent, and unbreakably private.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/org/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:shadow-xl hover:shadow-blue-500/40"
                >
                  Host an Election
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/observe"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  <Eye className="h-5 w-5" />
                  Observer Portal
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-gray-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <span className="text-sm">Open Source</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <span className="text-sm">Cryptographically Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <span className="text-sm">Publicly Auditable</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <span className="text-sm">GDPR/CCPA/LGPD Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Advanced Cryptographic Features */}
        <section className="border-y border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
                State-of-the-Art Cryptographic Security
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
                ObserverNet implements cutting-edge cryptographic protocols that no other platform offers
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {cryptoFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 shadow-sm transition hover:shadow-xl dark:border-slate-800 dark:from-slate-900 dark:to-slate-800"
                >
                  <div className="absolute right-4 top-4">
                    <span className={`inline-block rounded-full bg-${feature.color}-100 px-3 py-1 text-xs font-medium text-${feature.color}-700 dark:bg-${feature.color}-900/30 dark:text-${feature.color}-400`}>
                      {feature.badge}
                    </span>
                  </div>

                  <feature.icon className={`h-12 w-12 text-${feature.color}-600 dark:text-${feature.color}-400`} />

                  <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                    {feature.tagline}
                  </p>

                  <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Comparison */}
        <section className="bg-slate-50 py-20 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
                Why ObserverNet Leads the Industry
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
                Compare our cryptographic guarantees vs. other voting platforms
              </p>
            </div>

            <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                        Feature
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                        ObserverNet
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Helios
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Vocdoni
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Voatz
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {platformComparison.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-300">
                          {row.feature}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.observernet ? (
                            <Check className="inline h-6 w-6 text-green-600 dark:text-green-400" />
                          ) : (
                            <X className="inline h-6 w-6 text-red-400" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.helios ? (
                            <Check className="inline h-6 w-6 text-green-600 dark:text-green-400" />
                          ) : (
                            <X className="inline h-6 w-6 text-slate-300 dark:text-slate-700" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.vocdoni ? (
                            <Check className="inline h-6 w-6 text-green-600 dark:text-green-400" />
                          ) : (
                            <X className="inline h-6 w-6 text-slate-300 dark:text-slate-700" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.voatz ? (
                            <Check className="inline h-6 w-6 text-green-600 dark:text-green-400" />
                          ) : (
                            <X className="inline h-6 w-6 text-slate-300 dark:text-slate-700" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Highlights */}
        <section className="border-y border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
                Enterprise-Grade Technical Stack
              </h2>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {technicalHighlights.map((section) => (
                <div
                  key={section.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800"
                >
                  <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                    {section.title}
                  </h3>
                  <ul className="space-y-2">
                    {section.items.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Features */}
        <section className="bg-slate-50 py-20 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-3">
              {[
                {
                  icon: Users,
                  title: 'Multi-Channel Voting',
                  description: 'Web, mobile, WhatsApp, and paper ballot support with unified verification.',
                },
                {
                  icon: Smartphone,
                  title: 'Mobile-First Design',
                  description: 'Touch-optimized interface with swipe gestures and responsive layouts.',
                },
                {
                  icon: Globe,
                  title: 'Multi-Language Support',
                  description: 'Full i18n with RTL support for global accessibility.',
                },
                {
                  icon: BarChart3,
                  title: 'Real-Time Analytics',
                  description: 'Live dashboards with WebSocket updates and geographic breakdown.',
                },
                {
                  icon: FileCode,
                  title: 'API-First Architecture',
                  description: 'RESTful APIs with comprehensive documentation for custom integrations.',
                },
                {
                  icon: Shield,
                  title: 'OWASP Security Standards',
                  description: 'ASVS L2 compliant with comprehensive penetration testing.',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                >
                  <feature.icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Global Privacy Compliance */}
        <section className="border-y border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6 dark:bg-green-900/30">
                <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
                Globally Compliant Privacy-First Architecture
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-400">
                The world's only voting platform with automated Data Subject Rights fulfillment across
                GDPR, CCPA/CPRA, LGPD, PIPL, PDPA, DPDP Act India, and 140+ jurisdictions — while
                cryptographically preserving vote anonymity forever.
              </p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-8 dark:border-green-800 dark:from-green-900/20 dark:to-slate-900">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Automated DSAR Portal
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Full Data Subject Access Request automation: Access, Rectify, Erase, Portability,
                  Withdraw Consent — all processed instantly per jurisdiction requirements (GDPR 30d,
                  CCPA 45d, LGPD 15d).
                </p>
                <Link
                  href="/privacy-request"
                  className="mt-4 inline-flex items-center text-sm font-semibold text-green-600 hover:text-green-700 dark:text-green-400"
                >
                  Exercise Your Rights →
                </Link>
              </div>

              <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-8 dark:border-blue-800 dark:from-blue-900/20 dark:to-slate-900">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Vote Anonymity Protected
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your vote is cryptographically separated via blind tokens + mix-net. Even if you request
                  data access, we cannot retrieve how you voted — this protects ballot secrecy by design
                  (legal exemption: GDPR Art. 89 public interest archiving).
                </p>
              </div>

              <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-8 dark:border-purple-800 dark:from-purple-900/20 dark:to-slate-900">
                <div className="flex items-center gap-3 mb-4">
                  <Globe className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Multi-Jurisdiction Detection
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Automatic jurisdiction detection (IP + self-declare) applies strictest privacy rights.
                  Covers EU (GDPR), California (CPRA), Brazil (LGPD), China (PIPL), India (DPDP),
                  Singapore/Thailand (PDPA), and more.
                </p>
              </div>

              <div className="rounded-2xl border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white p-8 dark:border-yellow-800 dark:from-yellow-900/20 dark:to-slate-900">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Automated Data Retention
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Profile data auto-anonymized 90 days post-election (after legal challenge period).
                  Vote commitments retained indefinitely on blockchain for verifiability (no PII).
                  Privacy-by-design with data minimization.
                </p>
              </div>

              <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white p-8 dark:border-red-800 dark:from-red-900/20 dark:to-slate-900">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Breach Notification
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Automated breach detection with multi-jurisdiction notification: GDPR 72h to regulator,
                  LGPD immediate to ANPD, CCPA prompt to affected users. Full incident response automation.
                </p>
              </div>

              <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-8 dark:border-indigo-800 dark:from-indigo-900/20 dark:to-slate-900">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Comprehensive Policy
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Transparent privacy policy covering all jurisdictions with clear legal bases, retention
                  periods, and your rights. No hidden clauses, no data sales, no surprises.
                </p>
                <Link
                  href="/privacy"
                  className="mt-4 inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Read Full Policy →
                </Link>
              </div>
            </div>

            {/* Compliance Table */}
            <div className="mt-16 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                        Jurisdiction
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                        Law
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                        Response Deadline
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900 dark:text-white">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {[
                      { jurisdiction: 'EU/EEA/UK', law: 'GDPR', deadline: '30 days' },
                      { jurisdiction: 'California, USA', law: 'CCPA/CPRA', deadline: '45 days' },
                      { jurisdiction: 'Brazil', law: 'LGPD', deadline: '15 days' },
                      { jurisdiction: 'China', law: 'PIPL', deadline: '30 days' },
                      { jurisdiction: 'India', law: 'DPDP Act', deadline: '30 days' },
                      { jurisdiction: 'Singapore', law: 'PDPA', deadline: '30 days' },
                      { jurisdiction: 'Thailand', law: 'PDPA', deadline: '30 days' },
                      { jurisdiction: 'South Africa', law: 'POPIA', deadline: '30 days' },
                      { jurisdiction: 'Canada', law: 'PIPEDA', deadline: '30 days' },
                      { jurisdiction: 'Japan', law: 'APPI', deadline: '30 days' },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-300">
                          {row.jurisdiction}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {row.law}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {row.deadline}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Automated
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 py-16">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to Run a Mathematically Verifiable Election?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
              Join organizations worldwide trusting cryptographic guarantees over traditional faith-based voting.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/org/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-blue-700 shadow-xl transition hover:bg-blue-50"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/verify"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-lg font-semibold text-white transition hover:bg-white/10"
              >
                Verify a Vote
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
