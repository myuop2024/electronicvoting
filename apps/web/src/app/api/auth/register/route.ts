import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@electronicvoting/database';
import {
  hashPassword,
  createVerificationToken,
  sendVerificationEmail,
  formatExpiryDuration,
  securityConfig,
} from '@electronicvoting/auth';
import { z } from 'zod';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, password } = result.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        passwordHash,
        platformRole: 'USER',
        status: 'ACTIVE',
        emailVerified: null, // Will be set when email is verified
      },
    });

    // Create email verification token
    const { token, tokenHash, expiresAt } = createVerificationToken();

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
        token: tokenHash, // Store hashed token
        expiresAt,
      },
    });

    // Build verification URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

    // Send verification email
    try {
      await sendVerificationEmail({
        email: email.toLowerCase(),
        firstName,
        verificationUrl,
        expiresIn: formatExpiryDuration(securityConfig.emailVerificationExpiry),
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails - user can request resend
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'user.register',
        resource: 'user',
        resourceId: user.id,
        hash: `register-${user.id}-${Date.now()}`,
      },
    });

    return NextResponse.json(
      {
        message: 'Account created successfully. Please check your email to verify your account.',
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
