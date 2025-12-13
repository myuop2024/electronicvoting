import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@electronicvoting/database';
import { hashToken } from '@electronicvoting/auth';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to database (upsert to handle existing tokens)
    // First delete any existing tokens for this user
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    // Create new token
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });

    // Send password reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // In production, use the email service
    // For development, log the token
    if (process.env.NODE_ENV === 'production') {
      try {
        const response = await fetch(`${process.env.API_URL || 'http://localhost:8000'}/api/email/password-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_email: user.email,
            reset_token: resetToken,
            user_name: user.firstName,
          }),
        });

        if (!response.ok) {
          console.error('Failed to send password reset email');
        }
      } catch (error) {
        console.error('Email service error:', error);
      }
    } else {
      // Development: log the reset URL
      console.log(`\n========================================`);
      console.log(`Password Reset Link for ${email}:`);
      console.log(resetUrl);
      console.log(`========================================\n`);
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'user.password_reset_requested',
        resource: 'user',
        resourceId: user.id,
        hash: `reset-request-${user.id}-${Date.now()}`,
      },
    });

    return NextResponse.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
