import Link from 'next/link';
import { Shield, Lock, Globe, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <PublicHeader />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Global Privacy Policy
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Compliant with GDPR, CCPA/CPRA, LGPD, PIPL, PDPA, DPDP Act, and 140+ jurisdictions
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Effective Date: January 1, 2025 • Version 2.0.0
            </p>
          </div>

          {/* Trust Badges */}
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-green-200">
              <CheckCircle2 className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">GDPR Compliant</h3>
              <p className="text-sm text-gray-600">EU/EEA/UK full compliance with automated DSAR fulfillment</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200">
              <Globe className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Multi-Jurisdiction</h3>
              <p className="text-sm text-gray-600">CCPA, LGPD, PIPL, and 140+ privacy laws supported</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-200">
              <Lock className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Vote Anonymity</h3>
              <p className="text-sm text-gray-600">Cryptographic separation ensures ballot secrecy forever</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200 space-y-8">
            <Section
              title="Data Controller"
              icon={Shield}
            >
              <p className="text-gray-700">
                <strong>ObserverNet</strong><br />
                Email: <a href="mailto:privacy@observernet.org" className="text-blue-600 hover:underline">privacy@observernet.org</a><br />
                Data Protection Officer: <a href="mailto:dpo@observernet.org" className="text-blue-600 hover:underline">dpo@observernet.org</a>
              </p>
            </Section>

            <Section
              title="Data We Collect & Why"
              icon={FileText}
            >
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">For Election Eligibility Verification:</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Identity verification data (via Didit KYC or similar)</li>
                    <li>Email address, phone number (if provided)</li>
                    <li>IP address, device fingerprint (fraud prevention)</li>
                    <li>Legal Basis: Legal obligation (GDPR Art. 6(1)(c)), Public interest (Art. 6(1)(e))</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">For Vote Casting & Counting:</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Cryptographically anonymized vote commitments (blockchain)</li>
                    <li>Zero-knowledge proofs (no personal data)</li>
                    <li>Blind tokens (break voter-ballot linkage)</li>
                    <li>Legal Basis: Legal obligation, Legitimate interest (election integrity)</li>
                  </ul>
                </div>
              </div>
            </Section>

            <Section
              title="Vote Anonymity — How We Protect Ballot Secrecy"
              icon={Lock}
            >
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-semibold text-blue-900 mb-3">Cryptographic Separation Guarantees:</h4>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>✓ <strong>Blind Tokens:</strong> You receive an anonymous token after verification. This token, not your identity, is used to cast votes.</li>
                  <li>✓ <strong>Mix-Net Encryption:</strong> Votes are shuffled through multiple nodes with threshold encryption. No single party can de-anonymize.</li>
                  <li>✓ <strong>Zero-Knowledge Proofs:</strong> We prove tallies are correct without revealing individual votes.</li>
                  <li>✓ <strong>Blockchain Commitments:</strong> Only hashes/commitments stored on-chain, no personally identifiable information.</li>
                  <li className="font-semibold">→ Result: Even with full database access, votes cannot be linked to voters. This is by design to ensure ballot secrecy.</li>
                </ul>
              </div>
            </Section>

            <Section
              title="Data Retention & Deletion"
              icon={AlertCircle}
            >
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Data Type</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Retention Period</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Method</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Voter Profile (Name, Email, etc.)</td>
                    <td className="border border-gray-300 px-4 py-2">90 days after election close</td>
                    <td className="border border-gray-300 px-4 py-2">Anonymized (hashed)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Vote Commitments (Blockchain)</td>
                    <td className="border border-gray-300 px-4 py-2">Indefinitely</td>
                    <td className="border border-gray-300 px-4 py-2">Retained (no PII, legal obligation)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Audit Logs</td>
                    <td className="border border-gray-300 px-4 py-2">7 years</td>
                    <td className="border border-gray-300 px-4 py-2">Retained (legal requirement)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Access Codes</td>
                    <td className="border border-gray-300 px-4 py-2">90 days after election close</td>
                    <td className="border border-gray-300 px-4 py-2">Deleted</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Challenge Period:</strong> Profile data cannot be deleted during active elections or within 90 days after election close (legal challenge period). This is a legal obligation under election law (GDPR Art. 17(3)(b)).
                </p>
              </div>
            </Section>

            <Section
              title="Your Privacy Rights (By Jurisdiction)"
              icon={CheckCircle2}
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Right</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold">GDPR</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold">CCPA</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold">LGPD</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold">PIPL</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold">DPDP</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr>
                      <td className="border border-gray-300 px-3 py-2">Access Data</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓ (30d)</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓ (45d)</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓ (15d)</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓ (30d)</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓ (30d)</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-3 py-2">Rectification</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓ (CPRA)</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-3 py-2">Erasure</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓*</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓*</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓*</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓*</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓*</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-3 py-2">Data Portability</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓ (CPRA)</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">–</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-3 py-2">Withdraw Consent</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">–</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-gray-600 mt-4">
                * Erasure of vote data subject to legal exceptions (election integrity, public interest archiving under GDPR Art. 89).
                Profile data can be erased after election + challenge period.
              </p>

              <div className="mt-6">
                <Link
                  href="/privacy-request"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Exercise Your Rights →
                </Link>
              </div>
            </Section>

            <Section
              title="Data Sharing & Third Parties"
              icon={Globe}
            >
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>We DO NOT sell or share your personal data with third parties.</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Identity Verification:</strong> Didit (or configured KYC provider) for identity verification only. They do not receive vote data.</li>
                  <li><strong>Blockchain:</strong> Only anonymous commitments and hashes published (no PII).</li>
                  <li><strong>Observers/Public:</strong> Can verify results and proofs but cannot see individual votes or voter identities.</li>
                  <li><strong>Law Enforcement:</strong> Only if legally compelled (court order). We will challenge requests that threaten ballot secrecy.</li>
                </ul>
              </div>
            </Section>

            <Section
              title="Security Measures"
              icon={Shield}
            >
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Encryption:</strong> End-to-end encryption, TLS 1.3+, threshold encryption for votes</li>
                <li><strong>Access Control:</strong> Multi-factor authentication, role-based access, least privilege</li>
                <li><strong>Audit Logging:</strong> All actions logged with hash chains for tamper detection</li>
                <li><strong>Anonymization:</strong> Cryptographic separation (blind tokens, mix-net, ZK proofs)</li>
                <li><strong>Infrastructure:</strong> Hyperledger Fabric permissioned blockchain, secure enclaves</li>
              </ul>
            </Section>

            <Section
              title="Breach Notification"
              icon={AlertCircle}
            >
              <p className="text-gray-700 mb-4">
                In the unlikely event of a data breach, we will notify:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li><strong>GDPR:</strong> Supervisory authority within 72 hours; affected users promptly</li>
                <li><strong>CCPA/CPRA:</strong> Affected California residents promptly</li>
                <li><strong>LGPD:</strong> ANPD (Brazilian authority) and affected users immediately</li>
                <li><strong>PIPL:</strong> CAC (Chinese authority) within 72 hours</li>
              </ul>
            </Section>

            <Section
              title="International Transfers"
              icon={Globe}
            >
              <p className="text-gray-700">
                Data is processed in secure data centers with appropriate safeguards:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                <li>GDPR: Standard Contractual Clauses (SCCs) or adequacy decisions</li>
                <li>Other jurisdictions: Equivalent data transfer mechanisms per local law</li>
              </ul>
            </Section>

            <Section
              title="Children's Privacy"
              icon={Shield}
            >
              <p className="text-gray-700">
                ObserverNet is not intended for children under 16 (or applicable age of consent in your jurisdiction).
                We do not knowingly collect data from children.
              </p>
            </Section>

            <Section
              title="Changes to This Policy"
              icon={FileText}
            >
              <p className="text-gray-700">
                We may update this policy to reflect legal changes or platform improvements.
                Material changes will be announced 30 days in advance via email (if you have an account) and on our website.
              </p>
            </Section>

            <Section
              title="Contact & Complaints"
              icon={Shield}
            >
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>Privacy Questions:</strong> <a href="mailto:privacy@observernet.org" className="text-blue-600 hover:underline">privacy@observernet.org</a><br />
                  <strong>Data Protection Officer:</strong> <a href="mailto:dpo@observernet.org" className="text-blue-600 hover:underline">dpo@observernet.org</a><br />
                  <strong>Privacy Portal:</strong> <Link href="/privacy-request" className="text-blue-600 hover:underline">/privacy-request</Link>
                </p>

                <p className="text-sm text-gray-600">
                  You also have the right to lodge a complaint with your supervisory authority:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  <li>GDPR (EU): Your national Data Protection Authority</li>
                  <li>CCPA (California): California Attorney General</li>
                  <li>LGPD (Brazil): ANPD (Autoridade Nacional de Proteção de Dados)</li>
                  <li>PIPL (China): CAC (Cyberspace Administration of China)</li>
                </ul>
              </div>
            </Section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-gray-200 pb-6 last:border-0">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}
