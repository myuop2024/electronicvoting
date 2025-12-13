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

    // Save token to database
    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
      update: {
        token: hashedToken,
        expiresAt,
      },
    });

    // TODO: Send email with reset link
    // const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
    // await sendEmail({
    //   to: user.email,
    //   subject: 'Reset your password',
    //   html: `Click here to reset your password: ${resetUrl}`
    // });

    console.log(`Password reset token for ${email}: ${resetToken}`);

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
