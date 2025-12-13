'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Edit,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  User,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

// Types
interface PaperBallot {
  id: string;
  electionId: string;
  electionName: string;
  batchId: string;
  imageUrl: string | null;
  status: string;
  ocrConfidence: number;
  ocrData: {
    contests: {
      contestId?: string;
      optionId?: string;
      title: string;
      selectedOption: string | null;
      confidence: number;
    }[];
  };
  uploadedAt: string;
  uploadedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason?: string;
  commitmentHash?: string;
  fabricTxId?: string;
}

interface PaperBallotsResponse {
  ballots: PaperBallot[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts: {
    PENDING: number;
    CONFIRMED: number;
    TALLIED: number;
    REJECTED: number;
  };
}

// API functions
async function fetchPaperBallots(status?: string): Promise<PaperBallotsResponse> {
  const params = new URLSearchParams();
  if (status && status !== 'all') {
    // Map frontend status to backend
    const statusMap: Record<string, string> = {
      pending_review: 'PENDING',
      approved: 'CONFIRMED',
      rejected: 'REJECTED',
    };
    params.set('status', statusMap[status] || status);
  }
  params.set('limit', '100');
  const response = await fetch(`/api/paper-ballots?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch paper ballots');
  }
  return response.json();
}

async function updateBallot(id: string, action: string, data?: any): Promise<any> {
  const response = await fetch(`/api/paper-ballots/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update ballot');
  }
  return response.json();
}

const statusColors: Record<string, string> = {
  pending_review: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  needs_manual: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 0.9
      ? 'text-emerald-400'
      : confidence >= 0.7
      ? 'text-yellow-400'
      : 'text-red-400';
  return (
    <span className={`text-sm font-medium ${color}`}>
      {Math.round(confidence * 100)}% confidence
    </span>
  );
}

export default function PaperBallotsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [selectedBallot, setSelectedBallot] = useState<PaperBallot | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Fetch paper ballots
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['paper-ballots', statusFilter],
    queryFn: () => fetchPaperBallots(statusFilter),
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (id: string) => updateBallot(id, 'approve'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paper-ballots'] });
      setSelectedBallot(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      updateBallot(id, 'reject', { rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paper-ballots'] });
      setSelectedBallot(null);
      setShowRejectDialog(false);
      setRejectReason('');
    },
  });

  const paperBallots = data?.ballots || [];
  const statusCounts = data?.statusCounts || { PENDING: 0, CONFIRMED: 0, TALLIED: 0, REJECTED: 0 };

  // Filter ballots by search query
  const filteredBallots = paperBallots.filter((b) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        b.batchId.toLowerCase().includes(query) ||
        b.electionName.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const pendingCount = statusCounts.PENDING;

  // Get current ballot index for navigation
  const currentIndex = selectedBallot
    ? filteredBallots.findIndex((b) => b.id === selectedBallot.id)
    : -1;

  const navigateBallot = (direction: 'prev' | 'next') => {
    if (!selectedBallot) return;
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < filteredBallots.length) {
      setSelectedBallot(filteredBallots[newIndex]);
      setZoom(100);
      setRotation(0);
    }
  };

  const handleApprove = () => {
    if (selectedBallot) {
      approveMutation.mutate(selectedBallot.id);
    }
  };

  const handleReject = () => {
    if (selectedBallot) {
      rejectMutation.mutate({ id: selectedBallot.id, reason: rejectReason });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Paper Ballot Review</h1>
          <p className="mt-1 text-sm text-slate-400">
            Review OCR-processed paper ballots and validate selections.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/paper-ballots/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <Upload className="h-4 w-4" />
            Upload Batch
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-400" />
            <div>
              <p className="font-medium text-red-300">Error loading ballots</p>
              <p className="text-sm text-red-200/80">
                {error instanceof Error ? error.message : 'Please try again'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alert for pending */}
      {pendingCount > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            <div>
              <p className="font-medium text-orange-300">
                {pendingCount} ballot{pendingCount !== 1 ? 's' : ''} awaiting review
              </p>
              <p className="text-sm text-orange-200/80">
                Please review and approve or reject the OCR results.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Pending Review', count: statusCounts.PENDING, color: 'text-orange-400', filter: 'pending_review' },
          { label: 'Approved', count: statusCounts.CONFIRMED + statusCounts.TALLIED, color: 'text-emerald-400', filter: 'approved' },
          { label: 'Rejected', count: statusCounts.REJECTED, color: 'text-red-400', filter: 'rejected' },
          { label: 'Total Processed', count: data?.total || 0, color: 'text-blue-400', filter: 'all' },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() => setStatusFilter(stat.filter)}
            className={`rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-left transition-colors hover:border-slate-700 ${
              statusFilter === stat.filter ? 'border-blue-500 bg-blue-500/10' : ''
            }`}
          >
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by batch ID or election..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Ballots Grid */}
      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBallots.map((ballot) => (
            <div
              key={ballot.id}
              className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden transition-colors hover:border-slate-700"
            >
              {/* Ballot Preview */}
              <div className="relative aspect-[3/4] bg-slate-800">
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  <FileText className="h-16 w-16" />
                </div>
                <button
                  onClick={() => setSelectedBallot(ballot)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
                >
                  <Eye className="h-8 w-8 text-white" />
                </button>
                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      statusColors[ballot.status] || statusColors.pending_review
                    }`}
                  >
                    {ballot.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Ballot Info */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white">{ballot.batchId}</p>
                    <p className="text-sm text-slate-400">{ballot.electionName}</p>
                  </div>
                  <ConfidenceBadge confidence={ballot.ocrConfidence} />
                </div>

                {/* OCR Results Preview */}
                <div className="mt-3 space-y-2">
                  {ballot.ocrData.contests.slice(0, 2).map((contest, i) => (
                    <div key={i} className="rounded bg-slate-800/50 px-2 py-1 text-xs">
                      <span className="text-slate-400">{contest.title}:</span>{' '}
                      <span className="text-white">
                        {contest.selectedOption || <span className="text-red-400">Unclear</span>}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Meta */}
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(ballot.uploadedAt).toLocaleTimeString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {ballot.uploadedBy}
                  </span>
                </div>

                {/* Actions */}
                {ballot.status === 'pending_review' && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setSelectedBallot(ballot)}
                      className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500"
                    >
                      Review
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredBallots.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-lg font-medium text-white">No ballots found</h3>
          <p className="mt-2 text-sm text-slate-400">
            {statusFilter !== 'all'
              ? 'Try changing the filter or upload new ballots'
              : 'Upload paper ballots to begin OCR processing'}
          </p>
        </div>
      )}

      {/* Review Modal */}
      <Dialog.Root open={!!selectedBallot && !showRejectDialog} onOpenChange={() => setSelectedBallot(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
          <Dialog.Content className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 lg:inset-8">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">
                  Review Paper Ballot
                </Dialog.Title>
                <p className="text-sm text-slate-400">
                  {selectedBallot?.batchId} • {selectedBallot?.electionName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom(Math.max(50, zoom - 25))}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <ZoomOut className="h-5 w-5" />
                </button>
                <span className="text-sm text-slate-400">{zoom}%</span>
                <button
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setRotation((rotation + 90) % 360)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <RotateCw className="h-5 w-5" />
                </button>
                <Dialog.Close className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                  <XCircle className="h-5 w-5" />
                </Dialog.Close>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Ballot Image */}
              <div className="flex-1 overflow-auto bg-slate-950 p-4">
                <div
                  className="mx-auto flex aspect-[3/4] max-w-md items-center justify-center bg-slate-800 transition-transform"
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  }}
                >
                  <FileText className="h-32 w-32 text-slate-600" />
                </div>
              </div>

              {/* OCR Results Panel */}
              <div className="w-80 overflow-y-auto border-l border-slate-800 p-6">
                <h3 className="mb-4 font-semibold text-white">OCR Results</h3>
                <div className="mb-4">
                  <ConfidenceBadge confidence={selectedBallot?.ocrConfidence || 0} />
                </div>

                <div className="space-y-4">
                  {selectedBallot?.ocrData.contests.map((contest, i) => (
                    <div key={i} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                      <p className="text-sm font-medium text-slate-400">{contest.title}</p>
                      <div className="mt-2">
                        {contest.selectedOption ? (
                          <p className="text-white">{contest.selectedOption}</p>
                        ) : (
                          <p className="text-red-400">Unable to detect selection</p>
                        )}
                        <p className="mt-1 text-xs text-slate-500">
                          {Math.round(contest.confidence * 100)}% confidence
                        </p>
                      </div>
                      <button className="mt-2 text-sm text-blue-400 hover:text-blue-300">
                        Edit selection
                      </button>
                    </div>
                  ))}
                </div>

                {selectedBallot?.status === 'pending_review' && (
                  <div className="mt-6 space-y-3">
                    <button
                      onClick={handleApprove}
                      disabled={approveMutation.isPending}
                      className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 inline-block h-4 w-4" />
                      )}
                      Approve & Count
                    </button>
                    <button className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700">
                      <Edit className="mr-2 inline-block h-4 w-4" />
                      Edit & Approve
                    </button>
                    <button
                      onClick={() => setShowRejectDialog(true)}
                      className="w-full rounded-lg border border-red-500/50 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle className="mr-2 inline-block h-4 w-4" />
                      Reject Ballot
                    </button>
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                  <button
                    onClick={() => navigateBallot('prev')}
                    disabled={currentIndex <= 0}
                    className="flex items-center gap-1 text-sm text-slate-400 hover:text-white disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <span className="text-sm text-slate-500">
                    {currentIndex + 1} of {filteredBallots.length}
                  </span>
                  <button
                    onClick={() => navigateBallot('next')}
                    disabled={currentIndex >= filteredBallots.length - 1}
                    className="flex items-center gap-1 text-sm text-slate-400 hover:text-white disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Reject Dialog */}
      <Dialog.Root open={showRejectDialog} onOpenChange={(open) => !open && setShowRejectDialog(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-700 bg-slate-900 p-6">
            <Dialog.Title className="text-lg font-semibold text-white">
              Reject Ballot
            </Dialog.Title>
            <p className="mt-2 text-sm text-slate-400">
              Please provide a reason for rejecting this ballot.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Ballot is blank, illegible marks, damage..."
              className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
              rows={3}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowRejectDialog(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                ) : null}
                Reject Ballot
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
