'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { elections, votes, organizations, users, publicApi, ApiError, Election, Contest, VoteReceipt, Organization, User, VoteSubmission } from './index';

// Query Keys
export const queryKeys = {
  elections: {
    all: ['elections'] as const,
    list: (params?: Record<string, any>) => ['elections', 'list', params] as const,
    detail: (id: string) => ['elections', 'detail', id] as const,
    contests: (id: string) => ['elections', 'contests', id] as const,
    results: (id: string) => ['elections', 'results', id] as const,
  },
  organizations: {
    all: ['organizations'] as const,
    list: (params?: Record<string, any>) => ['organizations', 'list', params] as const,
    detail: (id: string) => ['organizations', 'detail', id] as const,
    members: (id: string) => ['organizations', 'members', id] as const,
  },
  users: {
    all: ['users'] as const,
    me: ['users', 'me'] as const,
    list: (params?: Record<string, any>) => ['users', 'list', params] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
};

// ============================================
// Election Hooks
// ============================================

export function useElections(params?: { status?: string; organizationId?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.elections.list(params),
    queryFn: () => elections.list(params),
  });
}

export function useElection(id: string) {
  return useQuery({
    queryKey: queryKeys.elections.detail(id),
    queryFn: () => elections.get(id),
    enabled: !!id,
  });
}

export function useElectionContests(electionId: string) {
  return useQuery({
    queryKey: queryKeys.elections.contests(electionId),
    queryFn: () => elections.getContests(electionId),
    enabled: !!electionId,
  });
}

export function useElectionResults(electionId: string) {
  return useQuery({
    queryKey: queryKeys.elections.results(electionId),
    queryFn: () => elections.getResults(electionId),
    enabled: !!electionId,
  });
}

export function useCreateElection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Election>) => elections.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.elections.all });
    },
  });
}

export function useUpdateElection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Election> }) =>
      elections.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.elections.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.elections.all });
    },
  });
}

export function useDeleteElection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => elections.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.elections.all });
    },
  });
}

export function usePublishElection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => elections.publish(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.elections.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.elections.all });
    },
  });
}

// ============================================
// Vote Hooks
// ============================================

export function useSubmitVote() {
  return useMutation({
    mutationFn: ({ electionId, votes: voteData }: { electionId: string; votes: VoteSubmission[] }) =>
      votes.submit(electionId, voteData),
  });
}

export function useVerifyVote(params?: { receiptId: string; commitmentHash: string }) {
  return useQuery({
    queryKey: ['vote', 'verify', params],
    queryFn: () => votes.verify(params!.receiptId, params!.commitmentHash),
    enabled: !!params?.receiptId && !!params?.commitmentHash,
  });
}

// ============================================
// Organization Hooks
// ============================================

export function useOrganizations(params?: { status?: string; plan?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.organizations.list(params),
    queryFn: () => organizations.list(params),
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: queryKeys.organizations.detail(id),
    queryFn: () => organizations.get(id),
    enabled: !!id,
  });
}

export function useOrganizationMembers(id: string) {
  return useQuery({
    queryKey: queryKeys.organizations.members(id),
    queryFn: () => organizations.getMembers(id),
    enabled: !!id,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Organization>) => organizations.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useInviteOrgMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, email, role }: { orgId: string; email: string; role: string }) =>
      organizations.inviteMember(orgId, { email, role }),
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.members(orgId) });
    },
  });
}

// ============================================
// User Hooks
// ============================================

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.users.me,
    queryFn: () => users.me(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUsers(params?: { status?: string; role?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => users.list(params),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => users.get(id),
    enabled: !!id,
  });
}

export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<User>) => users.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
    },
  });
}

// ============================================
// Public API Hooks
// ============================================

export function usePublicElection(electionId: string) {
  return useQuery({
    queryKey: ['public', 'election', electionId],
    queryFn: () => publicApi.getElection(electionId),
    enabled: !!electionId,
  });
}

export function usePublicVerifyVote(receiptId: string, commitmentHash: string) {
  return useQuery({
    queryKey: ['public', 'verify', receiptId, commitmentHash],
    queryFn: () => publicApi.verifyVote({ receiptId, commitmentHash }),
    enabled: !!receiptId && !!commitmentHash,
  });
}
