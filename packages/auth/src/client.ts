'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import {
  UserSession,
  Permission,
  PlatformRole,
  OrgRole,
} from './types';
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isPlatformAdmin,
  isSuperAdmin,
  isOrgAdmin,
  canAccessAdminPortal,
  canAccessSuperAdminPortal,
  getUserPermissions,
} from './permissions';

// Re-export session hook
export { useSession, signIn, signOut };

/**
 * Custom hook for authentication with enhanced functionality
 */
export function useAuth() {
  const { data: session, status, update } = useSession();

  const user = useMemo(() => {
    if (!session?.user) return null;
    return session.user as unknown as UserSession;
  }, [session]);

  const isAuthenticated = status === 'authenticated' && !!user;
  const isLoading = status === 'loading';

  // Login function
  const login = useCallback(
    async (credentials: { email: string; password: string; mfaCode?: string }) => {
      const result = await signIn('credentials', {
        ...credentials,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'MFA_REQUIRED') {
          return { success: false, mfaRequired: true };
        }
        return { success: false, error: result.error };
      }

      return { success: true };
    },
    []
  );

  // Logout function
  const logout = useCallback(async () => {
    await signOut({ redirect: true, callbackUrl: '/' });
  }, []);

  // Switch organization context
  const switchOrg = useCallback(
    async (orgId: string) => {
      if (!user) return;
      await update({ currentOrgId: orgId });
    },
    [user, update]
  );

  // Verify MFA
  const verifyMfa = useCallback(
    async (code: string) => {
      await update({ mfaVerified: true });
    },
    [update]
  );

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    switchOrg,
    verifyMfa,
    session,
    update,
  };
}

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return hasPermission(user, permission);
}

/**
 * Hook to check if user has all specified permissions
 */
export function usePermissions(permissions: Permission[]): boolean {
  const { user } = useAuth();
  return hasAllPermissions(user, permissions);
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useAnyPermission(permissions: Permission[]): boolean {
  const { user } = useAuth();
  return hasAnyPermission(user, permissions);
}

/**
 * Hook to get all user permissions
 */
export function useAllPermissions(): Permission[] {
  const { user } = useAuth();
  return useMemo(() => getUserPermissions(user), [user]);
}

/**
 * Hook to check role-based access
 */
export function useRoleAccess() {
  const { user } = useAuth();

  return useMemo(
    () => ({
      isPlatformAdmin: isPlatformAdmin(user),
      isSuperAdmin: isSuperAdmin(user),
      isOrgAdmin: isOrgAdmin(user),
      canAccessAdminPortal: canAccessAdminPortal(user),
      canAccessSuperAdminPortal: canAccessSuperAdminPortal(user),
      platformRole: user?.platformRole,
      currentOrgRole: user?.currentOrgRole,
    }),
    [user]
  );
}

/**
 * Hook to get current organization context
 */
export function useCurrentOrg() {
  const { user, switchOrg } = useAuth();

  const currentOrg = useMemo(() => {
    if (!user?.currentOrgId) {
      // Return first org membership if no current org is set
      return user?.orgMemberships?.[0] || null;
    }
    return user.orgMemberships?.find((m) => m.orgId === user.currentOrgId) || null;
  }, [user]);

  return {
    currentOrg,
    orgMemberships: user?.orgMemberships || [],
    switchOrg,
  };
}

/**
 * Higher-order component for protected routes
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredPermissions?: Permission[];
    requiredRole?: PlatformRole;
    redirectTo?: string;
  }
) {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      );
    }

    if (!user) {
      if (typeof window !== 'undefined') {
        window.location.href = options?.redirectTo || '/auth/login';
      }
      return null;
    }

    if (options?.requiredPermissions) {
      const hasPerms = hasAllPermissions(user, options.requiredPermissions);
      if (!hasPerms) {
        if (typeof window !== 'undefined') {
          window.location.href = '/unauthorized';
        }
        return null;
      }
    }

    return <Component {...props} />;
  };
}

/**
 * Component to conditionally render based on permissions
 */
export function Can({
  permission,
  permissions,
  any = false,
  children,
  fallback,
}: {
  permission?: Permission;
  permissions?: Permission[];
  any?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(user, permission);
  } else if (permissions) {
    hasAccess = any
      ? hasAnyPermission(user, permissions)
      : hasAllPermissions(user, permissions);
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}

/**
 * Component to render for specific roles only
 */
export function RoleGate({
  role,
  children,
  fallback,
}: {
  role: PlatformRole | PlatformRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user) {
    return fallback ? <>{fallback}</> : null;
  }

  const allowedRoles = Array.isArray(role) ? role : [role];

  if (allowedRoles.includes(user.platformRole)) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}
