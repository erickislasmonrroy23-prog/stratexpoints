/**
 * FASE 5.2: Key Rotation Service
 * Automated key rotation schedules, retirement, version management
 * Certificate rotation tracking, key lifecycle management
 */

import logger from '../utils/logger.js';

/**
 * Key Rotation Configuration
 */
const ROTATION_CONFIG = {
  rotationEnabled: true,
  jwtKeyRotationDays: 30,
  apiKeyRotationDays: 90,
  dbPasswordRotationDays: 60,
  certificateRotationDays: 365, // 1 year before expiry
  gracePeriodDays: 7, // Time to update clients after rotation
  autoRetirementEnabled: true,
  notificationEnabled: true,
};

/**
 * Key rotation storage
 */
let rotationSchedules = new Map(); // keyId -> rotation schedule
let keyVersions = new Map(); // keyId -> [versions with timestamps]
let rotationHistory = [];
let pendingRotations = []; // Keys that need rotation soon
let retiredKeys = [];

/**
 * Initialize Key Rotation service
 */
export const initializeKeyRotation = (config = {}) => {
  try {
    Object.assign(ROTATION_CONFIG, config);

    // Setup default rotation schedules
    setupDefaultRotationSchedules();

    // Start rotation monitor
    startRotationMonitor();

    logger.info('[KeyRotation] Key Rotation service initialized', {
      rotationEnabled: ROTATION_CONFIG.rotationEnabled,
      autoRetirementEnabled: ROTATION_CONFIG.autoRetirementEnabled,
    });

    return { success: true };
  } catch (err) {
    logger.error('[KeyRotation] Exception initializing Key Rotation', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Setup default rotation schedules
 */
const setupDefaultRotationSchedules = () => {
  try {
    const schedules = [
      {
        keyId: 'jwt-signing-key',
        keyType: 'jwt',
        rotationIntervalDays: ROTATION_CONFIG.jwtKeyRotationDays,
        lastRotation: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
        nextRotation: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        status: 'active',
      },
      {
        keyId: 'api-gateway-key',
        keyType: 'api',
        rotationIntervalDays: ROTATION_CONFIG.apiKeyRotationDays,
        lastRotation: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000), // 80 days ago
        nextRotation: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        status: 'active',
      },
      {
        keyId: 'db-connection-key',
        keyType: 'database',
        rotationIntervalDays: ROTATION_CONFIG.dbPasswordRotationDays,
        lastRotation: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000), // 50 days ago
        nextRotation: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        status: 'active',
      },
      {
        keyId: 'tls-certificate',
        keyType: 'certificate',
        rotationIntervalDays: ROTATION_CONFIG.certificateRotationDays,
        lastRotation: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000), // 300 days ago
        nextRotation: new Date(Date.now() + 65 * 24 * 60 * 60 * 1000), // 65 days from now
        status: 'active',
      },
    ];

    for (const schedule of schedules) {
      rotationSchedules.set(schedule.keyId, schedule);
      keyVersions.set(schedule.keyId, [
        {
          version: 1,
          createdAt: schedule.lastRotation,
          retired: false,
        },
      ]);
    }

    logger.info('[KeyRotation] Default rotation schedules configured', {
      schedules: rotationSchedules.size,
    });
  } catch (err) {
    logger.error('[KeyRotation] Exception setting up schedules', {
      error: err.message,
    });
  }
};

/**
 * Start rotation monitor
 */
const startRotationMonitor = () => {
  setInterval(() => {
    try {
      const now = new Date();

      for (const [keyId, schedule] of rotationSchedules.entries()) {
        if (schedule.status === 'active') {
          const daysUntilRotation = (schedule.nextRotation - now) / (1000 * 60 * 60 * 24);

          // Check if rotation is due soon (within grace period)
          if (daysUntilRotation <= ROTATION_CONFIG.gracePeriodDays && daysUntilRotation > 0) {
            if (!pendingRotations.includes(keyId)) {
              pendingRotations.push(keyId);
              logger.warn('[KeyRotation] Key rotation due soon', {
                keyId,
                daysUntilRotation: daysUntilRotation.toFixed(1),
              });
            }
          }

          // Check if rotation is overdue
          if (daysUntilRotation <= 0) {
            logger.error('[KeyRotation] Key rotation OVERDUE', {
              keyId,
              overdueBy: Math.abs(daysUntilRotation).toFixed(1),
            });
          }
        }
      }
    } catch (err) {
      logger.error('[KeyRotation] Exception in rotation monitor', {
        error: err.message,
      });
    }
  }, 3600000); // Every hour
};

/**
 * Perform key rotation
 */
export const performKeyRotation = (keyId, newKeyValue) => {
  try {
    const schedule = rotationSchedules.get(keyId);
    if (!schedule) {
      return { success: false, error: 'Key schedule not found' };
    }

    const versions = keyVersions.get(keyId);
    const newVersion = versions[versions.length - 1].version + 1;

    // Add new version
    versions.push({
      version: newVersion,
      value: newKeyValue,
      createdAt: new Date(),
      retired: false,
    });

    // Update schedule
    schedule.lastRotation = new Date();
    schedule.nextRotation = new Date(
      Date.now() + schedule.rotationIntervalDays * 24 * 60 * 60 * 1000
    );

    // Log rotation
    const rotationEvent = {
      id: `rotation-${Date.now()}`,
      timestamp: new Date(),
      keyId,
      keyType: schedule.keyType,
      oldVersion: newVersion - 1,
      newVersion,
      nextRotation: schedule.nextRotation,
      status: 'completed',
    };

    rotationHistory.push(rotationEvent);

    // Remove from pending if present
    const pendingIndex = pendingRotations.indexOf(keyId);
    if (pendingIndex > -1) {
      pendingRotations.splice(pendingIndex, 1);
    }

    logger.info('[KeyRotation] Key rotated successfully', {
      keyId,
      newVersion,
      nextRotation: schedule.nextRotation.toISOString(),
    });

    return {
      success: true,
      keyId,
      version: newVersion,
      nextRotation: schedule.nextRotation,
    };
  } catch (err) {
    logger.error('[KeyRotation] Exception performing rotation', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Retire old key version
 */
export const retireKeyVersion = (keyId, version) => {
  try {
    const versions = keyVersions.get(keyId);
    if (!versions) {
      return { success: false, error: 'Key not found' };
    }

    const versionObj = versions.find((v) => v.version === version);
    if (!versionObj) {
      return { success: false, error: 'Version not found' };
    }

    versionObj.retired = true;
    versionObj.retiredAt = new Date();

    const retirementEvent = {
      id: `retirement-${Date.now()}`,
      timestamp: new Date(),
      keyId,
      version,
      reason: 'Automated retirement',
    };

    retiredKeys.push(retirementEvent);

    logger.info('[KeyRotation] Key version retired', {
      keyId,
      version,
    });

    return { success: true };
  } catch (err) {
    logger.error('[KeyRotation] Exception retiring key', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get rotation status
 */
export const getRotationStatus = () => {
  try {
    const now = new Date();
    const scheduleArray = Array.from(rotationSchedules.values());

    const rotationStatus = scheduleArray.map((schedule) => {
      const daysUntilRotation = (schedule.nextRotation - now) / (1000 * 60 * 60 * 24);
      return {
        keyId: schedule.keyId,
        keyType: schedule.keyType,
        status: schedule.status,
        daysUntilRotation: daysUntilRotation.toFixed(1),
        lastRotation: schedule.lastRotation.toISOString(),
        nextRotation: schedule.nextRotation.toISOString(),
        requiresAttention: daysUntilRotation <= ROTATION_CONFIG.gracePeriodDays,
      };
    });

    return {
      success: true,
      keysManaged: rotationSchedules.size,
      pendingRotations: pendingRotations.length,
      overdue: rotationStatus.filter((s) => parseFloat(s.daysUntilRotation) < 0).length,
      dueWithinGracePeriod: rotationStatus.filter((s) => parseFloat(s.daysUntilRotation) <= ROTATION_CONFIG.gracePeriodDays && parseFloat(s.daysUntilRotation) > 0).length,
      rotations: rotationStatus,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[KeyRotation] Exception getting rotation status', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get rotation history
 */
export const getRotationHistory = (keyId = null, limit = 100) => {
  try {
    let history = rotationHistory;

    if (keyId) {
      history = history.filter((h) => h.keyId === keyId);
    }

    return {
      success: true,
      history: history.slice(-limit).reverse(),
      totalRotations: history.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[KeyRotation] Exception getting rotation history', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get pending rotations
 */
export const getPendingRotations = () => {
  try {
    const pending = Array.from(rotationSchedules.entries())
      .filter(([keyId]) => pendingRotations.includes(keyId))
      .map(([keyId, schedule]) => ({
        keyId,
        keyType: schedule.keyType,
        daysUntilRotation: (
          (schedule.nextRotation - new Date()) /
          (1000 * 60 * 60 * 24)
        ).toFixed(1),
        nextRotation: schedule.nextRotation.toISOString(),
      }));

    return {
      success: true,
      pendingCount: pending.length,
      pending,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[KeyRotation] Exception getting pending rotations', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

export default {
  initializeKeyRotation,
  performKeyRotation,
  retireKeyVersion,
  getRotationStatus,
  getRotationHistory,
  getPendingRotations,
};
