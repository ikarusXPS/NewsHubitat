/**
 * Disposable Email Domain Checker
 * Blocks registration with throwaway email addresses (D-16)
 */
import disposableDomains from 'disposable-email-domains';

// Pre-compute Set for O(1) lookup
const disposableSet = new Set<string>(disposableDomains);

/**
 * Check if an email uses a disposable/temporary domain
 * @param email - Email address to check
 * @returns true if email domain is disposable (should be blocked)
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? disposableSet.has(domain) : false;
}

/**
 * Get the domain from an email address
 * @param email - Email address
 * @returns Domain portion of email, or null if invalid
 */
export function getEmailDomain(email: string): string | null {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}
