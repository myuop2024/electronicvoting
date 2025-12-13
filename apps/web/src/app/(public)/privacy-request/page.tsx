'use client';

import { useState, useEffect } from 'react';
import { Shield, Lock, CheckCircle2, AlertCircle, FileText, Download, Mail } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';

const REQUEST_TYPES = [
  {
    value: 'ACCESS',
    label: 'Access My Data',
    description: 'Request a copy of all personal data we hold about you',
    icon: FileText,
  },
  {
    value: 'RECTIFICATION',
    label: 'Correct My Data',
    description: 'Request correction of inaccurate personal data',
    icon: CheckCircle2,
  },
  {
    value: 'ERASURE',
    label: 'Delete My Data',
    description: 'Request deletion of your personal data (subject to legal obligations)',
    icon: AlertCircle,
  },
  {
    value: 'PORTABILITY',
    label: 'Export My Data',
    description: 'Receive your data in a machine-readable format',
    icon: Download,
  },
  {
    value: 'WITHDRAW_CONSENT',
    label: 'Withdraw Consent',
    description: 'Withdraw previously given consent for data processing',
    icon: Shield,
  },
];

const JURISDICTIONS = [
  { value: 'GDPR', label: 'EU/EEA/UK (GDPR)', deadline: '30 days' },
  { value: 'CCPA', label: 'California, USA (CCPA)', deadline: '45 days' },
  { value: 'CPRA', label: 'California, USA (CPRA)', deadline: '45 days' },
  { value: 'LGPD', label: 'Brazil (LGPD)', deadline: '15 days' },
  { value: 'PIPL', label: 'China (PIPL)', deadline: '30 days' },
  { value: 'DPDP', label: 'India (DPDP Act)', deadline: '30 days' },
  { value: 'GENERAL', label: 'Other Jurisdiction', deadline: '30 days' },
];

export default function PrivacyRequestPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    requestType: '',
    description: '',
    jurisdiction: '',
    voterIdentifier: '',
  });
  const [requestId, setRequestId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [detectedJurisdiction, setDetectedJurisdiction] = useState<any>(null);

  // Detect jurisdiction on mount
  useEffect(() => {
    fetch('/api/privacy/jurisdiction')
      .then(res => res.json())
      .then(data => {
        setDetectedJurisdiction(data);
        setFormData(prev => ({ ...prev, jurisdiction: data.jurisdiction }));
      })
      .catch(err => console.error('Failed to detect jurisdiction:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/privacy/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          request_type: formData.requestType,
          description: formData.description,
          self_declared_jurisdiction: formData.jurisdiction || null,
          voter_identifier: formData.voterIdentifier || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setRequestId(data.id);
        setMessage(data.message);
        setStatus('success');
        setStep(2);
      } else {
        setMessage(data.detail || 'Failed to submit request');
        setStatus('error');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      setStatus('error');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch(`/api/privacy/request/${requestId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verification_code: verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Your request has been verified and is being processed automatically.');
        setStatus('success');
        setStep(3);
      } else {
        setMessage(data.detail || 'Verification failed');
        setStatus('error');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <PublicHeader />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Privacy Rights Portal
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Exercise your data protection rights. Automated fulfillment with global compliance
              (GDPR, CCPA, LGPD, PIPL, and 140+ jurisdictions).
            </p>
          </div>

          {/* Trust Badges */}
          <div className="flex justify-center gap-4 mb-12 flex-wrap">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-200">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">CCPA/CPRA Certified</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-purple-200">
              <Lock className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Vote Anonymity Preserved</span>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-12 max-w-2xl mx-auto">
            <StepIndicator number={1} label="Submit" active={step === 1} completed={step > 1} />
            <div className={`flex-1 h-1 ${step > 1 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            <StepIndicator number={2} label="Verify" active={step === 2} completed={step > 2} />
            <div className={`flex-1 h-1 ${step > 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            <StepIndicator number={3} label="Process" active={step === 3} completed={false} />
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            {step === 1 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Submit Privacy Request
                </h2>

                {/* Detected Jurisdiction */}
                {detectedJurisdiction && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">
                      <strong>Detected Jurisdiction:</strong> {detectedJurisdiction.jurisdiction}
                      <br />
                      <strong>Response Deadline:</strong>{' '}
                      {JURISDICTIONS.find(j => j.value === detectedJurisdiction.jurisdiction)?.deadline || '30 days'}
                    </p>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll send a verification code to this email
                  </p>
                </div>

                {/* Request Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Request Type *
                  </label>
                  <div className="grid gap-3">
                    {REQUEST_TYPES.map(type => (
                      <label
                        key={type.value}
                        className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.requestType === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="requestType"
                          value={type.value}
                          checked={formData.requestType === type.value}
                          onChange={e => setFormData({ ...formData, requestType: e.target.value })}
                          className="mt-1"
                          required
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <type.icon className="w-5 h-5 text-gray-600" />
                            <span className="font-medium text-gray-900">{type.label}</span>
                          </div>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Jurisdiction Override */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jurisdiction (Optional)
                  </label>
                  <select
                    value={formData.jurisdiction}
                    onChange={e => setFormData({ ...formData, jurisdiction: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {JURISDICTIONS.map(j => (
                      <option key={j.value} value={j.value}>
                        {j.label} (Response: {j.deadline})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Provide any additional context for your request..."
                  />
                </div>

                {/* Voter Identifier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voter Identifier (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.voterIdentifier}
                    onChange={e => setFormData({ ...formData, voterIdentifier: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Email, phone, or unique ID used during voting"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Helps us locate your records faster
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {status === 'loading' ? 'Submitting...' : 'Submit Request'}
                </button>

                {message && (
                  <div className={`p-4 rounded-lg ${status === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                    {message}
                  </div>
                )}
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerify} className="space-y-6">
                <div className="text-center mb-6">
                  <Mail className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Verify Your Email
                  </h2>
                  <p className="text-gray-600">
                    We've sent a 6-character verification code to <strong>{formData.email}</strong>
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Request ID: <code className="bg-gray-100 px-2 py-1 rounded">{requestId}</code>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest font-mono"
                    placeholder="XXXXXX"
                    maxLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading' || verificationCode.length < 6}
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {status === 'loading' ? 'Verifying...' : 'Verify & Process'}
                </button>

                {message && (
                  <div className={`p-4 rounded-lg ${status === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                    {message}
                  </div>
                )}
              </form>
            )}

            {step === 3 && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Request Processed
                </h2>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <p className="text-green-800 mb-4">{message}</p>
                  <p className="text-sm text-gray-600">
                    You'll receive an email with your data export or confirmation shortly.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Important Notes:</h3>
                  <ul className="text-sm text-gray-700 space-y-2 text-left">
                    <li>✓ Your vote content is cryptographically anonymized and cannot be retrieved</li>
                    <li>✓ This protects ballot secrecy while preserving public verifiability</li>
                    <li>✓ Profile data can be deleted after election + challenge period (90 days)</li>
                    <li>✓ Vote commitments remain on blockchain for election integrity</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">Privacy & Vote Anonymity</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>✓ <strong>Cryptographic Separation:</strong> Your votes are anonymized using blind tokens and mix-net encryption</li>
              <li>✓ <strong>No Re-identification:</strong> Even with full database access, votes cannot be linked to you</li>
              <li>✓ <strong>Public Verifiability:</strong> Vote commitments on blockchain prove integrity without revealing choices</li>
              <li>✓ <strong>Legal Compliance:</strong> Automated fulfillment per GDPR, CCPA, LGPD, PIPL, and 140+ jurisdictions</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StepIndicator({ number, label, active, completed }: { number: number; label: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
          completed
            ? 'bg-green-600 text-white'
            : active
            ? 'bg-blue-600 text-white'
            : 'bg-gray-300 text-gray-600'
        }`}
      >
        {completed ? <CheckCircle2 className="w-6 h-6" /> : number}
      </div>
      <span className="text-xs mt-2 font-medium text-gray-600">{label}</span>
    </div>
  );
}
