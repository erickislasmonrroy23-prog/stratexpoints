/**
 * FASE 4: API Security & Advanced Threat Detection - Service Initialization & Orchestration
 * Initializes all Phase 4 security services
 * Coordinates API gateway rate limiting, threat detection, API security, and compliance auditing
 */

import logger from '../utils/logger.js';
import * as apiGateway from './apiGatewayService.js';
import * as threatDetection from './advancedThreatDetectionService.js';
import * as apiSecurity from './apiSecurityService.js';
import * as compliance from './complianceAuditingService.js';

/**
 * FASE 4 Configuration
 */
const FASE4_CONFIG = {
  phase: 'FASE 4',
  name: 'API Security & Advanced Threat Detection',
  version: '1.0.0',
  status: 'initializing',
  initializationDate: new Date(),
  services: {
    apiGateway: {
      enabled: true,
      name: 'API Gateway & Rate Limiting',
      critical: true,
    },
    threatDetection: {
      enabled: true,
      name: 'Advanced Threat Detection',
      critical: true,
    },
    apiSecurity: {
      enabled: true,
      name: 'API Security & Versioning',
      critical: true,
    },
    compliance: {
      enabled: true,
      name: 'Compliance & Auditing',
      critical: true,
    },
  },
  initializationResults: {},
};

/**
 * Initialize FASE 4 - All Security Services
 */
export const initializeFASE4 = async (config = {}) => {
  try {
    const startTime = Date.now();
    logger.info('[FASE4] Starting API Security & Threat Detection initialization', {
      phase: FASE4_CONFIG.phase,
      services: Object.keys(FASE4_CONFIG.services).length,
    });

    // Merge configurations
    const mergedConfig = {
      apiGateway: config.apiGateway || {},
      threatDetection: config.threatDetection || {},
      apiSecurity: config.apiSecurity || {},
      compliance: config.compliance || {},
    };

    // Initialize each service
    const initResults = {};

    // 1. API Gateway & Rate Limiting Service
    if (FASE4_CONFIG.services.apiGateway.enabled) {
      logger.info('[FASE4] Initializing API Gateway Service...');
      const gatewayResult = apiGateway.initializeAPIGateway(mergedConfig.apiGateway);
      initResults.apiGateway = gatewayResult;
      FASE4_CONFIG.initializationResults.apiGateway = gatewayResult.success ? 'OK' : 'FAILED';
    }

    // 2. Advanced Threat Detection Service
    if (FASE4_CONFIG.services.threatDetection.enabled) {
      logger.info('[FASE4] Initializing Advanced Threat Detection Service...');
      const threatResult = threatDetection.initializeAdvancedThreatDetection(
        mergedConfig.threatDetection
      );
      initResults.threatDetection = threatResult;
      FASE4_CONFIG.initializationResults.threatDetection = threatResult.success ? 'OK' : 'FAILED';
    }

    // 3. API Security Service
    if (FASE4_CONFIG.services.apiSecurity.enabled) {
      logger.info('[FASE4] Initializing API Security Service...');
      const securityResult = apiSecurity.initializeAPISecurity(mergedConfig.apiSecurity);
      initResults.apiSecurity = securityResult;
      FASE4_CONFIG.initializationResults.apiSecurity = securityResult.success ? 'OK' : 'FAILED';
    }

    // 4. Compliance & Auditing Service
    if (FASE4_CONFIG.services.compliance.enabled) {
      logger.info('[FASE4] Initializing Compliance & Auditing Service...');
      const complianceResult = compliance.initializeComplianceAuditing(
        mergedConfig.compliance
      );
      initResults.compliance = complianceResult;
      FASE4_CONFIG.initializationResults.compliance = complianceResult.success ? 'OK' : 'FAILED';
    }

    const duration = Date.now() - startTime;
    const successCount = Object.values(FASE4_CONFIG.initializationResults).filter(
      (r) => r === 'OK'
    ).length;
    const totalServices = Object.keys(FASE4_CONFIG.services).filter(
      (s) => FASE4_CONFIG.services[s].enabled
    ).length;

    FASE4_CONFIG.status = 'initialized';
    FASE4_CONFIG.completionTime = new Date();
    FASE4_CONFIG.initializationDuration = `${(duration / 1000).toFixed(2)}s`;

    logger.info('[FASE4] API Security & Threat Detection initialization completed', {
      phase: FASE4_CONFIG.phase,
      successCount,
      totalServices,
      duration: `${duration}ms`,
      status: FASE4_CONFIG.status,
    });

    return {
      success: successCount === totalServices,
      phase: FASE4_CONFIG.phase,
      status: FASE4_CONFIG.status,
      servicesInitialized: successCount,
      totalServices,
      duration: `${(duration / 1000).toFixed(2)}s`,
      results: FASE4_CONFIG.initializationResults,
      detailedResults: initResults,
    };
  } catch (err) {
    logger.error('[FASE4] Critical error during initialization', {
      error: err.message,
      stack: err.stack,
    });
    FASE4_CONFIG.status = 'failed';
    return {
      success: false,
      error: err.message,
      status: FASE4_CONFIG.status,
    };
  }
};

/**
 * Get FASE 4 Status
 */
export const getFASE4Status = () => {
  try {
    const serviceStatuses = {};

    // Get status from each service
    if (FASE4_CONFIG.services.apiGateway.enabled) {
      serviceStatuses.apiGateway = apiGateway.getGatewayStatus();
    }

    if (FASE4_CONFIG.services.threatDetection.enabled) {
      serviceStatuses.threatDetection = threatDetection.getThreatDetectionStatus();
    }

    if (FASE4_CONFIG.services.apiSecurity.enabled) {
      serviceStatuses.apiSecurity = apiSecurity.getAPISecurityStatus();
    }

    if (FASE4_CONFIG.services.compliance.enabled) {
      serviceStatuses.compliance = compliance.getComplianceStatus();
    }

    return {
      success: true,
      phase: FASE4_CONFIG.phase,
      status: FASE4_CONFIG.status,
      initializationDate: FASE4_CONFIG.initializationDate.toISOString(),
      completionTime: FASE4_CONFIG.completionTime?.toISOString() || null,
      initializationDuration: FASE4_CONFIG.initializationDuration,
      services: FASE4_CONFIG.services,
      initializationResults: FASE4_CONFIG.initializationResults,
      serviceStatuses,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[FASE4] Exception getting status', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Health check for all FASE 4 services
 */
export const healthCheckFASE4 = async () => {
  try {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      overallStatus: 'healthy',
      services: {},
    };

    // Check each service health
    healthStatus.services.apiGateway = {
      enabled: FASE4_CONFIG.services.apiGateway.enabled,
      status:
        FASE4_CONFIG.initializationResults.apiGateway === 'OK' ? 'healthy' : 'unhealthy',
    };

    healthStatus.services.threatDetection = {
      enabled: FASE4_CONFIG.services.threatDetection.enabled,
      status:
        FASE4_CONFIG.initializationResults.threatDetection === 'OK' ? 'healthy' : 'unhealthy',
    };

    healthStatus.services.apiSecurity = {
      enabled: FASE4_CONFIG.services.apiSecurity.enabled,
      status:
        FASE4_CONFIG.initializationResults.apiSecurity === 'OK' ? 'healthy' : 'unhealthy',
    };

    healthStatus.services.compliance = {
      enabled: FASE4_CONFIG.services.compliance.enabled,
      status: FASE4_CONFIG.initializationResults.compliance === 'OK' ? 'healthy' : 'unhealthy',
    };

    // Calculate overall health
    const unhealthyServices = Object.values(healthStatus.services).filter(
      (s) => s.status === 'unhealthy'
    ).length;

    if (unhealthyServices > 0) {
      healthStatus.overallStatus = unhealthyServices >= 2 ? 'critical' : 'degraded';
    }

    logger.info('[FASE4] Health check completed', {
      overallStatus: healthStatus.overallStatus,
      unhealthyServices,
    });

    return { success: true, ...healthStatus };
  } catch (err) {
    logger.error('[FASE4] Exception during health check', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get FASE 4 Configuration
 */
export const getFASE4Config = () => {
  return {
    success: true,
    config: FASE4_CONFIG,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Export all FASE 4 services
 */
export const getFASE4Services = () => {
  return {
    success: true,
    services: {
      apiGateway,
      threatDetection,
      apiSecurity,
      compliance,
    },
    count: 4,
    timestamp: new Date().toISOString(),
  };
};

export default {
  initializeFASE4,
  getFASE4Status,
  healthCheckFASE4,
  getFASE4Config,
  getFASE4Services,
};
