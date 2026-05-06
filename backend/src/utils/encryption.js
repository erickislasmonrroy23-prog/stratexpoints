/**
 * Encryption/Decryption Utility
 * FASE 6: AES-256-GCM encryption for secrets
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(
  process.env.ENCRYPTION_MASTER_KEY ||
  '0000000000000000000000000000000000000000000000000000000000000000',
  'hex'
);

if (ENCRYPTION_KEY.length !== 32) {
  console.warn('⚠️ Warning: ENCRYPTION_KEY must be 256 bits (32 bytes). Padding with zeros.');
}

/**
 * Encrypt a secret value
 * @param {string} plaintext - The secret to encrypt
 * @returns {{encryptedData: string, iv: string, authTag: string}} Encrypted secret and metadata
 */
export function encryptSecret(plaintext) {
  try {
    // Generate random IV (initialization vector)
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag for GCM
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error('Failed to encrypt secret');
  }
}

/**
 * Decrypt a secret value
 * @param {string} encryptedData - The encrypted secret
 * @param {string} iv - Initialization vector (hex)
 * @param {string} authTag - Authentication tag (hex)
 * @returns {string} Decrypted plaintext
 */
export function decryptSecret(encryptedData, iv, authTag) {
  try {
    // Convert IV and authTag from hex to Buffer
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, ivBuffer);
    decipher.setAuthTag(authTagBuffer);

    // Decrypt
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error('Failed to decrypt secret - authentication failed or corrupted data');
  }
}

/**
 * Hash a password using bcrypt (can also use crypto.pbkdf2 for deterministic)
 * @param {string} plaintext - The plaintext to hash
 * @returns {string} SHA256 hash (hex)
 */
export function hashKey(plaintext) {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

/**
 * Verify a plaintext against a hash
 * @param {string} plaintext - The plaintext to verify
 * @param {string} hash - The hash to compare against
 * @returns {boolean} True if plaintext matches hash
 */
export function verifyHash(plaintext, hash) {
  return hashKey(plaintext) === hash;
}

/**
 * Generate a random token
 * @param {number} length - Token length in bytes
 * @returns {string} Random token (hex)
 */
export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a deterministic hash for JWT token blacklisting
 * @param {string} token - JWT token
 * @returns {string} Token hash
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a signature for data integrity
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} HMAC signature (hex)
 */
export function createSignature(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify a signature
 * @param {string} data - Original data
 * @param {string} signature - Signature to verify
 * @param {string} secret - Secret key
 * @returns {boolean} True if signature is valid
 */
export function verifySignature(data, signature, secret) {
  const computedSignature = createSignature(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(computedSignature, 'hex')
  );
}

export default {
  encryptSecret,
  decryptSecret,
  hashKey,
  verifyHash,
  generateToken,
  hashToken,
  createSignature,
  verifySignature,
};
