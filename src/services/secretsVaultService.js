/**
 * FASE 5.1: Secrets Vault Service
 * Secure storage, encryption, and management of API keys, credentials, certificates
 * Secrets versioning, access control, encryption at rest
 */

import logger from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Secrets Vault Configuration
 */
const SECRETS_CONFIG = {
  vaultEnabled: true,
  encryptionEnabled: true,
  encryptionAlgorithm: 'aes-256-cbc',
  masterKey: process.env.SECRETS_MASTER_KEY || 'change-me-in-production-with-env-var',
  accessControlEnabled: true,
  secretVersioningEnabled: true,
  auditLoggingEnabled: true,
};

/**
 * Secrets storage
 */
let secretsVault = new Map(); // secretName -> {value, encrypted, versions, metadata}
let secretAccessLogs = [];
let secretRotationSchedules = new Map(); // secretName -> {interval, lastRotation, nextRotation}
let secretAccessPolicies = new Map(); // secretName -> {allowedRoles, allowedUsers, accessLevel}

/**
 * Initialize Secrets Vault service
 */
export const initializeSecretsVault = (config = {}) => {
  try {
    Object.assign(SECRETS_CONFIG, config);

    // Setup default access policies
    setupDefaultAccessPolicies();

    // Start rotation scheduler
    startRotationScheduler();

    logger.info('[SecretsVault] Secrets Vault service initialized', {
      vaultEnabled: SECRETS_CONFIG.vaultEnabled,
      encryptionEnabled: SECRETS_CONFIG.encryptionEnabled,
      accessControlEnabled: SECRETS_CONFIG.accessControlEnabled,
    });

    return { success: true };
  } catch (err) {
    logger.error('[SecretsVault] Exception initializing Secrets Vault', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Setup default access policies
 */
const setupDefaultAccessPolicies = () => {
  try {
    const defaultPolicies = [
      {
        secretName: 'jwt-secret',
        allowedRoles: ['admin', 'api-gateway'],
        allowedUsers: [],
        accessLevel: 'restricted',
      },
      {
        secretName: 'db-password',
        allowedRoles: ['admin', 'database'],
        allowedUsers: [],
        accessLevel: 'restricted',
      },
      {
        secretName: 'oauth-client-secret',
        allowedRoles: ['admin', 'auth-service'],
        allowedUsers: [],
        accessLevel: 'restricted',
      },
      {
        secretName: 'api-key',
        allowedRoles: ['admin', 'api-service'],
        allowedUsers: [],
        accessLevel: 'standard',
      },
    ];

    for (const policy of defaultPolicies) {
      secretAccessPolicies.set(policy.secretName, policy);
    }

    logger.info('[SecretsVault] Default access policies configured', {
      policies: secretAccessPolicies.size,
    });
  } catch (err) {
    logger.error('[SecretsVault] Exception setting up access policies', {
      error: err.message,
    });
  }
};

/**
 * Store secret
 */
export const storeSecret = (secretName, secretValue, metadata = {}) => {
  try {
    if (!SECRETS_CONFIG.vaultEnabled) {
      return { success: false, error: 'Vault disabled' };
    }

    let encryptedValue = secretValue;
    if (SECRETS_CONFIG.encryptionEnabled) {
      encryptedValue = encryptSecret(secretValue);
    }

    const secret = {
      name: secretName,
      value: encryptedValue,
      encrypted: SECRETS_CONFIG.encryptionEnabled,
      createdAt: new Date(),
      updatedAt: new Date(),
      versions: [
        {
          version: 1,
          value: encryptedValue,
          createdAt: new Date(),
        },
      ],
      currentVersion: 1,
      metadata: {
        type: metadata.type || 'api-key',
        environment: metadata.environment || 'production',
        rotationRequired: metadata.rotationRequired || false,
        ...metadata,
      },
    };

    secretsVault.set(secretName, secret);

    logger.info('[SecretsVault] Secret stored', {
      secretName,
      encrypted: SECRETS_CONFIG.encryptionEnabled,
      metadata: secret.metadata,
    });

    return { success: true, secretId: `secret-${secretName}` };
  } catch (err) {
    logger.error('[SecretsVault] Exception storing secret', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Retrieve secret
 */
export const retrieveSecret = (secretName, userRole = 'admin', userId = null) => {
  try {
    if (!SECRETS_CONFIG.vaultEnabled) {
      return { success: false, error: 'Vault disabled' };
    }

    // Check access policy
    if (SECRETS_CONFIG.accessControlEnabled) {
      const accessCheck = checkSecretAccess(secretName, userRole, userId);
      if (!accessCheck.allowed) {
        logSecretAccess(secretName, userRole, userId, 'denied', accessCheck.reason);
        return { success: false, error: 'Access denied to secret' };
      }
    }

    const secret = secretsVault.get(secretName);
    if (!secret) {
      logSecretAccess(secretName, userRole, userId, 'failed', 'Secret not found');
      return { success: false, error: 'Secret not found' };
    }

    let decryptedValue = secret.value;
    if (secret.encrypted && SECRETS_CONFIG.encryptionEnabled) {
      decryptedValue = decryptSecret(secret.value);
    }

    logSecretAccess(secretName, userRole, userId, 'success', 'Secret retrieved');

    return {
      success: true,
      secretName,
      value: decryptedValue,
      version: secret.currentVersion,
      metadata: secret.metadata,
    };
  } catch (err) {
    logger.error('[SecretsVault] Exception retrieving secret', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Check secret access
 */
const checkSecretAccess = (secretName, userRole, userId) => {
  try {
    const policy = secretAccessPolicies.get(secretName);

    if (!policy) {
      return { allowed: false, reason: 'No access policy found' };
    }

    const roleAllowed = policy.allowedRoles.includes(userRole) || userRole === 'admin';
    const userAllowed = !policy.allowedUsers || policy.allowedUsers.length === 0 || policy.allowedUsers.includes(userId);

    if (roleAllowed && userAllowed) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Access denied. Role: ${userRole}, User: ${userId}`,
    };
  } catch (err) {
    return { allowed: false, reason: err.message };
  }
};

/**
 * Encrypt secret
 */
const encryptSecret = (secretValue) => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      SECRETS_CONFIG.encryptionAlgorithm,
      Buffer.from(SECRETS_CONFIG.masterKey.padEnd(32).slice(0, 32)),
      iv
    );

    let encrypted = cipher.update(secretValue, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    logger.error('[SecretsVault] Exception encrypting secret', {
      error: err.message,
    });
    throw err;
  }
};

/**
 * Decrypt secret
 */
const decryptSecret = (encryptedValue) => {
  try {
    const parts = encryptedValue.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(
      SECRETS_CONFIG.encryptionAlgorithm,
      Buffer.from(SECRETS_CONFIG.masterKey.padEnd(32).slice(0, 32)),
      iv
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    logger.error('[SecretsVault] Exception decrypting secret', {
      error: err.message,
    });
    throw err;
  }
};

/**
 * Log secret access
 */
const logSecretAccess = (secretName, userRole, userId, action, reason = '') => {
  try {
    const accessLog = {
      id: `access-${Date.now()}`,
      timestamp: new Date(),
      secretName,
      userRole,
      userId,
      action,
      reason,
    };

    secretAccessLogs.push(accessLog);

    logger.info('[SecretsVault] Secret access logged', {
      secretName,
      action,
      userRole,
    });
  } catch (err) {
    logger.error('[SecretsVault] Exception logging access', {
      error: err.message,
    });
  }
};

/**
 * Rotate secret
 */
export const rotateSecret = (secretName, newValue) => {
  try {
    const secret = secretsVault.get(secretName);
    if (!secret) {
      return { success: false, error: 'Secret not found' };
    }

    let encryptedValue = newValue;
    if (SECRETS_CONFIG.encryptionEnabled) {
      encryptedValue = encryptSecret(newValue);
    }

    const newVersion = secret.currentVersion + 1;
    secret.versions.push({
      version: newVersion,
      value: encryptedValue,
      createdAt: new Date(),
    });

    secret.currentVersion = newVersion;
    secret.updatedAt = new Date();

    // Update rotation schedule
    const schedule = secretRotationSchedules.get(secretName);
    if (schedule) {
      schedule.lastRotation = new Date();
      schedule.nextRotation = new Date(Date.now() + schedule.interval);
    }

    logger.info('[SecretsVault] Secret rotated', {
      secretName,
      newVersion,
    });

    return { success: true, version: newVersion };
  } catch (err) {
    logger.error('[SecretsVault] Exception rotating secret', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Schedule secret rotation
 */
export const scheduleSecretRotation = (secretName, intervalDays = 90) => {
  try {
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

    const schedule = {
      secretName,
      interval: intervalMs,
      intervalDays,
      lastRotation: new Date(),
      nextRotation: new Date(Date.now() + intervalMs),
      enabled: true,
    };

    secretRotationSchedules.set(secretName, schedule);

    logger.info('[SecretsVault] Secret rotation scheduled', {
      secretName,
      intervalDays,
    });

    return { success: true, schedule };
  } catch (err) {
    logger.error('[SecretsVault] Exception scheduling rotation', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Start rotation scheduler
 */
const startRotationScheduler = () => {
  setInterval(() => {
    try {
      const now = new Date();

      for (const [secretName, schedule] of secretRotationSchedules.entries()) {
        if (schedule.enabled && now >= schedule.nextRotation) {
          logger.warn('[SecretsVault] Secret rotation due', {
            secretName,
            lastRotation: schedule.lastRotation,
          });
        }
      }
    } catch (err) {
      logger.error('[SecretsVault] Exception in rotation scheduler', {
        error: err.message,
      });
    }
  }, 3600000); // Every hour
};

/**
 * Get vault status
 */
export const getVaultStatus = () => {
  try {
    const secretsCount = secretsVault.size;
    const rotationSchedulesCount = secretRotationSchedules.size;
    const last24HourAccess = secretAccessLogs.filter(
      (log) => new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    return {
      success: true,
      vaultEnabled: SECRETS_CONFIG.vaultEnabled,
      encryptionEnabled: SECRETS_CONFIG.encryptionEnabled,
      secretsStored: secretsCount,
      rotationSchedules: rotationSchedulesCount,
      accessLogsCount: secretAccessLogs.length,
      last24HourAccess: last24HourAccess.length,
      accessPolicies: secretAccessPolicies.size,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[SecretsVault] Exception getting vault status', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get secret versions
 */
export const getSecretVersions = (secretName) => {
  try {
    const secret = secretsVault.get(secretName);
    if (!secret) {
      return { success: false, error: 'Secret not found' };
    }

    return {
      success: true,
      secretName,
      currentVersion: secret.currentVersion,
      versions: secret.versions.map((v) => ({
        version: v.version,
        createdAt: v.createdAt.toISOString(),
      })),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[SecretsVault] Exception getting secret versions', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get access logs
 */
export const getAccessLogs = (secretName = null, limit = 100) => {
  try {
    let logs = secretAccessLogs;

    if (secretName) {
      logs = logs.filter((log) => log.secretName === secretName);
    }

    return {
      success: true,
      logs: logs.slice(-limit).reverse(),
      totalLogs: logs.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[SecretsVault] Exception getting access logs', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

export default {
  initializeSecretsVault,
  storeSecret,
  retrieveSecret,
  rotateSecret,
  scheduleSecretRotation,
  getVaultStatus,
  getSecretVersions,
  getAccessLogs,
};
