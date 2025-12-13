import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@electronicvoting/auth/server';

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicPatterns = [
    /^\/login$/,
    /^\/forgot-password$/,
    /^\/reset-password$/,
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

  // Check if user has admin access to any organization
  const hasOrgAccess = user.orgMemberships?.some((m: any) =>
    ['STAFF', 'MANAGER', 'ADMIN', 'OWNER'].includes(m.role)
  );

  if (!hasOrgAccess && !['ADMIN', 'SUPERADMIN'].includes(user.platformRole)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // Add security headers
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
  );

  // Add request ID for tracing
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-Id', requestId);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
