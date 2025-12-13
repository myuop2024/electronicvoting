import { Metadata } from 'next';
import Link from 'next/link';
import {
  CheckCircle2,
  Shield,
  Copy,
  Download,
  Share2,
  ExternalLink,
  Clock,
  Vote,
} from 'lucide-react';
import { Button, Card, Badge } from '@electronicvoting/ui';

interface ReceiptPageProps {
  params: {
    electionId: string;
    commitmentHash: string;
  };
}

// This would be an API call
async function getReceipt(electionId: string, commitmentHash: string) {
  return {
    electionId,
    electionName: 'Annual Board Election 2024',
    orgName: 'Demo Electoral Commission',
    commitmentHash,
    fabricTxId: 'fabric-tx-abc123def456',
    fabricBlockNum: 1247,
    verified: true,
    submittedAt: new Date().toISOString(),
    talliedAt: new Date().toISOString(),
    channel: 'web',
  };
}

export async function generateMetadata({ params }: ReceiptPageProps): Promise<Metadata> {
  return {
    title: 'Vote Receipt',
    description: 'Your vote has been successfully recorded and verified on the blockchain.',
  };
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const receipt = await getReceipt(params.electionId, params.commitmentHash);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-950">
      {/* Success Header */}
      <div className="bg-emerald-600 py-12 text-center text-white sm:py-16">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 sm:h-20 sm:w-20">
            <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
          <h1 className="mt-6 text-2xl font-bold sm:text-3xl">
            Your Vote Has Been Recorded!
          </h1>
          <p className="mt-3 text-emerald-100">
            Thank you for participating. Your ballot has been securely submitted and verified on the blockchain.
          </p>
        </div>
      </div>

      {/* Receipt Card */}
      <main className="mx-auto -mt-8 max-w-2xl px-4 pb-12">
        <Card className="overflow-hidden shadow-lg">
          {/* Receipt Header */}
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                  <Vote className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {receipt.electionName}
                  </p>
                  <p className="text-sm text-slate-500">{receipt.orgName}</p>
                </div>
              </div>
              <Badge variant="success">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Verified
              </Badge>
            </div>
          </div>

          {/* Receipt Details */}
          <div className="p-6 space-y-6">
            {/* Commitment Hash */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Commitment Hash
              </label>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-slate-100 px-4 py-3 font-mono text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                  {receipt.commitmentHash}
                </code>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                  title="Copy to clipboard"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Save this hash to verify your vote was counted in the final tally.
              </p>
            </div>

            {/* Blockchain Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Fabric Transaction ID
                </label>
                <p className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">
                  {receipt.fabricTxId}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Block Number
                </label>
                <p className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">
                  #{receipt.fabricBlockNum}
                </p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Submitted At
                </label>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {new Date(receipt.submittedAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Channel
                </label>
                <p className="mt-1 text-sm capitalize text-slate-900 dark:text-slate-100">
                  {receipt.channel}
                </p>
              </div>
            </div>

            {/* Verification Status */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-medium text-emerald-900 dark:text-emerald-100">
                    Blockchain Verified
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    Your vote has been confirmed on Hyperledger Fabric and will be included in the final tally.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
              <Link
                href={`/verify?hash=${receipt.commitmentHash}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Verify on Explorer
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Card>

        {/* Additional Info */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              What happens next?
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Your vote is securely stored on the blockchain
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Results will be published after voting ends
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                You can verify your vote anytime with your hash
              </li>
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Need help?
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              If you have any questions about your vote or the election process, please contact the election administrator.
            </p>
            <Link
              href="/help"
              className="mt-3 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Visit Help Center
            </Link>
          </Card>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Return to ObserverNet Home
          </Link>
        </div>
      </main>
    </div>
  );
}
