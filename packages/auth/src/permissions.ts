import {
  Permission,
  PlatformRole,
  OrgRole,
  PlatformRoleHierarchy,
  OrgRoleHierarchy,
  PlatformRolePermissions,
  OrgRolePermissions,
  UserSession,
} from './types';

/**
 * Check if a platform role has a specific permission
 */
export function platformRoleHasPermission(role: PlatformRole, permission: Permission): boolean {
  const permissions = PlatformRolePermissions[role];
  return permissions.includes(permission);
}

/**
 * Check if an org role has a specific permission
 */
export function orgRoleHasPermission(role: OrgRole, permission: Permission): boolean {
  const permissions = OrgRolePermissions[role];
  return permissions.includes(permission);
}

/**
 * Check if a user has a specific permission in their current context
 */
export function hasPermission(session: UserSession | null, permission: Permission): boolean {
  if (!session) return false;

  // Check platform role permissions first
  if (platformRoleHasPermission(session.platformRole, permission)) {
    return true;
  }

  // Check org role permissions if user has a current org
  if (session.currentOrgRole && orgRoleHasPermission(session.currentOrgRole, permission)) {
    return true;
  }

  return false;
}

/**
 * Check if a user has all specified permissions
 */
export function hasAllPermissions(session: UserSession | null, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(session, permission));
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(session: UserSession | null, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(session, permission));
}

/**
 * Check if a platform role is at least a certain level
 */
export function isPlatformRoleAtLeast(role: PlatformRole, minimumRole: PlatformRole): boolean {
  return PlatformRoleHierarchy[role] >= PlatformRoleHierarchy[minimumRole];
}

/**
 * Check if an org role is at least a certain level
 */
export function isOrgRoleAtLeast(role: OrgRole, minimumRole: OrgRole): boolean {
  return OrgRoleHierarchy[role] >= OrgRoleHierarchy[minimumRole];
}

/**
 * Check if user is a platform admin or higher
 */
export function isPlatformAdmin(session: UserSession | null): boolean {
  if (!session) return false;
  return isPlatformRoleAtLeast(session.platformRole, 'ADMIN');
}

/**
 * Check if user is a superadmin
 */
export function isSuperAdmin(session: UserSession | null): boolean {
  if (!session) return false;
  return session.platformRole === 'SUPERADMIN';
}

/**
 * Check if user is an org admin or higher
 */
export function isOrgAdmin(session: UserSession | null): boolean {
  if (!session || !session.currentOrgRole) return false;
  return isOrgRoleAtLeast(session.currentOrgRole, 'ADMIN');
}

/**
 * Check if user is an org owner
 */
export function isOrgOwner(session: UserSession | null): boolean {
  if (!session) return false;
  return session.currentOrgRole === 'OWNER';
}

/**
 * Check if user can manage an organization
 */
export function canManageOrg(session: UserSession | null, orgId: string): boolean {
  if (!session) return false;

  // Superadmin can manage any org
  if (isSuperAdmin(session)) return true;

  // Check if user is admin or owner of this org
  const membership = session.orgMemberships.find(m => m.orgId === orgId);
  if (!membership) return false;

  return isOrgRoleAtLeast(membership.role, 'ADMIN');
}

/**
 * Check if user can view an organization
 */
export function canViewOrg(session: UserSession | null, orgId: string): boolean {
  if (!session) return false;

  // Platform staff can view orgs
  if (isPlatformRoleAtLeast(session.platformRole, 'SUPPORT')) return true;

  // Check if user is a member of this org
  return session.orgMemberships.some(m => m.orgId === orgId);
}

/**
 * Check if user can access the admin portal
 */
export function canAccessAdminPortal(session: UserSession | null): boolean {
  if (!session) return false;

  // Must have at least one org membership with staff role or higher
  return session.orgMemberships.some(m => isOrgRoleAtLeast(m.role, 'STAFF'));
}

/**
 * Check if user can access the superadmin portal
 */
export function canAccessSuperAdminPortal(session: UserSession | null): boolean {
  if (!session) return false;
  return isPlatformRoleAtLeast(session.platformRole, 'ADMIN');
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(session: UserSession | null): Permission[] {
  if (!session) return [];

  const permissions = new Set<Permission>();

  // Add platform role permissions
  PlatformRolePermissions[session.platformRole].forEach(p => permissions.add(p));

  // Add org role permissions if applicable
  if (session.currentOrgRole) {
    OrgRolePermissions[session.currentOrgRole].forEach(p => permissions.add(p));
  }

  return Array.from(permissions);
}

/**
 * Create a permission guard function
 */
export function createPermissionGuard(requiredPermissions: Permission[]) {
  return (session: UserSession | null): boolean => {
    return hasAllPermissions(session, requiredPermissions);
  };
}

/**
 * Role display names
 */
export const PlatformRoleLabels: Record<PlatformRole, string> = {
  USER: 'User',
  SUPPORT: 'Support',
  MODERATOR: 'Moderator',
  ADMIN: 'Platform Admin',
  SUPERADMIN: 'Super Admin',
};

export const OrgRoleLabels: Record<OrgRole, string> = {
  VIEWER: 'Viewer',
  OBSERVER: 'Observer',
  STAFF: 'Staff',
  MANAGER: 'Manager',
  ADMIN: 'Administrator',
  OWNER: 'Owner',
};

/**
 * Role descriptions
 */
export const OrgRoleDescriptions: Record<OrgRole, string> = {
  VIEWER: 'Can view elections and basic organization information',
  OBSERVER: 'Can view elections, results, and export data',
  STAFF: 'Can manage voters, access codes, and scan ballots',
  MANAGER: 'Can create and manage elections, approve ballots',
  ADMIN: 'Full organization access except ownership transfer',
  OWNER: 'Complete organization control including deletion',
};
