import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@electronicvoting/database';
import { hashToken } from '@electronicvoting/auth';

// POST /api/auth/verify-email - Verify email with token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email } = body;

    if (!token || !email) {
      return NextResponse.json(
        { message: 'Missing token or email' },
        { status: 400 }
      );
    }

    // Hash the token to compare with stored hash
    const tokenHash = hashToken(token);

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: tokenHash,
        type: 'EMAIL_VERIFICATION',
        usedAt: null, // Not already used
        user: {
          email: email.toLowerCase(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { message: 'Invalid or expired verification link' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (verificationToken.expiresAt < new Date()) {
      return NextResponse.json(
        { message: 'Verification link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if user is already verified
    if (verificationToken.user.emailVerified || verificationToken.user.emailVerifiedAt) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Mark token as used and update user's email verification status
    await prisma.$transaction([
      prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerified: new Date(),
          emailVerifiedAt: new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: verificationToken.userId,
          action: 'user.email_verified',
          resource: 'user',
          resourceId: verificationToken.userId,
          hash: `email-verify-${verificationToken.userId}-${Date.now()}`,
        },
      }),
    ]);

    return NextResponse.json({
      message: 'Email verified successfully. You can now sign in.',
      verified: true,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// GET /api/auth/verify-email - Resend verification email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({
        message: 'If an account exists with this email, a verification link will be sent.',
      });
    }

    // Check if already verified
    if (user.emailVerified || user.emailVerifiedAt) {
      return NextResponse.json({
        message: 'Email is already verified.',
        alreadyVerified: true,
      });
    }

    // Import email functions
    const { createVerificationToken, sendVerificationEmail, formatExpiryDuration, securityConfig } = await import('@electronicvoting/auth');

    // Create new verification token
    const { token, tokenHash, expiresAt } = createVerificationToken();

    // Invalidate any existing tokens
    await prisma.verificationToken.updateMany({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Mark as used to invalidate
      },
    });

    // Create new token
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
        token: tokenHash,
        expiresAt,
      },
    });

    // Build verification URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

    // Send verification email
    await sendVerificationEmail({
      email: email.toLowerCase(),
      firstName: user.firstName || 'User',
      verificationUrl,
      expiresIn: formatExpiryDuration(securityConfig.emailVerificationExpiry),
    });

    return NextResponse.json({
      message: 'If an account exists with this email, a verification link will be sent.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
