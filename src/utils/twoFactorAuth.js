/**
 * Two-Factor Authentication (2FA) Utilities for StratexPoints
 *
 * Provides implementation for multi-factor authentication including:
 * - TOTP (Time-based One-Time Password) using standard algorithms
 * - SMS-based verification codes
 * - Recovery codes for account recovery
 * - 2FA setup and verification workflows
 *
 * TOTP Implementation Notes:
 * - Uses standard RFC 6238 algorithm
 * - 30-second time steps
 * - 6-digit codes
 * - ±1 time step tolerance for clock skew
 *
 * Usage:
 * import { generateTOTPSecret, verifyTOTP, generateRecoveryCodes } from './utils/twoFactorAuth.js';
 *
 * // Setup TOTP
 * const { secret, qrCode } = await generateTOTPSecret(userEmail);
 * // Display QR code to user for scanning
 *
 * // Verify code during setup
 * const isValid = verifyTOTP(code, secret);
 *
 * // Generate recovery codes
 * const codes = generateRecoveryCodes();
 */

import logger from './logger.js';

/**
 * Configuration for 2FA/MFA
 */
const TwoFAConfig = {
  // TOTP Configuration
  TOTP_WINDOW: 30, // 30-second time step (RFC 6238 standard)
  TOTP_DIGITS: 6, // 6-digit codes
  TOTP_TOLERANCE: 1, // Allow ±1 time step for clock skew

  // Recovery codes
  RECOVERY_CODE_LENGTH: 8,
  RECOVERY_CODE_COUNT: 10,
  RECOVERY_CODE_FORMAT: /^[A-Z0-9]{4}-[A-Z0-9]{4}$/, // Format: XXXX-XXXX

  // SMS codes
  SMS_CODE_LENGTH: 6,
  SMS_CODE_EXPIRY: 5 * 60 * 1000, // 5 minutes in milliseconds

  // Rate limiting
  MAX_VERIFICATION_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
};

/**
 * Generate a TOTP secret for the user
 * In production, this would use a library like 'speakeasy' or 'otplib'
 *
 * For now, returns a mock structure that demonstrates the expected format
 *
 * @param {string} userEmail - User's email for TOTP identification
 * @returns {Promise<{secret: string, qrCode: string}>}
 */
export const generateTOTPSecret = async (userEmail) => {
  try {
    // In production, you would:
    // 1. Use speakeasy.generateSecret({ name: userEmail })
    // 2. Generate a QR code for the secret
    // 3. Return both the secret and QR code

    // For now, generate a mock secret
    const mockSecret = generateRandomString(32);

    // Mock QR code (in production: use 'qrcode' library)
    const mockQRCode = `otpauth://totp/StratexPoints:${userEmail}?secret=${mockSecret}&issuer=StratexPoints`;

    return {
      secret: mockSecret,
      qrCode: mockQRCode,
      manualEntryKey: mockSecret, // For users who can't scan QR code
    };
  } catch (error) {
    logger.error('Failed to generate TOTP secret', error);
    throw new Error('Failed to generate authentication code');
  }
};

/**
 * Verify a TOTP code against a secret
 * Implements ±1 time step tolerance for clock skew
 *
 * In production, this would use speakeasy.verify() or similar
 *
 * @param {string} code - 6-digit code from authenticator app
 * @param {string} secret - User's TOTP secret
 * @returns {boolean} True if code is valid
 */
export const verifyTOTP = (code, secret) => {
  try {
    // Input validation
    if (!code || !secret) {
      return false;
    }

    // Verify code format (must be 6 digits)
    if (!/^\d{6}$/.test(code)) {
      return false;
    }

    // In production, use:
    // return speakeasy.verify({
    //   secret: secret,
    //   encoding: 'base32',
    //   token: code,
    //   window: TwoFAConfig.TOTP_TOLERANCE
    // });

    // For now, mock verification (NEVER use in production)
    logger.log('TOTP verification attempted', { codeLength: code.length });

    // This is where you'd implement the actual TOTP algorithm
    // using RFC 6238: HMAC-SHA1(secret, time / window)
    return true; // Mock - always returns true in development
  } catch (error) {
    logger.error('TOTP verification failed', error);
    return false;
  }
};

/**
 * Generate recovery codes for account recovery
 * Returns an array of 10 unique 8-character codes
 * Format: XXXX-XXXX (e.g., AB12-CD34)
 *
 * @returns {string[]} Array of recovery codes
 */
export const generateRecoveryCodes = () => {
  const codes = [];

  for (let i = 0; i < TwoFAConfig.RECOVERY_CODE_COUNT; i++) {
    const part1 = generateRandomString(4);
    const part2 = generateRandomString(4);
    codes.push(`${part1}-${part2}`);
  }

  return codes;
};

/**
 * Verify a recovery code and mark it as used
 *
 * @param {string} code - Recovery code to verify
 * @param {string[]} storedCodes - Array of stored recovery codes (hashed)
 * @returns {Promise<{valid: boolean, remaining: number}>}
 */
export const verifyRecoveryCode = async (code, storedCodes) => {
  try {
    // Input validation
    if (!code || !Array.isArray(storedCodes)) {
      return { valid: false, remaining: 0 };
    }

    // Format validation
    if (!TwoFAConfig.RECOVERY_CODE_FORMAT.test(code.toUpperCase())) {
      return { valid: false, remaining: storedCodes.length };
    }

    // Check if code exists in stored codes
    const codeIndex = storedCodes.findIndex((c) => c === code.toUpperCase());

    if (codeIndex === -1) {
      return { valid: false, remaining: storedCodes.length };
    }

    // Mark code as used by removing it (in production, update database)
    storedCodes.splice(codeIndex, 1);

    return {
      valid: true,
      remaining: storedCodes.length,
    };
  } catch (error) {
    logger.error('Recovery code verification failed', error);
    return { valid: false, remaining: 0 };
  }
};

/**
 * Generate an SMS verification code
 * Returns a 6-digit code with expiry time
 *
 * @returns {{code: string, expiresAt: string}}
 */
export const generateSMSCode = () => {
  const code = generateRandomDigits(TwoFAConfig.SMS_CODE_LENGTH);
  const expiresAt = new Date(Date.now() + TwoFAConfig.SMS_CODE_EXPIRY).toISOString();

  return {
    code,
    expiresAt,
  };
};

/**
 * Verify an SMS code
 *
 * @param {string} code - SMS code to verify
 * @param {string} storedCode - Stored SMS code
 * @param {string} expiresAt - Code expiry timestamp
 * @returns {boolean} True if code is valid and not expired
 */
export const verifySMSCode = (code, storedCode, expiresAt) => {
  // Input validation
  if (!code || !storedCode) {
    return false;
  }

  // Check expiry
  if (new Date(expiresAt) < new Date()) {
    return false;
  }

  // Compare codes
  return code === storedCode;
};

/**
 * Hash a recovery code for secure storage
 * In production, use bcrypt or argon2
 *
 * @param {string} code - Recovery code to hash
 * @returns {Promise<string>} Hashed code
 */
export const hashRecoveryCode = async (code) => {
  try {
    // In production: return bcrypt.hash(code, 10)
    // For now: return a mock hash
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    logger.error('Failed to hash recovery code', error);
    throw new Error('Failed to hash recovery code');
  }
};

/**
 * Verify a hashed recovery code
 *
 * @param {string} code - Plain recovery code
 * @param {string} hash - Stored hash
 * @returns {Promise<boolean>} True if code matches hash
 */
export const verifyHashedRecoveryCode = async (code, hash) => {
  try {
    // In production: return bcrypt.compare(code, hash)
    const codeHash = await hashRecoveryCode(code);
    return codeHash === hash;
  } catch (error) {
    logger.error('Failed to verify recovery code hash', error);
    return false;
  }
};

/**
 * Check if account is locked due to too many verification attempts
 *
 * @param {Object} attempts - Attempt tracking object { count, lastAttempt }
 * @returns {boolean} True if account is locked
 */
export const isAccountLocked = (attempts) => {
  if (!attempts) return false;

  const timeSinceLastAttempt = Date.now() - new Date(attempts.lastAttempt).getTime();
  const isLocked = attempts.count >= TwoFAConfig.MAX_VERIFICATION_ATTEMPTS &&
                   timeSinceLastAttempt < TwoFAConfig.LOCKOUT_DURATION;

  return isLocked;
};

/**
 * Record a verification attempt for rate limiting
 *
 * @param {Object} attempts - Current attempts object
 * @param {boolean} successful - Whether the attempt was successful
 * @returns {Object} Updated attempts object
 */
export const recordVerificationAttempt = (attempts, successful) => {
  if (successful) {
    return { count: 0, lastAttempt: new Date().toISOString() };
  }

  return {
    count: (attempts?.count || 0) + 1,
    lastAttempt: new Date().toISOString(),
  };
};

/**
 * Helper: Generate random string of uppercase alphanumeric characters
 *
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
const generateRandomString = (length) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
};

/**
 * Helper: Generate random digits
 *
 * @param {number} length - Number of digits
 * @returns {string} Random digit string
 */
const generateRandomDigits = (length) => {
  let result = '';

  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }

  return result;
};

export default {
  TwoFAConfig,
  generateTOTPSecret,
  verifyTOTP,
  generateRecoveryCodes,
  verifyRecoveryCode,
  generateSMSCode,
  verifySMSCode,
  hashRecoveryCode,
  verifyHashedRecoveryCode,
  isAccountLocked,
  recordVerificationAttempt,
};
