/**
 * SECURITY FRAMEWORK ORCHESTRATION
 * Master orchestration layer for all security phases (FASE 3 & FASE 4)
 * Initializes, coordinates, and monitors comprehensive security architecture
 * Infrastructure Hardening + API Security & Threat Detection
 */

import logger from '../utils/logger.js';
import * as fase3 from './fase3_initialization.js';
import * as fase4 from './fase4_initialization.js';
import * as fase5 from './fase5_initialization.js';

/**
 * Security Framework Configuration
 */
const SECURITY_FRAMEWORK_CONFIG = {
  framework: 'Enterprise Security Framework',
  version: '1.0.0',
  status: 'initializing',
  initializationDate: new Date(),
  phases: {
    fase3: {
      enabled: true,
      name: 'Infrastructure Hardening',
      services: 7,
      critical: true,
    },
    fase4: {
      enabled: true,
      name: 'API Security & Threat Detection',
      services: 4,
      critical: true,
    },
    fase5: {
      enabled: true,
      name: 'Secrets Management',
      services: 3,
      critical: true,
    },
  },
  totalServices: 14,
  securityLayers: [
    'Network & Infrastructure Protection',
    'API Gateway & Rate Limiting',
    'Threat Detection & Response',
    'API Contract Enforcement',
    'Compliance & Audit',
    'Secrets Management & Encryption',
  ],
  initializationResults: {},
};

/**
 * Initialize Complete Security Framework
 */
export const initializeSecurityFramework = async (config = {}) => {
  try {
    const startTime = Date.now();
    logger.info('[SecurityFramework] Starting comprehensive security framework initialization', {
      framework: SECURITY_FRAMEWORK_CONFIG.framework,
      phases: Object.keys(SECURITY_FRAMEWORK_CONFIG.phases).length,
      totalServices: SECURITY_FRAMEWORK_CONFIG.totalServices,
    });

    // Merge configurations
    const mergedConfig = {
      fase3: config.fase3 || {},
      fase4: config.fase4 || {},
      fase5: config.fase5 || {},
    };

    // Initialize all phases
    const initResults = {};

    // FASE 3: Infrastructure Hardening
    if (SECURITY_FRAMEWORK_CONFIG.phases.fase3.enabled) {
      logger.info('[SecurityFramework] Initializing FASE 3: Infrastructure Hardening...');
      const fase3Result = await fase3.initializeFASE3(mergedConfig.fase3);
      initResults.fase3 = fase3Result;
      SECURITY_FRAMEWORK_CONFIG.initializationResults.fase3 = fase3Result.success
        ? 'OK'
        : 'FAILED';
    }

    // FASE 4: API Security & Threat Detection
    if (SECURITY_FRAMEWORK_CONFIG.phases.fase4.enabled) {
      logger.info('[SecurityFramework] Initializing FASE 4: API Security & Threat Detection...');
      const fase4Result = await fase4.initializeFASE4(mergedConfig.fase4);
      initResults.fase4 = fase4Result;
      SECURITY_FRAMEWORK_CONFIG.initializationResults.fase4 = fase4Result.success
        ? 'OK'
        : 'FAILED';
    }

    // FASE 5: Secrets Management
    if (SECURITY_FRAMEWORK_CONFIG.phases.fase5.enabled) {
      logger.info('[SecurityFramework] Initializing FASE 5: Secrets Management...');
      const fase5Result = await fase5.initializeFASE5(mergedConfig.fase5);
      initResults.fase5 = fase5Result;
      SECURITY_FRAMEWORK_CONFIG.initializationResults.fase5 = fase5Result.success
        ? 'OK'
        : 'FAILED';
    }

    const duration = Date.now() - startTime;
    const successCount = Object.values(SECURITY_FRAMEWORK_CONFIG.initializationResults).filter(
      (r) => r === 'OK'
    ).length;
    const totalPhases = Object.keys(SECURITY_FRAMEWORK_CONFIG.phases).filter(
      (p) => SECURITY_FRAMEWORK_CONFIG.phases[p].enabled
    ).length;

    SECURITY_FRAMEWORK_CONFIG.status = 'initialized';
    SECURITY_FRAMEWORK_CONFIG.completionTime = new Date();
    SECURITY_FRAMEWORK_CONFIG.initializationDuration = `${(duration / 1000).toFixed(2)}s`;

    const overallSuccess = successCount === totalPhases;

    logger.info('[SecurityFramework] Security framework initialization completed', {
      framework: SECURITY_FRAMEWORK_CONFIG.framework,
      phasesInitialized: successCount,
      totalPhases,
      totalServices: SECURITY_FRAMEWORK_CONFIG.totalServices,
      duration: `${duration}ms`,
      status: SECURITY_FRAMEWORK_CONFIG.status,
      overallSuccess,
    });

    return {
      success: overallSuccess,
      framework: SECURITY_FRAMEWORK_CONFIG.framework,
      status: SECURITY_FRAMEWORK_CONFIG.status,
      phasesInitialized: successCount,
      totalPhases,
      totalServices: SECURITY_FRAMEWORK_CONFIG.totalServices,
      securityLayers: SECURITY_FRAMEWORK_CONFIG.securityLayers,
      duration: `${(duration / 1000).toFixed(2)}s`,
      results: SECURITY_FRAMEWORK_CONFIG.initializationResults,
      detailedResults: initResults,
    };
  } catch (err) {
    logger.error('[SecurityFramework] Critical error during initialization', {
      error: err.message,
      stack: err.stack,
    });
    SECURITY_FRAMEWORK_CONFIG.status = 'failed';
    return {
      success: false,
      error: err.message,
      status: SECURITY_FRAMEWORK_CONFIG.status,
    };
  }
};

/**
 * Get Complete Security Framework Status
 */
export const getSecurityFrameworkStatus = () => {
  try {
    const fase3Status = fase3.getFASE3Status();
    const fase4Status = fase4.getFASE4Status();
    const fase5Status = fase5.getFASE5Status();

    // Aggregate security metrics
    const aggregatedMetrics = {
      infrastructure: fase3Status.success ? fase3Status.serviceStatuses : null,
      apiSecurity: fase4Status.success ? fase4Status.serviceStatuses : null,
      secretsManagement: fase5Status.success ? fase5Status.serviceStatuses : null,
    };

    // Calculate overall security posture
    const allServicesHealthy =
      fase3Status.success &&
      fase4Status.success &&
      fase5Status.success &&
      Object.values(fase3Status.serviceStatuses || {}).every((s) => s && s.status === 'healthy') &&
      Object.values(fase4Status.serviceStatuses || {}).every((s) => s && s.status === 'healthy') &&
      Object.values(fase5Status.serviceStatuses || {}).every((s) => s && s.status === 'healthy');

    return {
      success: true,
      framework: SECURITY_FRAMEWORK_CONFIG.framework,
      status: SECURITY_FRAMEWORK_CONFIG.status,
      overallSecurityPosture: allServicesHealthy ? 'secure' : 'degraded',
      initializationDate: SECURITY_FRAMEWORK_CONFIG.initializationDate.toISOString(),
      completionTime: SECURITY_FRAMEWORK_CONFIG.completionTime?.toISOString() || null,
      initializationDuration: SECURITY_FRAMEWORK_CONFIG.initializationDuration,
      phases: SECURITY_FRAMEWORK_CONFIG.phases,
      securityLayers: SECURITY_FRAMEWORK_CONFIG.securityLayers,
      phasesStatus: SECURITY_FRAMEWORK_CONFIG.initializationResults,
      aggregatedMetrics,
      fase3: fase3Status,
      fase4: fase4Status,
      fase5: fase5Status,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[SecurityFramework] Exception getting status', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Comprehensive health check for entire security framework
 */
export const healthCheckSecurityFramework = async () => {
  try {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      framework: SECURITY_FRAMEWORK_CONFIG.framework,
      overallStatus: 'healthy',
      phases: {},
      services: {},
      alerts: [],
    };

    // Check FASE 3
    if (SECURITY_FRAMEWORK_CONFIG.phases.fase3.enabled) {
      const fase3Health = await fase3.healthCheckFASE3();
      healthStatus.phases.fase3 = fase3Health;
      if (fase3Health.overallStatus !== 'healthy') {
        healthStatus.alerts.push(
          `FASE 3 status: ${fase3Health.overallStatus} - ${Object.entries(fase3Health.services || {})
            .filter(([, s]) => s.status !== 'healthy')
            .map(([name]) => name)
            .join(', ')}`
        );
      }
    }

    // Check FASE 4
    if (SECURITY_FRAMEWORK_CONFIG.phases.fase4.enabled) {
      const fase4Health = await fase4.healthCheckFASE4();
      healthStatus.phases.fase4 = fase4Health;
      if (fase4Health.overallStatus !== 'healthy') {
        healthStatus.alerts.push(
          `FASE 4 status: ${fase4Health.overallStatus} - ${Object.entries(fase4Health.services || {})
            .filter(([, s]) => s.status !== 'healthy')
            .map(([name]) => name)
            .join(', ')}`
        );
      }
    }

    // Check FASE 5
    if (SECURITY_FRAMEWORK_CONFIG.phases.fase5.enabled) {
      const fase5Health = await fase5.healthCheckFASE5();
      healthStatus.phases.fase5 = fase5Health;
      if (fase5Health.overallStatus !== 'healthy') {
        healthStatus.alerts.push(
          `FASE 5 status: ${fase5Health.overallStatus} - ${Object.entries(fase5Health.services || {})
            .filter(([, s]) => s.status !== 'healthy')
            .map(([name]) => name)
            .join(', ')}`
        );
      }
    }

    // Calculate overall framework health
    const unhealthyPhases = Object.values(healthStatus.phases)
      .filter((p) => p.overallStatus !== 'healthy').length;

    if (unhealthyPhases > 0) {
      healthStatus.overallStatus = unhealthyPhases >= 2 ? 'critical' : 'degraded';
    }

    logger.info('[SecurityFramework] Comprehensive health check completed', {
      overallStatus: healthStatus.overallStatus,
      unhealthyPhases,
      alerts: healthStatus.alerts.length,
    });

    return { success: true, ...healthStatus };
  } catch (err) {
    logger.error('[SecurityFramework] Exception during comprehensive health check', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get Security Framework Configuration
 */
export const getSecurityFrameworkConfig = () => {
  return {
    success: true,
    framework: SECURITY_FRAMEWORK_CONFIG.framework,
    version: SECURITY_FRAMEWORK_CONFIG.version,
    phases: SECURITY_FRAMEWORK_CONFIG.phases,
    securityLayers: SECURITY_FRAMEWORK_CONFIG.securityLayers,
    totalServices: SECURITY_FRAMEWORK_CONFIG.totalServices,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Get all security services from both phases
 */
export const getAllSecurityServices = () => {
  const fase3Services = fase3.getFASE3Services();
  const fase4Services = fase4.getFASE4Services();
  const fase5Services = fase5.getFASE5Services();

  return {
    success: true,
    framework: SECURITY_FRAMEWORK_CONFIG.framework,
    phases: 3,
    totalServices: SECURITY_FRAMEWORK_CONFIG.totalServices,
    fase3: fase3Services,
    fase4: fase4Services,
    fase5: fase5Services,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Security Framework Summary
 */
export const getSecurityFrameworkSummary = () => {
  const status = getSecurityFrameworkStatus();

  return {
    success: true,
    framework: SECURITY_FRAMEWORK_CONFIG.framework,
    version: SECURITY_FRAMEWORK_CONFIG.version,
    status: SECURITY_FRAMEWORK_CONFIG.status,
    overallSecurityPosture: status.overallSecurityPosture,
    coverage: {
      networkAndInfrastructure: {
        services: 7,
        components: [
          'Load Balancing & Auto-Scaling',
          'Web Application Firewall (WAF)',
          'DDoS Protection',
          'Backup & Disaster Recovery',
          'SSL/TLS Certificate Management',
          'Infrastructure Monitoring & Alerting',
          'Infrastructure-as-Code (IaC)',
        ],
      },
      apiSecurityAndThreatDetection: {
        services: 4,
        components: [
          'API Gateway & Rate Limiting (Token Bucket Algorithm)',
          'Advanced Threat Detection (ML-based, Pattern Recognition, Behavioral Analysis)',
          'API Security & Versioning (OAuth 2.0, JWT, Deprecation Management)',
          'Compliance & Auditing (GDPR, SOC 2, ISO 27001, 7-year Retention)',
        ],
      },
      secretsManagement: {
        services: 3,
        components: [
          'Secrets Vault & Encryption (AES-256-CBC, Access Control, Versioning)',
          'Key Rotation & Version Management (Automated Schedules, Grace Periods, Retirement)',
          'Secrets Lifecycle Management (Provisioning, Deprovisioning, Emergency Revocation, Alerts)',
        ],
      },
    },
    securityLayers: SECURITY_FRAMEWORK_CONFIG.securityLayers,
    initializationDate: SECURITY_FRAMEWORK_CONFIG.initializationDate.toISOString(),
    completionTime: SECURITY_FRAMEWORK_CONFIG.completionTime?.toISOString() || null,
    uptime: SECURITY_FRAMEWORK_CONFIG.completionTime
      ? `${Math.floor((Date.now() - SECURITY_FRAMEWORK_CONFIG.completionTime.getTime()) / 1000)}s`
      : 'N/A',
    timestamp: new Date().toISOString(),
  };
};

export default {
  initializeSecurityFramework,
  getSecurityFrameworkStatus,
  healthCheckSecurityFramework,
  getSecurityFrameworkConfig,
  getAllSecurityServices,
  getSecurityFrameworkSummary,
};
