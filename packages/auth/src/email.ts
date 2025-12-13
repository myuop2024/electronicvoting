/**
 * Email service for authentication flows
 * Uses console.log in development for easy testing without SMTP setup
 * In production, integrate with SendGrid, Postmark, SES, etc.
 */

import { securityConfig } from './config';
import { generateToken, hashToken } from './utils';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface VerificationEmailData {
  email: string;
  firstName: string;
  verificationUrl: string;
  expiresIn: string;
}

export interface PasswordResetEmailData {
  email: string;
  firstName: string;
  resetUrl: string;
  expiresIn: string;
}

/**
 * Send an email using the configured provider
 * In development, logs to console
 * In production, should use actual email service
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Development: Log email to console
    console.log('\n========== EMAIL ==========');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('Body:');
    console.log(options.text);
    console.log('============================\n');
    return;
  }

  // Production: Use configured email provider
  const emailProvider = process.env.EMAIL_PROVIDER || 'mock';

  if (emailProvider === 'mock') {
    console.log(`[Email Service] Would send email to ${options.to}: ${options.subject}`);
    return;
  }

  // Add integrations for actual providers here:
  // - SendGrid: process.env.SENDGRID_API_KEY
  // - Postmark: process.env.POSTMARK_API_KEY
  // - AWS SES: configured via AWS SDK
  // - Resend: process.env.RESEND_API_KEY

  throw new Error(`Email provider '${emailProvider}' not implemented`);
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(data: VerificationEmailData): Promise<void> {
  const subject = 'Verify your email address - ObserverNet';

  const text = `
Hi ${data.firstName},

Welcome to ObserverNet! Please verify your email address by clicking the link below:

${data.verificationUrl}

This link will expire in ${data.expiresIn}.

If you didn't create an account, you can safely ignore this email.

Best regards,
The ObserverNet Team
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">ObserverNet</h1>
  </div>
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1e293b; margin-top: 0;">Verify your email address</h2>
    <p>Hi ${data.firstName},</p>
    <p>Welcome to ObserverNet! Please verify your email address by clicking the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.verificationUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Verify Email Address</a>
    </div>
    <p style="color: #64748b; font-size: 14px;">This link will expire in ${data.expiresIn}.</p>
    <p style="color: #64748b; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    <p style="color: #94a3b8; font-size: 12px; text-align: center;">
      &copy; ${new Date().getFullYear()} ObserverNet. All rights reserved.
    </p>
  </div>
</body>
</html>
`.trim();

  await sendEmail({
    to: data.email,
    subject,
    text,
    html,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
  const subject = 'Reset your password - ObserverNet';

  const text = `
Hi ${data.firstName},

We received a request to reset your password. Click the link below to set a new password:

${data.resetUrl}

This link will expire in ${data.expiresIn}.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
The ObserverNet Team
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">ObserverNet</h1>
  </div>
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1e293b; margin-top: 0;">Reset your password</h2>
    <p>Hi ${data.firstName},</p>
    <p>We received a request to reset your password. Click the button below to set a new password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.resetUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
    </div>
    <p style="color: #64748b; font-size: 14px;">This link will expire in ${data.expiresIn}.</p>
    <p style="color: #64748b; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    <p style="color: #94a3b8; font-size: 12px; text-align: center;">
      &copy; ${new Date().getFullYear()} ObserverNet. All rights reserved.
    </p>
  </div>
</body>
</html>
`.trim();

  await sendEmail({
    to: data.email,
    subject,
    text,
    html,
  });
}

/**
 * Generate verification token and expiry
 */
export function createVerificationToken(): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + securityConfig.emailVerificationExpiry);

  return { token, tokenHash, expiresAt };
}

/**
 * Generate password reset token and expiry
 */
export function createPasswordResetToken(): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + securityConfig.passwordResetExpiry);

  return { token, tokenHash, expiresAt };
}

/**
 * Format expiry duration for email display
 */
export function formatExpiryDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}
