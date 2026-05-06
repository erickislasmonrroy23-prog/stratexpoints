/**
 * FASE 5.3: Secrets Lifecycle Management Service
 * Secrets provisioning, deprovisioning, emergency revocation
 * Lifecycle monitoring, alerts, automated actions
 */

import logger from '../utils/logger.js';

/**
 * Secrets Lifecycle Configuration
 */
const LIFECYCLE_CONFIG = {
  lifecycleEnabled: true,
  autoDeprovisionEnabled: true,
  emergencyRevocationEnabled: true,
  provisioningRetryAttempts: 3,
  deprovisioningTimeout: 3600000, // 1 hour
  lifecycleCheckInterval: 1800000, // 30 minutes
  alertingEnabled: true,
};

/**
 * Lifecycle storage
 */
let secretsLifecycle = new Map(); // secretId -> lifecycle metadata
let provisioningRequests = []; // Pending provisioning
let deprovisioningRequests = []; // Pending deprovisioning
let lifecycleAlerts = [];
let revokedSecrets = [];

/**
 * Initialize Secrets Lifecycle service
 */
export const initializeSecretsLifecycle = (config = {}) => {
  try {
    Object.assign(LIFECYCLE_CONFIG, config);

    // Start lifecycle monitor
    startLifecycleMonitor();

    logger.info('[SecretsLifecycle] Secrets Lifecycle service initialized', {
      lifecycleEnabled: LIFECYCLE_CONFIG.lifecycleEnabled,
      autoDeprovisionEnabled: LIFECYCLE_CONFIG.autoDeprovisionEnabled,
      emergencyRevocationEnabled: LIFECYCLE_CONFIG.emergencyRevocationEnabled,
    });

    return { success: true };
  } catch (err) {
    logger.error('[SecretsLifecycle] Exception initializing Lifecycle service', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Provision secret
 */
export const provisionSecret = (secretMetadata) => {
  try {
    const provisioning = {
      id: `provision-${Date.now()}`,
      timestamp: new Date(),
      secretId: secretMetadata.secretId,
      secretName: secretMetadata.secretName,
      secretType: secretMetadata.type,
      requestedBy: secretMetadata.requestedBy,
      status: 'pending',
      retryCount: 0,
      maxRetries: LIFECYCLE_CONFIG.provisioningRetryAttempts,
      metadata: secretMetadata,
    };

    provisioningRequests.push(provisioning);

    logger.info('[SecretsLifecycle] Secret provisioning requested', {
      secretId: secretMetadata.secretId,
      type: secretMetadata.type,
      requestedBy: secretMetadata.requestedBy,
    });

    return {
      success: true,
      provisioningId: provisioning.id,
      status: 'requested',
    };
  } catch (err) {
    logger.error('[SecretsLifecycle] Exception provisioning secret', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Complete provisioning
 */
export const completeProvisioning = (provisioningId, secretValue) => {
  try {
    const provisioningIndex = provisioningRequests.findIndex((p) => p.id === provisioningId);
    if (provisioningIndex === -1) {
      return { success: false, error: 'Provisioning request not found' };
    }

    const provisioning = provisioningRequests[provisioningIndex];

    const lifecycle = {
      secretId: provisioning.secretId,
      secretName: provisioning.secretName,
      type: provisioning.secretType,
      status: 'active',
      provisioned: true,
      provisionedAt: new Date(),
      provisionedBy: provisioning.requestedBy,
      lastAccessedAt: null,
      accessCount: 0,
      rotation: {
        enabled: false,
        interval: null,
        lastRotation: null,
        nextRotation: null,
      },
      expiration: {
        enabled: false,
        expiresAt: null,
        autoRevoke: false,
      },
    };

    secretsLifecycle.set(provisioning.secretId, lifecycle);

    // Remove from pending
    provisioningRequests.splice(provisioningIndex, 1);

    logger.info('[SecretsLifecycle] Secret provisioning completed', {
      secretId: provisioning.secretId,
      type: provisioning.secretType,
    });

    return {
      success: true,
      secretId: provisioning.secretId,
      status: 'active',
    };
  } catch (err) {
    logger.error('[SecretsLifecycle] Exception completing provisioning', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Request deprovisioning
 */
export const requestDeprovisioning = (secretId, reason = '') => {
  try {
    const lifecycle = secretsLifecycle.get(secretId);
    if (!lifecycle) {
      return { success: false, error: 'Secret lifecycle not found' };
    }

    const deprovisioning = {
      id: `deprovision-${Date.now()}`,
      timestamp: new Date(),
      secretId,
      reason,
      status: 'pending',
      gracePeriodEnds: new Date(Date.now() + LIFECYCLE_CONFIG.deprovisioningTimeout),
    };

    deprovisioningRequests.push(deprovisioning);
    lifecycle.status = 'deprovisioning';

    logger.info('[SecretsLifecycle] Secret deprovisioning requested', {
      secretId,
      reason,
      gracePeriodHours: (LIFECYCLE_CONFIG.deprovisioningTimeout / (1000 * 60 * 60)).toFixed(1),
    });

    return {
      success: true,
      deprovisioningId: deprovisioning.id,
      gracePeriodEnds: deprovisioning.gracePeriodEnds,
    };
  } catch (err) {
    logger.error('[SecretsLifecycle] Exception requesting deprovisioning', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Complete deprovisioning
 */
export const completeDeprovisioning = (deprovisioningId) => {
  try {
    const deprovisioningIndex = deprovisioningRequests.findIndex((d) => d.id === deprovisioningId);
    if (deprovisioningIndex === -1) {
      return { success: false, error: 'Deprovisioning request not found' };
    }

    const deprovisioning = deprovisioningRequests[deprovisioningIndex];
    const lifecycle = secretsLifecycle.get(deprovisioning.secretId);

    if (lifecycle) {
      lifecycle.status = 'deprovisioned';
      lifecycle.deprovisionedAt = new Date();
    }

    deprovisioningRequests.splice(deprovisioningIndex, 1);

    logger.info('[SecretsLifecycle] Secret deprovisioning completed', {
      secretId: deprovisioning.secretId,
    });

    return {
      success: true,
      secretId: deprovisioning.secretId,
      status: 'deprovisioned',
    };
  } catch (err) {
    logger.error('[SecretsLifecycle] Exception completing deprovisioning', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Emergency revocation
 */
export const emergencyRevocation = (secretId, reason = 'Emergency revocation') => {
  try {
    const lifecycle = secretsLifecycle.get(secretId);
    if (!lifecycle) {
      return { success: false, error: 'Secret lifecycle not found' };
    }

    const revocation = {
      id: `revoke-${Date.now()}`,
      timestamp: new Date(),
      secretId,
      reason,
      revokedAt: new Date(),
      status: 'revoked',
    };

    revokedSecrets.push(revocation);
    lifecycle.status = 'revoked';
    lifecycle.revokedAt = new Date();
    lifecycle.revokeReason = reason;

    // Alert immediately
    createAlert(secretId, 'critical', `Secret revoked: ${reason}`);

    logger.error('[SecretsLifecycle] Secret EMERGENCY REVOKED', {
      secretId,
      reason,
    });

    return {
      success: true,
      revocationId: revocation.id,
      status: 'revoked',
    };
  } catch (err) {
    logger.error('[SecretsLifecycle] Exception in emergency revocation', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Create alert
 */
const createAlert = (secretId, severity, message) => {
  try {
    const alert = {
      id: `alert-${Date.now()}`,
      timestamp: new Date(),
      secretId,
      severity, // critical, high, medium, low
      message,
    };

    lifecycleAlerts.push(alert);

    logger.warn('[SecretsLifecycle] Lifecycle alert created', {
      secretId,
      severity,
      message,
    });
  } catch (err) {
    logger.error('[SecretsLifecycle] Exception creating alert', {
      error: err.message,
    });
  }
};

/**
 * Start lifecycle monitor
 */
const startLifecycleMonitor = () => {
  setInterval(() => {
    try {
      const now = new Date();

      // Check deprovisioning timeouts
      for (let i = deprovisioningRequests.length - 1; i >= 0; i--) {
        const deprovisioning = deprovisioningRequests[i];
        if (deprovisioning.status === 'pending' && now >= deprovisioning.gracePeriodEnds) {
          completeDeprovisioning(deprovisioning.id);
          createAlert(deprovisioning.secretId, 'high', 'Deprovisioning grace period expired');
        }
      }

      // Check lifecycle status
      for (const [secretId, lifecycle] of secretsLifecycle.entries()) {
        if (lifecycle.status === 'active' && !lifecycle.lastAccessedAt) {
          // Check for stale secrets (not accessed for 30 days)
          const createdDaysAgo = (now - lifecycle.provisionedAt) / (1000 * 60 * 60 * 24);
          if (createdDaysAgo > 30) {
            createAlert(secretId, 'medium', 'Secret not accessed for 30 days');
          }
        }

        // Check expiration
        if (lifecycle.expiration.enabled && lifecycle.expiration.expiresAt) {
          const daysUntilExpiry = (lifecycle.expiration.expiresAt - now) / (1000 * 60 * 60 * 24);
          if (daysUntilExpiry < 0 && lifecycle.expiration.autoRevoke) {
            emergencyRevocation(secretId, 'Automatic revocation on expiration');
          }
        }
      }
    } catch (err) {
      logger.error('[SecretsLifecycle] Exception in lifecycle monitor', {
        error: err.message,
      });
    }
  }, LIFECYCLE_CONFIG.lifecycleCheckInterval);
};

/**
 * Get lifecycle status
 */
export const getLifecycleStatus = () => {
  try {
    const active = Array.from(secretsLifecycle.values()).filter((l) => l.status === 'active').length;
    const deprovisioning = Array.from(secretsLifecycle.values()).filter(
      (l) => l.status === 'deprovisioning'
    ).length;
    const revoked = Array.from(secretsLifecycle.values()).filter((l) => l.status === 'revoked')
      .length;

    const last24HourAlerts = lifecycleAlerts.filter(
      (a) => new Date(a.timestamp) > new Date(now - 24 * 60 * 60 * 1000)
    );

    const now = new Date();

    return {
      success: true,
      secretsCount: secretsLifecycle.size,
      active,
      deprovisioning,
      revoked,
      pendingProvisioning: provisioningRequests.length,
      pendingDeprovisioning: deprovisioningRequests.length,
      alertsLast24Hours: last24HourAlerts.length,
      revokedSecretsTotal: revokedSecrets.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[SecretsLifecycle] Exception getting lifecycle status', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get alerts
 */
export const getAlerts = (severity = null, limit = 100) => {
  try {
    let alerts = lifecycleAlerts;

    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity);
    }

    return {
      success: true,
      alerts: alerts.slice(-limit).reverse(),
      totalAlerts: lifecycleAlerts.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[SecretsLifecycle] Exception getting alerts', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Record secret access
 */
export const recordSecretAccess = (secretId) => {
  try {
    const lifecycle = secretsLifecycle.get(secretId);
    if (lifecycle) {
      lifecycle.lastAccessedAt = new Date();
      lifecycle.accessCount++;
    }
    return { success: true };
  } catch (err) {
    logger.error('[SecretsLifecycle] Exception recording access', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

export default {
  initializeSecretsLifecycle,
  provisionSecret,
  completeProvisioning,
  requestDeprovisioning,
  completeDeprovisioning,
  emergencyRevocation,
  getLifecycleStatus,
  getAlerts,
  recordSecretAccess,
};
