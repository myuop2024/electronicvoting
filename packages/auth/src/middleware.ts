import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './server';

export async function authMiddleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicPatterns = [
    /^\/$/,
    /^\/auth\/.*/,
    /^\/e\/[^/]+\/vote$/,
    /^\/e\/[^/]+\/receipt\/.*/,
    /^\/verify$/,
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
  if (!session?.user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = session.user as any;

  // Check MFA verification if required
  if (user.mfaEnabled && !user.mfaVerified && !pathname.startsWith('/auth/mfa')) {
    return NextResponse.redirect(new URL('/auth/mfa', request.url));
  }

  // Route-specific access control
  if (pathname.startsWith('/superadmin')) {
    if (!['ADMIN', 'SUPERADMIN'].includes(user.platformRole)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  if (pathname.startsWith('/admin')) {
    const hasOrgAccess = user.orgMemberships?.some((m: any) =>
      ['STAFF', 'MANAGER', 'ADMIN', 'OWNER'].includes(m.role)
    );
    if (!hasOrgAccess) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
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
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Add request ID for tracing
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-Id', requestId);

  return response;
}

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || record.resetTime < now) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetIn: record.resetTime - now,
  };
}

// IP extraction
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

// User agent parsing
export function parseUserAgent(request: NextRequest): {
  browser: string;
  os: string;
  device: string;
} {
  const ua = request.headers.get('user-agent') || '';

  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  // Browser detection
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  // OS detection
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Device detection
  if (ua.includes('Mobile') || ua.includes('Android')) device = 'Mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';

  return { browser, os, device };
}
