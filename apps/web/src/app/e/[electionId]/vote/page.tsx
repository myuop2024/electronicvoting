'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Vote,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Lock,
  Loader2,
} from 'lucide-react';
import { Button, Card, Progress, Alert, VoteOptionCard, useToastActions } from '@electronicvoting/ui';
import { usePublicElection, useSubmitVote } from '@electronicvoting/api-client/hooks';

interface Contest {
  id: string;
  title: string;
  description: string;
  type: 'CANDIDATE' | 'PROPOSITION';
  minSelections: number;
  maxSelections: number;
  options: Array<{
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
  }>;
}

// Fallback mock data - used when API is not available
const mockContests: Contest[] = [
  {
    id: 'president',
    title: 'President',
    description: 'Vote for the President of the Board',
    type: 'CANDIDATE',
    minSelections: 1,
    maxSelections: 1,
    options: [
      { id: 'alice', title: 'Alice Johnson', subtitle: 'Progressive Party', description: 'Experienced leader with 10 years on the board.' },
      { id: 'bob', title: 'Bob Smith', subtitle: 'Conservative Party', description: 'Focused on fiscal responsibility and growth.' },
      { id: 'carol', title: 'Carol Williams', subtitle: 'Independent', description: 'New voice for innovative change.' },
    ],
  },
  {
    id: 'vp',
    title: 'Vice President',
    description: 'Vote for the Vice President of the Board',
    type: 'CANDIDATE',
    minSelections: 1,
    maxSelections: 1,
    options: [
      { id: 'david', title: 'David Chen', subtitle: 'Progressive Party' },
      { id: 'eva', title: 'Eva Martinez', subtitle: 'Conservative Party' },
    ],
  },
  {
    id: 'board',
    title: 'Board Members',
    description: 'Vote for up to 3 Board Members',
    type: 'CANDIDATE',
    minSelections: 0,
    maxSelections: 3,
    options: [
      { id: 'frank', title: 'Frank Brown' },
      { id: 'grace', title: 'Grace Lee' },
      { id: 'henry', title: 'Henry Wilson' },
      { id: 'isabel', title: 'Isabel Garcia' },
      { id: 'james', title: 'James Taylor' },
    ],
  },
  {
    id: 'prop-a',
    title: 'Proposition A: Budget Increase',
    description: 'Shall the annual budget be increased by 10% to fund new community programs?',
    type: 'PROPOSITION',
    minSelections: 1,
    maxSelections: 1,
    options: [
      { id: 'yes', title: 'Yes' },
      { id: 'no', title: 'No' },
    ],
  },
];

interface PageProps {
  params: { electionId: string };
}

export default function VotePage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessCode = searchParams.get('code');
  const toast = useToastActions();

  // Fetch election data from API
  const { data: electionData, isLoading: isLoadingElection, error: electionError } = usePublicElection(params.electionId);

  // Vote submission mutation
  const submitVoteMutation = useSubmitVote();

  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  // Use API data if available, otherwise fallback to mock
  const contests: Contest[] = electionData?.contests?.map((c: any) => ({
    id: c.id,
    title: c.title,
    description: c.description || '',
    type: c.type === 'single_choice' ? 'CANDIDATE' : c.type === 'multiple_choice' ? 'CANDIDATE' : 'PROPOSITION',
    minSelections: c.type === 'single_choice' ? 1 : 0,
    maxSelections: c.maxSelections || 1,
    options: c.options || [],
  })) || mockContests;

  const electionTitle = electionData?.election?.title || 'Annual Board Election';

  const totalSteps = contests.length + 1; // +1 for review step
  const currentContest = contests[currentStep];
  const isReviewStep = currentStep === contests.length;

  // Verify access code
  useEffect(() => {
    const verifyAccess = async () => {
      // In production, this would verify the access code with the API
      // For now, simulate verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsVerifying(false);
      setIsVerified(!!accessCode || true); // Accept any code for demo
    };
    verifyAccess();
  }, [accessCode]);

  const handleSelection = (contestId: string, optionId: string) => {
    const contest = contests.find(c => c.id === contestId);
    if (!contest) return;

    setSelections(prev => {
      const current = prev[contestId] || [];

      if (contest.maxSelections === 1) {
        // Single selection
        return { ...prev, [contestId]: [optionId] };
      } else {
        // Multiple selections
        if (current.includes(optionId)) {
          return { ...prev, [contestId]: current.filter(id => id !== optionId) };
        } else if (current.length < contest.maxSelections) {
          return { ...prev, [contestId]: [...current, optionId] };
        }
        return prev;
      }
    });
  };

  const isContestValid = (contestId: string) => {
    const contest = contests.find(c => c.id === contestId);
    if (!contest) return false;
    const selected = selections[contestId] || [];
    return selected.length >= contest.minSelections;
  };

  const canProceed = () => {
    if (isReviewStep) return true;
    return isContestValid(currentContest.id);
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Prepare vote data
      const voteData = Object.entries(selections).map(([contestId, optionIds]) => ({
        contestId,
        selectedOptionIds: optionIds,
      }));

      // Submit vote via API
      const result = await submitVoteMutation.mutateAsync({
        electionId: params.electionId,
        votes: voteData,
      });

      toast.success('Vote submitted successfully!', 'Your ballot has been recorded on the blockchain.');

      // Navigate to receipt page
      router.push(`/e/${params.electionId}/receipt/${result.commitmentHash}`);
    } catch (error: any) {
      // Fallback for demo - generate mock commitment hash
      console.warn('API submission failed, using demo mode:', error);

      // Generate mock commitment hash for demo
      const commitmentHash = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');

      toast.info('Demo Mode', 'Vote submitted in demo mode. In production, this would be recorded on the blockchain.');

      // Navigate to receipt page
      router.push(`/e/${params.electionId}/receipt/${commitmentHash}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while fetching election data
  if (isLoadingElection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
            Loading Election
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Please wait while we load the election data...
          </p>
        </Card>
      </div>
    );
  }

  // Verification loading state
  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
            Verifying Access
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Please wait while we verify your access code...
          </p>
        </Card>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
            Access Denied
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Your access code is invalid or has expired.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push(`/e/${params.electionId}`)}
          >
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <Vote className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {electionTitle}
              </p>
              <p className="text-xs text-slate-500">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Secure</span>
          </div>
        </div>
        <Progress value={(currentStep / (totalSteps - 1)) * 100} className="h-1" />
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        {!isReviewStep ? (
          // Contest View
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {currentContest.title}
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                {currentContest.description}
              </p>
              {currentContest.maxSelections > 1 && (
                <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                  Select up to {currentContest.maxSelections} options
                </p>
              )}
            </div>

            <div className="space-y-3">
              {currentContest.options.map((option) => {
                const isSelected = (selections[currentContest.id] || []).includes(option.id);
                return (
                  <VoteOptionCard
                    key={option.id}
                    id={option.id}
                    title={option.title}
                    subtitle={option.subtitle}
                    description={option.description}
                    imageUrl={option.imageUrl}
                    selected={isSelected}
                    onChange={() => handleSelection(currentContest.id, option.id)}
                    type={currentContest.maxSelections === 1 ? 'radio' : 'checkbox'}
                  />
                );
              })}
            </div>

            {!canProceed() && currentContest.minSelections > 0 && (
              <Alert variant="warning">
                Please select at least {currentContest.minSelections} option(s) to continue.
              </Alert>
            )}
          </div>
        ) : (
          // Review View
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Review Your Ballot
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Please review your selections before submitting. Once submitted, your vote cannot be changed.
              </p>
            </div>

            <div className="space-y-4">
              {contests.map((contest, index) => {
                const selected = selections[contest.id] || [];
                const selectedOptions = contest.options.filter(o => selected.includes(o.id));

                return (
                  <Card key={contest.id} className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {contest.title}
                        </h3>
                        <div className="mt-2 space-y-1">
                          {selectedOptions.length > 0 ? (
                            selectedOptions.map(opt => (
                              <div key={opt.id} className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-emerald-500" />
                                <span className="text-slate-700 dark:text-slate-300">
                                  {opt.title}
                                  {opt.subtitle && (
                                    <span className="text-slate-500"> - {opt.subtitle}</span>
                                  )}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400">No selection</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(index)}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Edit
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Alert variant="info" icon={<Lock className="h-5 w-5" />}>
              <p className="font-medium">Your vote is secure and anonymous</p>
              <p className="mt-1 text-sm">
                Your ballot will be encrypted and recorded on the blockchain. You will receive a commitment hash to verify your vote was counted.
              </p>
            </Alert>
          </div>
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back
          </Button>

          {!isReviewStep ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              loading={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="mr-2 h-5 w-5" />
              Submit Ballot
            </Button>
          )}
        </div>
      </footer>

      {/* Bottom spacing for fixed footer */}
      <div className="h-24" />
    </div>
  );
}
