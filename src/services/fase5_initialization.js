/**
 * FASE 5: Secrets Management - Service Initialization & Orchestration
 * Initializes all Phase 5 secrets management services
 * Coordinates secrets vault, key rotation, and secrets lifecycle management
 */

import logger from '../utils/logger.js';
import * as secretsVault from './secretsVaultService.js';
import * as keyRotation from './keyRotationService.js';
import * as secretsLifecycle from './secretsLifecycleService.js';

/**
 * FASE 5 Configuration
 */
const FASE5_CONFIG = {
  phase: 'FASE 5',
  name: 'Secrets Management',
  version: '1.0.0',
  status: 'initializing',
  initializationDate: new Date(),
  services: {
    secretsVault: {
      enabled: true,
      name: 'Secrets Vault & Encryption',
      critical: true,
    },
    keyRotation: {
      enabled: true,
      name: 'Key Rotation & Version Management',
      critical: true,
    },
    secretsLifecycle: {
      enabled: true,
      name: 'Secrets Lifecycle Management',
      critical: true,
    },
  },
  initializationResults: {},
};

/**
 * Initialize FASE 5 - All Secrets Management Services
 */
export const initializeFASE5 = async (config = {}) => {
  try {
    const startTime = Date.now();
    logger.info('[FASE5] Starting Secrets Management initialization', {
      phase: FASE5_CONFIG.phase,
      services: Object.keys(FASE5_CONFIG.services).length,
    });

    // Merge configurations
    const mergedConfig = {
      secretsVault: config.secretsVault || {},
      keyRotation: config.keyRotation || {},
      secretsLifecycle: config.secretsLifecycle || {},
    };

    // Initialize each service
    const initResults = {};

    // 1. Secrets Vault Service
    if (FASE5_CONFIG.services.secretsVault.enabled) {
      logger.info('[FASE5] Initializing Secrets Vault Service...');
      const vaultResult = secretsVault.initializeSecretsVault(mergedConfig.secretsVault);
      initResults.secretsVault = vaultResult;
      FASE5_CONFIG.initializationResults.secretsVault = vaultResult.success ? 'OK' : 'FAILED';
    }

    // 2. Key Rotation Service
    if (FASE5_CONFIG.services.keyRotation.enabled) {
      logger.info('[FASE5] Initializing Key Rotation Service...');
      const rotationResult = keyRotation.initializeKeyRotation(mergedConfig.keyRotation);
      initResults.keyRotation = rotationResult;
      FASE5_CONFIG.initializationResults.keyRotation = rotationResult.success ? 'OK' : 'FAILED';
    }

    // 3. Secrets Lifecycle Service
    if (FASE5_CONFIG.services.secretsLifecycle.enabled) {
      logger.info('[FASE5] Initializing Secrets Lifecycle Service...');
      const lifecycleResult = secretsLifecycle.initializeSecretsLifecycle(
        mergedConfig.secretsLifecycle
      );
      initResults.secretsLifecycle = lifecycleResult;
      FASE5_CONFIG.initializationResults.secretsLifecycle = lifecycleResult.success
        ? 'OK'
        : 'FAILED';
    }

    const duration = Date.now() - startTime;
    const successCount = Object.values(FASE5_CONFIG.initializationResults).filter(
      (r) => r === 'OK'
    ).length;
    const totalServices = Object.keys(FASE5_CONFIG.services).filter(
      (s) => FASE5_CONFIG.services[s].enabled
    ).length;

    FASE5_CONFIG.status = 'initialized';
    FASE5_CONFIG.completionTime = new Date();
    FASE5_CONFIG.initializationDuration = `${(duration / 1000).toFixed(2)}s`;

    logger.info('[FASE5] Secrets Management initialization completed', {
      phase: FASE5_CONFIG.phase,
      successCount,
      totalServices,
      duration: `${duration}ms`,
      status: FASE5_CONFIG.status,
    });

    return {
      success: successCount === totalServices,
      phase: FASE5_CONFIG.phase,
      status: FASE5_CONFIG.status,
      servicesInitialized: successCount,
      totalServices,
      duration: `${(duration / 1000).toFixed(2)}s`,
      results: FASE5_CONFIG.initializationResults,
      detailedResults: initResults,
    };
  } catch (err) {
    logger.error('[FASE5] Critical error during initialization', {
      error: err.message,
      stack: err.stack,
    });
    FASE5_CONFIG.status = 'failed';
    return {
      success: false,
      error: err.message,
      status: FASE5_CONFIG.status,
    };
  }
};

/**
 * Get FASE 5 Status
 */
export const getFASE5Status = () => {
  try {
    const serviceStatuses = {};

    // Get status from each service
    if (FASE5_CONFIG.services.secretsVault.enabled) {
      serviceStatuses.secretsVault = secretsVault.getVaultStatus();
    }

    if (FASE5_CONFIG.services.keyRotation.enabled) {
      serviceStatuses.keyRotation = keyRotation.getRotationStatus();
    }

    if (FASE5_CONFIG.services.secretsLifecycle.enabled) {
      serviceStatuses.secretsLifecycle = secretsLifecycle.getLifecycleStatus();
    }

    return {
      success: true,
      phase: FASE5_CONFIG.phase,
      status: FASE5_CONFIG.status,
      initializationDate: FASE5_CONFIG.initializationDate.toISOString(),
      completionTime: FASE5_CONFIG.completionTime?.toISOString() || null,
      initializationDuration: FASE5_CONFIG.initializationDuration,
      services: FASE5_CONFIG.services,
      initializationResults: FASE5_CONFIG.initializationResults,
      serviceStatuses,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[FASE5] Exception getting status', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Health check for all FASE 5 services
 */
export const healthCheckFASE5 = async () => {
  try {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      overallStatus: 'healthy',
      services: {},
    };

    // Check each service health
    healthStatus.services.secretsVault = {
      enabled: FASE5_CONFIG.services.secretsVault.enabled,
      status:
        FASE5_CONFIG.initializationResults.secretsVault === 'OK' ? 'healthy' : 'unhealthy',
    };

    healthStatus.services.keyRotation = {
      enabled: FASE5_CONFIG.services.keyRotation.enabled,
      status:
        FASE5_CONFIG.initializationResults.keyRotation === 'OK' ? 'healthy' : 'unhealthy',
    };

    healthStatus.services.secretsLifecycle = {
      enabled: FASE5_CONFIG.services.secretsLifecycle.enabled,
      status:
        FASE5_CONFIG.initializationResults.secretsLifecycle === 'OK' ? 'healthy' : 'unhealthy',
    };

    // Calculate overall health
    const unhealthyServices = Object.values(healthStatus.services).filter(
      (s) => s.status === 'unhealthy'
    ).length;

    if (unhealthyServices > 0) {
      healthStatus.overallStatus = unhealthyServices >= 2 ? 'critical' : 'degraded';
    }

    logger.info('[FASE5] Health check completed', {
      overallStatus: healthStatus.overallStatus,
      unhealthyServices,
    });

    return { success: true, ...healthStatus };
  } catch (err) {
    logger.error('[FASE5] Exception during health check', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get FASE 5 Configuration
 */
export const getFASE5Config = () => {
  return {
    success: true,
    config: FASE5_CONFIG,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Export all FASE 5 services
 */
export const getFASE5Services = () => {
  return {
    success: true,
    services: {
      secretsVault,
      keyRotation,
      secretsLifecycle,
    },
    count: 3,
    timestamp: new Date().toISOString(),
  };
};

export default {
  initializeFASE5,
  getFASE5Status,
  healthCheckFASE5,
  getFASE5Config,
  getFASE5Services,
};
