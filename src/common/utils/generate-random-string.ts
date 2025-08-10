import crypto from 'crypto';

/**
 * Generate a cryptographically secure random string.
 * Default: 32 bytes, base64url encoding (safe for URLs and cookies).
 *
 * @param length Number of bytes to generate (default: 32)
 * @param encoding Encoding type: 'base64url' | 'hex' | 'base64' (default: 'base64url')
 * @returns Random string
 */
export function generateSessionId(
  length = 32,
  encoding: 'base64url' | 'hex' | 'base64' = 'base64url',
): string {
  return crypto.randomBytes(length).toString(encoding);
}
