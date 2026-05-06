/**
 * CSRF Protection Utilities for StratexPoints
 *
 * Provides secure CSRF token generation and validation using cryptographic methods.
 * Tokens are base64-encoded cryptographic random values (32 bytes = 256 bits of entropy).
 *
 * Usage:
 * import { generateCSRFToken, validateCSRFToken } from './utils/csrfUtils.js';
 *
 * // Generate token
 * const token = generateCSRFToken();
 * localStorage.setItem('csrf-token', token);
 *
 * // Validate token (compare with stored token)
 * const isValid = await validateCSRFToken(submittedToken, storedToken);
 * if (!isValid) {
 *   logger.warn('CSRF token validation failed');
 * }
 */

/**
 * Generate a cryptographically secure CSRF token
 *
 * Creates a 32-byte (256-bit) random value and encodes it as hexadecimal string.
 * This provides sufficient entropy (2^256 possibilities) for secure token generation.
 *
 * @returns {string} Hexadecimal-encoded CSRF token (64 characters)
 */
export const generateCSRFToken = () => {
  // Generate 32 bytes of cryptographically secure random data
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));

  // Convert byte array to hexadecimal string
  // Each byte becomes 2 hex characters, padded with leading zero if necessary
  const token = Array.from(tokenBytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return token;
};

/**
 * Validate a CSRF token using timing-safe comparison
 *
 * Compares two tokens using a timing-safe algorithm to prevent timing attacks.
 * This is important because standard string comparison (===) can leak timing
 * information about where tokens diverge.
 *
 * @param {string} token - Token submitted with the request (from form or header)
 * @param {string} storedToken - Token stored server-side (from session or storage)
 * @returns {Promise<boolean>} True if tokens match, false otherwise
 * @throws {Error} If crypto.subtle is not available (fallback to timing-unsafe comparison)
 */
export const validateCSRFToken = async (token, storedToken) => {
  // Input validation
  if (!token || !storedToken) {
    return false;
  }

  // Check if tokens are strings
  if (typeof token !== 'string' || typeof storedToken !== 'string') {
    return false;
  }

  // Basic length check (prevents obvious mismatches before timing-safe comparison)
  if (token.length !== storedToken.length) {
    return false;
  }

  try {
    // Use timing-safe comparison to prevent timing attacks
    // crypto.subtle.timingSafeEqual throws if lengths don't match
    const encoder = new TextEncoder();
    const tokenBuffer = encoder.encode(token);
    const storedBuffer = encoder.encode(storedToken);

    // timingSafeEqual throws on length mismatch, so double-check first
    if (tokenBuffer.length !== storedBuffer.length) {
      return false;
    }

    await crypto.subtle.timingSafeEqual(tokenBuffer, storedBuffer);
    return true;
  } catch (error) {
    // crypto.subtle.timingSafeEqual throws if comparison fails
    // Any error means the tokens don't match
    return false;
  }
};

/**
 * Store CSRF token in session storage
 *
 * Session storage is preferred over localStorage because:
 * - It's cleared when the browser tab/window is closed
 * - It's not synced across tabs (better security isolation)
 * - Tokens don't persist across sessions
 *
 * @param {string} key - Key to store token under (default: 'csrf-token')
 * @returns {string} The generated token
 */
export const storeCSRFToken = (key = 'csrf-token') => {
  const token = generateCSRFToken();
  try {
    sessionStorage.setItem(key, token);
  } catch (error) {
    // Handle quota exceeded or access errors
    logger.warn('Failed to store CSRF token in session storage:', error);
  }
  return token;
};

/**
 * Retrieve CSRF token from session storage
 *
 * @param {string} key - Key to retrieve token from (default: 'csrf-token')
 * @returns {string|null} The stored token, or null if not found
 */
export const getCSRFToken = (key = 'csrf-token') => {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    // Handle access errors
    logger.warn('Failed to retrieve CSRF token from session storage:', error);
    return null;
  }
};

/**
 * Clear CSRF token from session storage
 *
 * @param {string} key - Key to clear (default: 'csrf-token')
 */
export const clearCSRFToken = (key = 'csrf-token') => {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    // Handle access errors
    logger.warn('Failed to clear CSRF token from session storage:', error);
  }
};

/**
 * Validate CSRF token from request headers
 *
 * Typical usage in form submissions:
 * - Store token in sessionStorage when app initializes
 * - Include token in form hidden field or header
 * - Validate on submit before processing
 *
 * @param {string} submittedToken - Token from form/header
 * @param {string} key - Session storage key (default: 'csrf-token')
 * @returns {Promise<boolean>} True if validation passes
 */
export const validateCSRFTokenFromStorage = async (submittedToken, key = 'csrf-token') => {
  const storedToken = getCSRFToken(key);
  if (!storedToken) {
    logger.warn('No CSRF token found in session storage');
    return false;
  }
  return await validateCSRFToken(submittedToken, storedToken);
};

export default {
  generateCSRFToken,
  validateCSRFToken,
  storeCSRFToken,
  getCSRFToken,
  clearCSRFToken,
  validateCSRFTokenFromStorage
};
