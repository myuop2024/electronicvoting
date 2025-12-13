// API Client for ObserverNet
// Type-safe API client with error handling

import { z } from 'zod';

// API Error class
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Base configuration
export interface ApiClientConfig {
  baseUrl: string;
  getAuthToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
  onError?: (error: ApiError) => void;
}

let config: ApiClientConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
};

export function configureApiClient(newConfig: Partial<ApiClientConfig>) {
  config = { ...config, ...newConfig };
}

// Request options
interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: Record<string, any>;
  params?: Record<string, string | number | boolean | undefined>;
}

// Build URL with query params
function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path, config.baseUrl.startsWith('http') ? config.baseUrl : `${typeof window !== 'undefined' ? window.location.origin : ''}${config.baseUrl}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

// Main fetch function
async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, headers: customHeaders, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  // Add auth token if available
  if (config.getAuthToken) {
    const token = await config.getAuthToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = buildUrl(path, params);

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle response
  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    const error = new ApiError(
      response.status,
      errorData.message || 'An error occurred',
      errorData.code,
      errorData.details
    );

    // Handle unauthorized
    if (response.status === 401 && config.onUnauthorized) {
      config.onUnauthorized();
    }

    // Global error handler
    if (config.onError) {
      config.onError(error);
    }

    throw error;
  }

  // Handle empty responses
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }

  return response.json();
}

// HTTP method helpers
export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    apiFetch<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: Record<string, any>) =>
    apiFetch<T>(path, { method: 'POST', body }),

  put: <T>(path: string, body?: Record<string, any>) =>
    apiFetch<T>(path, { method: 'PUT', body }),

  patch: <T>(path: string, body?: Record<string, any>) =>
    apiFetch<T>(path, { method: 'PATCH', body }),

  delete: <T>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),
};

// ============================================
// API Types
// ============================================

// Election types
export interface Election {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'active' | 'paused' | 'closed' | 'finalized';
  startDate: string;
  endDate: string;
  voterCount: number;
  voteCount: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contest {
  id: string;
  title: string;
  description?: string;
  type: 'single_choice' | 'multiple_choice' | 'ranked_choice' | 'approval';
  maxSelections: number;
  options: ContestOption[];
}

export interface ContestOption {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
}

export interface VoteSubmission {
  contestId: string;
  selectedOptionIds: string[];
  rankings?: { optionId: string; rank: number }[];
}

export interface VoteReceipt {
  receiptId: string;
  commitmentHash: string;
  timestamp: string;
  verificationUrl: string;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  memberCount: number;
  electionCount: number;
  createdAt: string;
}

// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatarUrl?: string;
  platformRole: 'USER' | 'SUPPORT' | 'MODERATOR' | 'ADMIN' | 'SUPERADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  mfaEnabled: boolean;
  orgMemberships: OrgMembership[];
}

export interface OrgMembership {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: 'VIEWER' | 'OBSERVER' | 'STAFF' | 'MANAGER' | 'ADMIN' | 'OWNER';
}

// ============================================
// API Endpoints
// ============================================

export const elections = {
  list: (params?: { status?: string; organizationId?: string; page?: number; limit?: number }) =>
    api.get<{ elections: Election[]; total: number; page: number; limit: number }>('/v1/elections', params),

  get: (id: string) =>
    api.get<Election>(`/v1/elections/${id}`),

  getContests: (electionId: string) =>
    api.get<{ contests: Contest[] }>(`/v1/elections/${electionId}/contests`),

  create: (data: Partial<Election>) =>
    api.post<Election>('/v1/elections', data),

  update: (id: string, data: Partial<Election>) =>
    api.patch<Election>(`/v1/elections/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/v1/elections/${id}`),

  publish: (id: string) =>
    api.post<Election>(`/v1/elections/${id}/publish`),

  close: (id: string) =>
    api.post<Election>(`/v1/elections/${id}/close`),

  getResults: (id: string) =>
    api.get<{ results: any[] }>(`/v1/elections/${id}/results`),
};

export const votes = {
  submit: (electionId: string, votes: VoteSubmission[]) =>
    api.post<VoteReceipt>(`/v1/elections/${electionId}/votes`, { votes }),

  verify: (receiptId: string, commitmentHash: string) =>
    api.get<{ verified: boolean; timestamp: string }>(`/v1/votes/verify`, { receiptId, commitmentHash }),

  getReceipt: (electionId: string, commitmentHash: string) =>
    api.get<VoteReceipt>(`/v1/elections/${electionId}/receipt/${commitmentHash}`),
};

export const organizations = {
  list: (params?: { status?: string; plan?: string; page?: number; limit?: number }) =>
    api.get<{ organizations: Organization[]; total: number }>('/v1/organizations', params),

  get: (id: string) =>
    api.get<Organization>(`/v1/organizations/${id}`),

  create: (data: Partial<Organization>) =>
    api.post<Organization>('/v1/organizations', data),

  update: (id: string, data: Partial<Organization>) =>
    api.patch<Organization>(`/v1/organizations/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/v1/organizations/${id}`),

  getMembers: (id: string) =>
    api.get<{ members: User[] }>(`/v1/organizations/${id}/members`),

  inviteMember: (id: string, data: { email: string; role: string }) =>
    api.post<void>(`/v1/organizations/${id}/invitations`, data),
};

export const users = {
  me: () =>
    api.get<User>('/v1/users/me'),

  update: (data: Partial<User>) =>
    api.patch<User>('/v1/users/me', data),

  list: (params?: { status?: string; role?: string; page?: number; limit?: number }) =>
    api.get<{ users: User[]; total: number }>('/v1/users', params),

  get: (id: string) =>
    api.get<User>(`/v1/users/${id}`),

  updateUser: (id: string, data: Partial<User>) =>
    api.patch<User>(`/v1/users/${id}`, data),
};

// Public API endpoints (no auth required)
export const publicApi = {
  getElection: (electionId: string) =>
    api.get<{ election: Election; contests: Contest[] }>(`/public/elections/${electionId}`),

  verifyVote: (params: { receiptId: string; commitmentHash: string }) =>
    api.get<{ verified: boolean; timestamp: string; blockNumber?: number }>('/public/verify', params),
};
