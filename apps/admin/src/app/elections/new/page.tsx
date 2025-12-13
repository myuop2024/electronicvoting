'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  GripVertical,
  Info,
  Calendar,
  Users,
  Vote,
  Settings,
  CheckCircle,
  Image,
  Upload,
  Loader2,
  AlertCircle,
} from 'lucide-react';

type Step = 'basics' | 'contests' | 'settings' | 'review';

interface Contest {
  id: string;
  title: string;
  description: string;
  type: 'single_choice' | 'multiple_choice' | 'ranked_choice' | 'approval';
  minSelections: number;
  maxSelections: number;
  options: { id: string; title: string; description: string }[];
}

const voteTypes = [
  { value: 'single_choice', label: 'Single Choice', description: 'Voters select exactly one option' },
  { value: 'multiple_choice', label: 'Multiple Choice', description: 'Voters select multiple options' },
  { value: 'ranked_choice', label: 'Ranked Choice', description: 'Voters rank options by preference' },
  { value: 'approval', label: 'Approval Voting', description: 'Voters approve/disapprove each option' },
];

export default function CreateElectionPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('basics');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '18:00',
    timezone: 'America/New_York',
    visibility: 'private',
    allowlistRequired: true,
    accessCodeRequired: false,
    resultsVisibility: 'after_end',
    anonymousVoting: true,
  });
  const [contests, setContests] = useState<Contest[]>([
    {
      id: '1',
      title: '',
      description: '',
      type: 'single_choice',
      minSelections: 1,
      maxSelections: 1,
      options: [
        { id: '1', title: '', description: '' },
        { id: '2', title: '', description: '' },
      ],
    },
  ]);

  const steps: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: 'basics', label: 'Basic Info', icon: Info },
    { id: 'contests', label: 'Contests', icon: Vote },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'review', label: 'Review', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'name') {
      setFormData((prev) => ({
        ...prev,
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      }));
    }
  };

  const addContest = () => {
    setContests((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        title: '',
        description: '',
        type: 'single_choice',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: '1', title: '', description: '' },
          { id: '2', title: '', description: '' },
        ],
      },
    ]);
  };

  const removeContest = (contestId: string) => {
    if (contests.length > 1) {
      setContests((prev) => prev.filter((c) => c.id !== contestId));
    }
  };

  const updateContest = (contestId: string, field: string, value: any) => {
    setContests((prev) =>
      prev.map((c) => (c.id === contestId ? { ...c, [field]: value } : c))
    );
  };

  const addOption = (contestId: string) => {
    setContests((prev) =>
      prev.map((c) =>
        c.id === contestId
          ? {
              ...c,
              options: [
                ...c.options,
                { id: String(Date.now()), title: '', description: '' },
              ],
            }
          : c
      )
    );
  };

  const removeOption = (contestId: string, optionId: string) => {
    setContests((prev) =>
      prev.map((c) =>
        c.id === contestId && c.options.length > 2
          ? { ...c, options: c.options.filter((o) => o.id !== optionId) }
          : c
      )
    );
  };

  const updateOption = (contestId: string, optionId: string, field: string, value: string) => {
    setContests((prev) =>
      prev.map((c) =>
        c.id === contestId
          ? {
              ...c,
              options: c.options.map((o) =>
                o.id === optionId ? { ...o, [field]: value } : o
              ),
            }
          : c
      )
    );
  };

  // API types
  interface CreateElectionResponse {
    election: {
      id: string;
      slug: string;
      name: string;
    };
  }

  interface CreateContestResponse {
    contest: {
      id: string;
      name: string;
    };
  }

  // Create election mutation
  const createElectionMutation = useMutation({
    mutationFn: async (): Promise<CreateElectionResponse> => {
      // Combine date and time for start/end
      const votingStartAt = new Date(`${formData.startDate}T${formData.startTime}`);
      const votingEndAt = new Date(`${formData.endDate}T${formData.endTime}`);

      const response = await fetch('/api/elections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          votingStartAt: votingStartAt.toISOString(),
          votingEndAt: votingEndAt.toISOString(),
          allowVoteChange: false,
          verificationMode: formData.accessCodeRequired ? 'CODE_ONLY' : 'NONE',
          requireCaptcha: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create election');
      }

      return response.json();
    },
    onSuccess: async (data) => {
      // Now create contests for the election
      const electionId = data.election.id;

      for (const contest of contests) {
        if (!contest.title.trim()) continue;

        try {
          const contestResponse = await fetch(`/api/elections/${electionId}/contests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: contest.title,
              description: contest.description,
              voteType: mapVoteType(contest.type),
              maxSelections: contest.maxSelections,
              minSelections: contest.minSelections,
              options: contest.options
                .filter(opt => opt.title.trim())
                .map((opt, idx) => ({
                  name: opt.title,
                  description: opt.description,
                  sortOrder: idx,
                })),
            }),
          });

          if (!contestResponse.ok) {
            console.error('Failed to create contest:', contest.title);
          }
        } catch (err) {
          console.error('Error creating contest:', err);
        }
      }

      router.push(`/elections/${electionId}`);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Map frontend vote type to backend format
  const mapVoteType = (type: string): string => {
    const mapping: Record<string, string> = {
      single_choice: 'PLURALITY',
      multiple_choice: 'APPROVAL',
      ranked_choice: 'RANKED_CHOICE',
      approval: 'APPROVAL',
    };
    return mapping[type] || 'PLURALITY';
  };

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    // Basic validation
    if (!formData.name.trim()) {
      setError('Election name is required');
      setCurrentStep('basics');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('Start and end dates are required');
      setCurrentStep('basics');
      return;
    }

    const hasValidContest = contests.some(c =>
      c.title.trim() && c.options.filter(o => o.title.trim()).length >= 2
    );
    if (!hasValidContest) {
      setError('At least one contest with two options is required');
      setCurrentStep('contests');
      return;
    }

    createElectionMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/elections"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Election</h1>
          <p className="text-sm text-slate-400">Set up a new election with contests and options</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = index < currentStepIndex;
            return (
              <div key={step.id} className="flex flex-1 items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'text-emerald-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-2 h-px flex-1 ${
                      isCompleted ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            &times;
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        {/* Basic Info Step */}
        {currentStep === 'basics' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Election Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="e.g., 2024 Board of Directors Election"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  URL Slug
                </label>
                <div className="mt-1 flex items-center">
                  <span className="rounded-l-lg border border-r-0 border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-500">
                    /e/
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => updateFormData('slug', e.target.value)}
                    className="flex-1 rounded-r-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={3}
                  placeholder="Provide details about this election..."
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Start Date *
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => updateFormData('startDate', e.target.value)}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => updateFormData('startTime', e.target.value)}
                      className="w-28 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    End Date *
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => updateFormData('endDate', e.target.value)}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => updateFormData('endTime', e.target.value)}
                      className="w-28 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => updateFormData('timezone', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Contests Step */}
        {currentStep === 'contests' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Contests & Options</h2>
              <button
                onClick={addContest}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                Add Contest
              </button>
            </div>

            <div className="space-y-6">
              {contests.map((contest, contestIndex) => (
                <div
                  key={contest.id}
                  className="rounded-lg border border-slate-700 bg-slate-800/50 p-4"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-5 w-5 cursor-grab text-slate-500" />
                      <span className="text-sm font-medium text-slate-400">
                        Contest {contestIndex + 1}
                      </span>
                    </div>
                    {contests.length > 1 && (
                      <button
                        onClick={() => removeContest(contest.id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-300">
                          Contest Title *
                        </label>
                        <input
                          type="text"
                          value={contest.title}
                          onChange={(e) => updateContest(contest.id, 'title', e.target.value)}
                          placeholder="e.g., President"
                          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300">
                          Vote Type *
                        </label>
                        <select
                          value={contest.type}
                          onChange={(e) => updateContest(contest.id, 'type', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                        >
                          {voteTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300">
                        Description
                      </label>
                      <textarea
                        value={contest.description}
                        onChange={(e) => updateContest(contest.id, 'description', e.target.value)}
                        rows={2}
                        placeholder="Instructions or details for this contest..."
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Options */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-300">Options</label>
                        <button
                          onClick={() => addOption(contest.id)}
                          className="text-sm text-blue-400 hover:text-blue-300"
                        >
                          + Add Option
                        </button>
                      </div>
                      <div className="space-y-2">
                        {contest.options.map((option, optionIndex) => (
                          <div key={option.id} className="flex items-start gap-2">
                            <span className="mt-2.5 text-sm text-slate-500">
                              {optionIndex + 1}.
                            </span>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={option.title}
                                onChange={(e) =>
                                  updateOption(contest.id, option.id, 'title', e.target.value)
                                }
                                placeholder="Option name"
                                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            {contest.options.length > 2 && (
                              <button
                                onClick={() => removeOption(contest.id, option.id)}
                                className="mt-1.5 rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Step */}
        {currentStep === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Election Settings</h2>

            <div className="space-y-6">
              {/* Voter Access */}
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h3 className="mb-4 font-medium text-white">Voter Access</h3>
                <div className="space-y-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={formData.allowlistRequired}
                      onChange={(e) => updateFormData('allowlistRequired', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-white">Require Allowlist</span>
                      <p className="text-sm text-slate-400">
                        Only voters in the allowlist can participate
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={formData.accessCodeRequired}
                      onChange={(e) => updateFormData('accessCodeRequired', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-white">Require Access Code</span>
                      <p className="text-sm text-slate-400">
                        Voters must enter a unique access code to vote
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Privacy & Results */}
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h3 className="mb-4 font-medium text-white">Privacy & Results</h3>
                <div className="space-y-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={formData.anonymousVoting}
                      onChange={(e) => updateFormData('anonymousVoting', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-white">Anonymous Voting</span>
                      <p className="text-sm text-slate-400">
                        Votes cannot be linked to individual voters
                      </p>
                    </div>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Results Visibility
                    </label>
                    <select
                      value={formData.resultsVisibility}
                      onChange={(e) => updateFormData('resultsVisibility', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="after_end">After Election Ends</option>
                      <option value="live">Live (Real-time)</option>
                      <option value="manual">Manual Release</option>
                      <option value="never">Private (Admins Only)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review Step */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Review & Create</h2>

            <div className="space-y-4">
              {/* Summary Card */}
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h3 className="mb-3 font-medium text-white">{formData.name || 'Untitled Election'}</h3>
                <p className="text-sm text-slate-400">{formData.description || 'No description'}</p>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Start:</span>{' '}
                    <span className="text-white">
                      {formData.startDate} {formData.startTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">End:</span>{' '}
                    <span className="text-white">
                      {formData.endDate} {formData.endTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contests Summary */}
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h3 className="mb-3 font-medium text-white">
                  {contests.length} Contest{contests.length !== 1 ? 's' : ''}
                </h3>
                <ul className="space-y-2 text-sm">
                  {contests.map((contest, i) => (
                    <li key={contest.id} className="flex items-center gap-2 text-slate-300">
                      <Vote className="h-4 w-4 text-blue-400" />
                      {contest.title || `Contest ${i + 1}`} ({contest.options.length} options)
                    </li>
                  ))}
                </ul>
              </div>

              {/* Settings Summary */}
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h3 className="mb-3 font-medium text-white">Settings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 ${formData.allowlistRequired ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="text-slate-300">Allowlist Required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 ${formData.accessCodeRequired ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="text-slate-300">Access Code Required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 ${formData.anonymousVoting ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="text-slate-300">Anonymous Voting</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            const prevIndex = Math.max(0, currentStepIndex - 1);
            setCurrentStep(steps[prevIndex].id);
          }}
          disabled={currentStepIndex === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </button>

        {currentStepIndex < steps.length - 1 ? (
          <button
            onClick={() => {
              const nextIndex = Math.min(steps.length - 1, currentStepIndex + 1);
              setCurrentStep(steps[nextIndex].id);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={createElectionMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createElectionMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Create Election
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
