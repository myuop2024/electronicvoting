import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@electronicvoting/database';
import { authConfig, securityConfig } from './config';
import { LoginSchema, UserSession, PlatformRole, OrgRole } from './types';
import { verifyPassword, hashToken } from './utils';
import * as OTPAuth from 'otpauth';

// Extended auth configuration with database integration
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    ...authConfig.providers.filter(p => p.id !== 'credentials'),
    Credentials({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mfaCode: { label: 'MFA Code', type: 'text' },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error('Invalid credentials format');
        }

        const { email, password, mfaCode } = parsed.data;

        // Find user
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            orgMemberships: {
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error('Invalid email or password');
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const remainingMinutes = Math.ceil(
            (user.lockedUntil.getTime() - Date.now()) / 60000
          );
          throw new Error(`Account locked. Try again in ${remainingMinutes} minutes.`);
        }

        // Check account status
        if (user.status === 'SUSPENDED') {
          throw new Error('Account suspended. Contact support.');
        }

        if (user.status === 'DEACTIVATED') {
          throw new Error('Account deactivated.');
        }

        // Verify password
        const isValid = await verifyPassword(password, user.passwordHash);

        if (!isValid) {
          // Increment failed attempts
          const newFailedAttempts = user.failedLoginAttempts + 1;
          const updates: any = { failedLoginAttempts: newFailedAttempts };

          // Lock account if too many attempts
          if (newFailedAttempts >= securityConfig.loginAttempts.maxAttempts) {
            updates.lockedUntil = new Date(
              Date.now() + securityConfig.loginAttempts.lockoutDuration
            );
          }

          await prisma.user.update({
            where: { id: user.id },
            data: updates,
          });

          throw new Error('Invalid email or password');
        }

        // Check MFA if enabled
        let mfaVerified = false;
        if (user.mfaEnabled && user.mfaSecret) {
          if (!mfaCode) {
            throw new Error('MFA_REQUIRED');
          }

          // Verify TOTP code
          const totp = new OTPAuth.TOTP({
            issuer: 'ObserverNet',
            label: user.email,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: user.mfaSecret,
          });

          const delta = totp.validate({ token: mfaCode, window: 1 });

          if (delta === null) {
            // Check backup codes
            const backupCodes = user.mfaBackupCodes || [];
            const hashedCode = hashToken(mfaCode);
            const codeIndex = backupCodes.indexOf(hashedCode);

            if (codeIndex === -1) {
              throw new Error('Invalid MFA code');
            }

            // Remove used backup code
            const newBackupCodes = [...backupCodes];
            newBackupCodes.splice(codeIndex, 1);
            await prisma.user.update({
              where: { id: user.id },
              data: { mfaBackupCodes: newBackupCodes },
            });
          }

          mfaVerified = true;
        }

        // Reset failed attempts and update last login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            lastLoginIp: null, // Would be set from request in middleware
          },
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'user.login',
            resource: 'user',
            resourceId: user.id,
            hash: hashToken(`login-${user.id}-${Date.now()}`),
          },
        });

        // Return user data for session
        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          platformRole: user.platformRole as PlatformRole,
          mfaEnabled: user.mfaEnabled,
          mfaVerified,
          orgMemberships: user.orgMemberships.map((m) => ({
            orgId: m.organization.id,
            orgName: m.organization.name,
            orgSlug: m.organization.slug,
            role: m.role as OrgRole,
          })),
        };
      },
    }),
  ],
});

// Helper to get current session
export async function getCurrentUser(): Promise<UserSession | null> {
  const session = await auth();
  if (!session?.user) return null;

  return session.user as unknown as UserSession;
}

// Helper to require authentication
export async function requireAuth(): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Helper to require specific role
export async function requireRole(minimumRole: PlatformRole): Promise<UserSession> {
  const user = await requireAuth();

  const roleHierarchy: Record<PlatformRole, number> = {
    USER: 0,
    SUPPORT: 1,
    MODERATOR: 2,
    ADMIN: 3,
    SUPERADMIN: 4,
  };

  if (roleHierarchy[user.platformRole] < roleHierarchy[minimumRole]) {
    throw new Error('Forbidden');
  }

  return user;
}

// Helper to require org membership
export async function requireOrgAccess(
  orgId: string,
  minimumRole?: OrgRole
): Promise<UserSession> {
  const user = await requireAuth();

  // Superadmin can access any org
  if (user.platformRole === 'SUPERADMIN') {
    return user;
  }

  const membership = user.orgMemberships.find((m) => m.orgId === orgId);
  if (!membership) {
    throw new Error('Forbidden');
  }

  if (minimumRole) {
    const roleHierarchy: Record<OrgRole, number> = {
      VIEWER: 0,
      OBSERVER: 1,
      STAFF: 2,
      MANAGER: 3,
      ADMIN: 4,
      OWNER: 5,
    };

    if (roleHierarchy[membership.role] < roleHierarchy[minimumRole]) {
      throw new Error('Forbidden');
    }
  }

  return {
    ...user,
    currentOrgId: orgId,
    currentOrgRole: membership.role,
  };
}

// Export types
export type { UserSession };
