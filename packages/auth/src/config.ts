import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { LoginSchema, UserSession, PlatformRole, OrgRole } from './types';

// Auth configuration
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
    newUser: '/auth/welcome',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.displayName = (user as any).displayName;
        token.avatarUrl = (user as any).avatarUrl;
        token.platformRole = (user as any).platformRole;
        token.mfaEnabled = (user as any).mfaEnabled;
        token.mfaVerified = (user as any).mfaVerified;
        token.orgMemberships = (user as any).orgMemberships || [];
      }

      // Handle session updates
      if (trigger === 'update' && session) {
        if (session.currentOrgId !== undefined) {
          token.currentOrgId = session.currentOrgId;
          const membership = (token.orgMemberships as any[])?.find(
            (m: any) => m.orgId === session.currentOrgId
          );
          token.currentOrgRole = membership?.role;
        }
        if (session.mfaVerified !== undefined) {
          token.mfaVerified = session.mfaVerified;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).firstName = token.firstName as string;
        (session.user as any).lastName = token.lastName as string;
        (session.user as any).displayName = token.displayName as string | undefined;
        (session.user as any).avatarUrl = token.avatarUrl as string | undefined;
        (session.user as any).platformRole = token.platformRole as PlatformRole;
        (session.user as any).mfaEnabled = token.mfaEnabled as boolean;
        (session.user as any).mfaVerified = token.mfaVerified as boolean | undefined;
        (session.user as any).currentOrgId = token.currentOrgId as string | undefined;
        (session.user as any).currentOrgRole = token.currentOrgRole as OrgRole | undefined;
        (session.user as any).orgMemberships = token.orgMemberships as UserSession['orgMemberships'];
      }
      return session;
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // Public routes
      const publicRoutes = [
        '/',
        '/auth/login',
        '/auth/register',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/verify',
        '/verify',
      ];

      const isPublicRoute = publicRoutes.some(
        route => pathname === route || pathname.startsWith('/e/') || pathname.startsWith('/api/public/')
      );

      if (isPublicRoute) {
        return true;
      }

      // Redirect to login if not authenticated
      if (!isLoggedIn) {
        return false;
      }

      // Check MFA if enabled
      const user = auth?.user as any;
      if (user?.mfaEnabled && !user?.mfaVerified) {
        const isMfaRoute = pathname.startsWith('/auth/mfa');
        if (!isMfaRoute) {
          return Response.redirect(new URL('/auth/mfa', request.nextUrl));
        }
      }

      // Route-based access control
      if (pathname.startsWith('/superadmin')) {
        const platformRole = user?.platformRole as PlatformRole;
        if (!['ADMIN', 'SUPERADMIN'].includes(platformRole)) {
          return Response.redirect(new URL('/unauthorized', request.nextUrl));
        }
      }

      if (pathname.startsWith('/admin')) {
        const orgMemberships = user?.orgMemberships || [];
        const hasOrgAccess = orgMemberships.some(
          (m: any) => ['STAFF', 'MANAGER', 'ADMIN', 'OWNER'].includes(m.role)
        );
        if (!hasOrgAccess) {
          return Response.redirect(new URL('/unauthorized', request.nextUrl));
        }
      }

      return true;
    },
  },
  providers: [
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
          return null;
        }

        // This will be implemented in the server.ts with actual database lookup
        // For now, return null to indicate the implementation needs to be done
        // in the app-specific auth configuration
        return null;
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  events: {
    async signIn({ user, account, isNewUser }) {
      // Log sign-in event for audit
      console.log(`User ${user.email} signed in via ${account?.provider}`);
    },
    async signOut({ token }) {
      // Log sign-out event
      console.log(`User ${token?.email} signed out`);
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

// Security settings
export const securityConfig = {
  // Password hashing
  bcryptRounds: 12,

  // Session
  sessionMaxAge: 30 * 24 * 60 * 60, // 30 days
  rememberMeMaxAge: 90 * 24 * 60 * 60, // 90 days

  // Rate limiting
  loginAttempts: {
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },

  // Password reset
  passwordResetExpiry: 60 * 60 * 1000, // 1 hour

  // Email verification
  emailVerificationExpiry: 24 * 60 * 60 * 1000, // 24 hours

  // MFA
  mfaCodeExpiry: 5 * 60, // 5 minutes
  mfaBackupCodesCount: 10,

  // WebAuthn
  webauthn: {
    rpName: 'ObserverNet Elections',
    rpId: process.env.WEBAUTHN_RP_ID || 'localhost',
    origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    attestationType: 'none' as const,
    authenticatorSelection: {
      authenticatorAttachment: 'platform' as const,
      userVerification: 'preferred' as const,
      residentKey: 'preferred' as const,
    },
  },
};
