/**
 * Token Utilities
 * Secure token generation and verification for auth flows
 */
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

/**
 * Generate a cryptographically secure token and its hash
 * Per D-13: 32-byte crypto random hex string (64 chars)
 * Per D-14: Store only the SHA-256 hash in database
 */
export function generateSecureToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/**
 * Hash a token for database lookup
 * Used when verifying incoming tokens from email links
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time comparison to prevent timing attacks
 * Returns true if token hashes match
 */
export function verifyTokenHash(token: string, storedHash: string): boolean {
  try {
    const tokenHash = hashToken(token);
    const tokenBuffer = Buffer.from(tokenHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');

    // Constant-time comparison prevents timing-based enumeration
    return timingSafeEqual(tokenBuffer, storedBuffer);
  } catch {
    // Invalid hex string or buffer length mismatch
    return false;
  }
}

/**
 * Calculate token expiry date
 * @param hoursFromNow - Hours until expiry (24 for verification per D-02, 1 for reset per D-25)
 */
export function getTokenExpiry(hoursFromNow: number): Date {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(expiry: Date | null): boolean {
  if (!expiry) return true;
  return new Date() > expiry;
}
