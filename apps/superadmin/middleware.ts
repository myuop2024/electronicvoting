import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@electronicvoting/auth/server';

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicPatterns = [
    /^\/login$/,
    /^\/api\/auth\/.*/,
    /^\/api\/health$/,
    /^\/_next\/.*/,
    /^\/favicon\.ico$/,
    /^\/images\/.*/,
  ];

  const isPublicRoute = publicPatterns.some((pattern) => pattern.test(pathname));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = session.user as any;

  // Super admin portal requires ADMIN or SUPERADMIN role
  if (!['ADMIN', 'SUPERADMIN'].includes(user.platformRole)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // Require MFA for super admin access
  if (user.mfaEnabled && !user.mfaVerified) {
    const mfaUrl = new URL('/mfa-verify', request.url);
    mfaUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(mfaUrl);
  }

  // Add security headers (strict for super admin)
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  // Add request ID for audit trail
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-Id', requestId);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
