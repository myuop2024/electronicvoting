import { z } from 'zod';

// Platform-level roles (system-wide)
export const PlatformRoles = {
  USER: 'USER',
  SUPPORT: 'SUPPORT',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
  SUPERADMIN: 'SUPERADMIN',
} as const;

export type PlatformRole = keyof typeof PlatformRoles;

// Organization-level roles
export const OrgRoles = {
  VIEWER: 'VIEWER',
  OBSERVER: 'OBSERVER',
  STAFF: 'STAFF',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
} as const;

export type OrgRole = keyof typeof OrgRoles;

// Role hierarchy (higher index = more permissions)
export const PlatformRoleHierarchy: Record<PlatformRole, number> = {
  USER: 0,
  SUPPORT: 1,
  MODERATOR: 2,
  ADMIN: 3,
  SUPERADMIN: 4,
};

export const OrgRoleHierarchy: Record<OrgRole, number> = {
  VIEWER: 0,
  OBSERVER: 1,
  STAFF: 2,
  MANAGER: 3,
  ADMIN: 4,
  OWNER: 5,
};

// Permission types
export const Permissions = {
  // Organization permissions
  ORG_VIEW: 'org:view',
  ORG_EDIT: 'org:edit',
  ORG_DELETE: 'org:delete',
  ORG_MANAGE_MEMBERS: 'org:manage_members',
  ORG_MANAGE_BILLING: 'org:manage_billing',
  ORG_MANAGE_SETTINGS: 'org:manage_settings',

  // Election permissions
  ELECTION_VIEW: 'election:view',
  ELECTION_CREATE: 'election:create',
  ELECTION_EDIT: 'election:edit',
  ELECTION_DELETE: 'election:delete',
  ELECTION_PUBLISH: 'election:publish',
  ELECTION_MANAGE_VOTERS: 'election:manage_voters',
  ELECTION_MANAGE_CODES: 'election:manage_codes',
  ELECTION_VIEW_RESULTS: 'election:view_results',
  ELECTION_EXPORT_RESULTS: 'election:export_results',
  ELECTION_MANAGE_OBSERVERS: 'election:manage_observers',

  // Paper ballot permissions
  BALLOT_SCAN: 'ballot:scan',
  BALLOT_REVIEW: 'ballot:review',
  BALLOT_APPROVE: 'ballot:approve',

  // Analytics permissions
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',

  // Platform permissions (superadmin only)
  PLATFORM_MANAGE_ORGS: 'platform:manage_orgs',
  PLATFORM_MANAGE_USERS: 'platform:manage_users',
  PLATFORM_MANAGE_CONFIG: 'platform:manage_config',
  PLATFORM_VIEW_LOGS: 'platform:view_logs',
  PLATFORM_MANAGE_FABRIC: 'platform:manage_fabric',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

// Role to permission mapping
export const OrgRolePermissions: Record<OrgRole, Permission[]> = {
  VIEWER: [
    Permissions.ORG_VIEW,
    Permissions.ELECTION_VIEW,
  ],
  OBSERVER: [
    Permissions.ORG_VIEW,
    Permissions.ELECTION_VIEW,
    Permissions.ELECTION_VIEW_RESULTS,
    Permissions.ELECTION_EXPORT_RESULTS,
    Permissions.ANALYTICS_VIEW,
  ],
  STAFF: [
    Permissions.ORG_VIEW,
    Permissions.ELECTION_VIEW,
    Permissions.ELECTION_MANAGE_VOTERS,
    Permissions.ELECTION_MANAGE_CODES,
    Permissions.ELECTION_VIEW_RESULTS,
    Permissions.BALLOT_SCAN,
    Permissions.BALLOT_REVIEW,
    Permissions.ANALYTICS_VIEW,
  ],
  MANAGER: [
    Permissions.ORG_VIEW,
    Permissions.ELECTION_VIEW,
    Permissions.ELECTION_CREATE,
    Permissions.ELECTION_EDIT,
    Permissions.ELECTION_PUBLISH,
    Permissions.ELECTION_MANAGE_VOTERS,
    Permissions.ELECTION_MANAGE_CODES,
    Permissions.ELECTION_VIEW_RESULTS,
    Permissions.ELECTION_EXPORT_RESULTS,
    Permissions.ELECTION_MANAGE_OBSERVERS,
    Permissions.BALLOT_SCAN,
    Permissions.BALLOT_REVIEW,
    Permissions.BALLOT_APPROVE,
    Permissions.ANALYTICS_VIEW,
    Permissions.ANALYTICS_EXPORT,
  ],
  ADMIN: [
    Permissions.ORG_VIEW,
    Permissions.ORG_EDIT,
    Permissions.ORG_MANAGE_MEMBERS,
    Permissions.ORG_MANAGE_SETTINGS,
    Permissions.ELECTION_VIEW,
    Permissions.ELECTION_CREATE,
    Permissions.ELECTION_EDIT,
    Permissions.ELECTION_DELETE,
    Permissions.ELECTION_PUBLISH,
    Permissions.ELECTION_MANAGE_VOTERS,
    Permissions.ELECTION_MANAGE_CODES,
    Permissions.ELECTION_VIEW_RESULTS,
    Permissions.ELECTION_EXPORT_RESULTS,
    Permissions.ELECTION_MANAGE_OBSERVERS,
    Permissions.BALLOT_SCAN,
    Permissions.BALLOT_REVIEW,
    Permissions.BALLOT_APPROVE,
    Permissions.ANALYTICS_VIEW,
    Permissions.ANALYTICS_EXPORT,
  ],
  OWNER: [
    // All permissions
    ...Object.values(Permissions).filter(p => !p.startsWith('platform:')),
  ],
};

export const PlatformRolePermissions: Record<PlatformRole, Permission[]> = {
  USER: [],
  SUPPORT: [
    Permissions.ORG_VIEW,
    Permissions.ELECTION_VIEW,
  ],
  MODERATOR: [
    Permissions.ORG_VIEW,
    Permissions.ELECTION_VIEW,
    Permissions.ELECTION_VIEW_RESULTS,
    Permissions.PLATFORM_VIEW_LOGS,
  ],
  ADMIN: [
    Permissions.PLATFORM_MANAGE_ORGS,
    Permissions.PLATFORM_MANAGE_USERS,
    Permissions.PLATFORM_VIEW_LOGS,
  ],
  SUPERADMIN: Object.values(Permissions) as Permission[],
};

// User session type
export interface UserSession {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatarUrl?: string;
  platformRole: PlatformRole;
  mfaEnabled: boolean;
  mfaVerified?: boolean;
  currentOrgId?: string;
  currentOrgRole?: OrgRole;
  orgMemberships: Array<{
    orgId: string;
    orgName: string;
    orgSlug: string;
    role: OrgRole;
  }>;
}

// Auth schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  mfaCode: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const MfaSetupSchema = z.object({
  code: z.string().length(6, 'MFA code must be 6 digits').regex(/^\d+$/, 'MFA code must be numeric'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type MfaSetupInput = z.infer<typeof MfaSetupSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
