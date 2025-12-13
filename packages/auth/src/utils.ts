import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { securityConfig } from './config';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, securityConfig.bcryptRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure access code (human-readable)
 */
export function generateAccessCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Generate a numeric code (for MFA)
 */
export function generateNumericCode(length: number = 6): string {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += (bytes[i] % 10).toString();
  }
  return code;
}

/**
 * Hash a token for storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate backup codes for MFA
 */
export function generateBackupCodes(count: number = securityConfig.mfaBackupCodesCount): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(generateAccessCode(10));
  }
  return codes;
}

// ============================================================================
// VOTE ANONYMITY - CRYPTOGRAPHIC FUNCTIONS
// ============================================================================

/**
 * Generate a secure vote token for anonymous ballot submission
 * This token is given to the voter after verification, but the ballot
 * uses only the hash - breaking the voter-ballot linkage
 */
export function generateVoteToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

/**
 * Hash a vote token for storage/lookup
 */
export function hashVoteToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically secure salt for ballot commitment
 */
export function generateCommitmentSalt(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Create a ballot commitment (hash of encrypted ballot content + salt)
 * SECURITY: This does NOT include any voter-identifying information
 * The commitment allows voters to verify their vote was recorded correctly
 * without revealing vote content to observers
 *
 * Commitment = SHA256(encryptedBallot || salt || electionId || timestamp)
 */
export function createBallotCommitment(data: {
  electionId: string;
  encryptedBallot: string;
  salt: string;
  timestamp?: number;
}): string {
  const ts = data.timestamp || Date.now();
  // Deterministic JSON serialization for consistent hashing
  const payload = `${data.encryptedBallot}|${data.salt}|${data.electionId}|${ts}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Verify a ballot commitment matches the expected value
 */
export function verifyBallotCommitment(
  commitment: string,
  data: {
    electionId: string;
    encryptedBallot: string;
    salt: string;
    timestamp: number;
  }
): boolean {
  const expectedCommitment = createBallotCommitment(data);
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(commitment, 'hex'),
    Buffer.from(expectedCommitment, 'hex')
  );
}

/**
 * Encrypt ballot content using AES-256-GCM
 * This provides authenticated encryption
 */
export function encryptBallot(
  selections: any[],
  encryptionKey: Buffer
): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);

  const plaintext = JSON.stringify(selections);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

/**
 * Decrypt ballot content using AES-256-GCM
 */
export function decryptBallot(
  data: { encrypted: string; iv: string; authTag: string },
  encryptionKey: Buffer
): any[] {
  const iv = Buffer.from(data.iv, 'base64');
  const authTag = Buffer.from(data.authTag, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}

/**
 * Generate an election-specific encryption key
 * In production, this should be managed by a Hardware Security Module (HSM)
 */
export function deriveElectionKey(
  masterSecret: string,
  electionId: string
): Buffer {
  return crypto.pbkdf2Sync(masterSecret, electionId, 100000, 32, 'sha256');
}

/**
 * Create a voter receipt that can be used to verify vote was recorded
 * WITHOUT revealing vote content
 */
export function createVoterReceipt(data: {
  commitmentHash: string;
  timestamp: number;
  electionId: string;
}): string {
  const payload = JSON.stringify({
    c: data.commitmentHash,
    t: data.timestamp,
    e: data.electionId,
  });
  // Create a short, shareable receipt code
  const hash = crypto.createHash('sha256').update(payload).digest('hex');
  return hash.substring(0, 16).toUpperCase();
}

// DEPRECATED: Old function kept for backwards compatibility warning
/**
 * @deprecated Use createBallotCommitment instead. This function includes voterId which breaks anonymity.
 */
export function createCommitmentHash(data: {
  electionId: string;
  voterId: string;
  selections: any[];
  salt?: string;
}): string {
  console.warn('SECURITY WARNING: createCommitmentHash is deprecated and breaks vote anonymity. Use createBallotCommitment instead.');
  const salt = data.salt || generateToken(16);
  const payload = JSON.stringify({
    electionId: data.electionId,
    // REMOVED: voterId is no longer included
    selections: data.selections,
    salt,
    timestamp: Date.now(),
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Create a hash chain entry for audit logs
 */
export function createAuditHash(data: {
  previousHash: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  timestamp: Date;
}): string {
  const payload = JSON.stringify({
    previousHash: data.previousHash || '',
    action: data.action,
    resource: data.resource,
    resourceId: data.resourceId || '',
    details: data.details || {},
    timestamp: data.timestamp.toISOString(),
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 10000); // Limit length
}

/**
 * Generate a slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Calculate password strength
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('Password should be at least 8 characters');

  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Add uppercase letters');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Add lowercase letters');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Add numbers');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Add special characters');

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score--;
    feedback.push('Avoid repeated characters');
  }

  if (/^[a-zA-Z]+$/.test(password) || /^\d+$/.test(password)) {
    score--;
    feedback.push('Mix different character types');
  }

  return { score: Math.max(0, Math.min(5, score)), feedback };
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format a date and time for display
 */
export function formatDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

/**
 * Get time ago string
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(d);
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) return data;

  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'hash', 'code'];
  const result: any = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(k => lowerKey.includes(k))) {
      result[key] = '***REDACTED***';
    } else if (typeof value === 'object') {
      result[key] = maskSensitiveData(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}
