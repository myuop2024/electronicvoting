import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@electronicvoting/auth/server';

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicPatterns = [
    /^\/$/,
    /^\/login$/,
    /^\/register$/,
    /^\/forgot-password$/,
    /^\/reset-password$/,
    /^\/verify-email$/,
    /^\/e\/[^/]+\/vote$/,
    /^\/e\/[^/]+\/receipt\/.*/,
    /^\/verify$/,
    /^\/api\/auth\/.*/,
    /^\/api\/public\/.*/,
    /^\/api\/webhooks\/.*/,
    /^\/api\/health$/,
    /^\/_next\/.*/,
    /^\/favicon\.ico$/,
    /^\/images\/.*/,
    /^\/fonts\/.*/,
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

  // Add security headers
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Add request ID for tracing
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-Id', requestId);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
