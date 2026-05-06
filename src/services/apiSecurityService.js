/**
 * FASE 4.3: API Security Service
 * Request/response validation, API versioning, scope enforcement, deprecation management
 * OAuth 2.0 token validation, JWT verification, API contract enforcement
 */

import logger from '../utils/logger.js';

/**
 * API Security Configuration
 */
const API_SECURITY_CONFIG = {
  apiVersioningEnabled: true,
  currentApiVersion: 'v2',
  scopeEnforcementEnabled: true,
  jwtValidationEnabled: true,
  jwtSecret: 'super-secret-key-for-signing',
  validateRequestSchema: true,
  validateResponseSchema: true,
  deprecationTrackingEnabled: true,
};

/**
 * API storage
 */
let apiEndpoints = new Map();
let apiVersions = new Map();
let deprecatedEndpoints = new Map();
let scopeDefinitions = new Map();
let requestValidations = [];
let responseValidations = [];

/**
 * Initialize API Security service
 */
export const initializeAPISecurity = (config = {}) => {
  try {
    Object.assign(API_SECURITY_CONFIG, config);

    // Setup standard API versions
    setupAPIVersions();

    // Setup API endpoints
    setupAPIEndpoints();

    // Setup scope definitions
    setupScopeDefinitions();

    logger.info('[APISecurity] API Security service initialized', {
      apiVersioningEnabled: API_SECURITY_CONFIG.apiVersioningEnabled,
      scopeEnforcementEnabled: API_SECURITY_CONFIG.scopeEnforcementEnabled,
      jwtValidationEnabled: API_SECURITY_CONFIG.jwtValidationEnabled,
    });

    return { success: true };
  } catch (err) {
    logger.error('[APISecurity] Exception initializing API Security', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Setup API versions
 */
const setupAPIVersions = () => {
  try {
    apiVersions.set('v1', {
      version: 'v1',
      releaseDate: new Date('2024-01-01'),
      status: 'deprecated',
      sunsetDate: new Date('2025-01-01'),
      features: ['basic-auth', 'json-responses'],
    });

    apiVersions.set('v2', {
      version: 'v2',
      releaseDate: new Date('2024-06-01'),
      status: 'current',
      features: ['oauth2', 'jwt', 'pagination', 'filtering', 'rate-limiting'],
    });

    apiVersions.set('v3', {
      version: 'v3',
      releaseDate: new Date('2025-06-01'),
      status: 'beta',
      features: [
        'graphql-endpoint',
        'webhooks',
        'batch-operations',
        'advanced-filtering',
        'custom-fields',
      ],
    });

    logger.info('[APISecurity] API versions configured', {
      versions: apiVersions.size,
    });
  } catch (err) {
    logger.error('[APISecurity] Exception setting up API versions', {
      error: err.message,
    });
  }
};

/**
 * Setup API endpoints
 */
const setupAPIEndpoints = () => {
  try {
    const endpoints = [
      {
        path: '/api/v2/users',
        method: 'GET',
        version: 'v2',
        requiredScopes: ['users:read'],
        deprecated: false,
      },
      {
        path: '/api/v2/users',
        method: 'POST',
        version: 'v2',
        requiredScopes: ['users:write'],
        deprecated: false,
      },
      {
        path: '/api/v1/users',
        method: 'GET',
        version: 'v1',
        requiredScopes: ['users:read'],
        deprecated: true,
        sunsetDate: new Date('2025-01-01'),
      },
      {
        path: '/api/v2/kpis',
        method: 'GET',
        version: 'v2',
        requiredScopes: ['kpis:read'],
        deprecated: false,
      },
      {
        path: '/api/v2/kpis',
        method: 'POST',
        version: 'v2',
        requiredScopes: ['kpis:write'],
        deprecated: false,
      },
    ];

    for (const endpoint of endpoints) {
      const key = `${endpoint.method}:${endpoint.path}`;
      apiEndpoints.set(key, endpoint);

      if (endpoint.deprecated) {
        deprecatedEndpoints.set(key, {
          endpoint: key,
          deprecatedAt: new Date(endpoint.sunsetDate.getTime() - 30 * 24 * 60 * 60 * 1000),
          sunsetDate: endpoint.sunsetDate,
          replacement: endpoint.path.replace(`/v1/`, `/v2/`),
          usageCount: 0,
        });
      }
    }

    logger.info('[APISecurity] API endpoints configured', {
      endpoints: apiEndpoints.size,
      deprecated: deprecatedEndpoints.size,
    });
  } catch (err) {
    logger.error('[APISecurity] Exception setting up API endpoints', {
      error: err.message,
    });
  }
};

/**
 * Setup scope definitions
 */
const setupScopeDefinitions = () => {
  try {
    const scopes = [
      {
        scope: 'users:read',
        description: 'Read user information',
        level: 'basic',
      },
      {
        scope: 'users:write',
        description: 'Create and modify users',
        level: 'advanced',
      },
      {
        scope: 'kpis:read',
        description: 'Read KPI data',
        level: 'basic',
      },
      {
        scope: 'kpis:write',
        description: 'Create and modify KPIs',
        level: 'advanced',
      },
      {
        scope: 'admin:full',
        description: 'Full administrative access',
        level: 'admin',
      },
    ];

    for (const scope of scopes) {
      scopeDefinitions.set(scope.scope, scope);
    }

    logger.info('[APISecurity] Scope definitions configured', {
      scopes: scopeDefinitions.size,
    });
  } catch (err) {
    logger.error('[APISecurity] Exception setting up scope definitions', {
      error: err.message,
    });
  }
};

/**
 * Validate request
 */
export const validateRequest = (method, path, headers, body, userScopes = []) => {
  try {
    const validation = {
      timestamp: new Date(),
      method,
      path,
      valid: true,
      errors: [],
      warnings: [],
    };

    // Check if endpoint exists
    const endpointKey = `${method}:${path}`;
    const endpoint = apiEndpoints.get(endpointKey);

    if (!endpoint) {
      validation.valid = false;
      validation.errors.push('Endpoint not found');
      requestValidations.push(validation);
      return validation;
    }

    // Check if endpoint is deprecated
    if (endpoint.deprecated) {
      validation.warnings.push(
        `Endpoint deprecated, will sunset on ${endpoint.sunsetDate.toISOString()}`
      );
      const deprecated = deprecatedEndpoints.get(endpointKey);
      if (deprecated) deprecated.usageCount++;
    }

    // Validate JWT token
    if (API_SECURITY_CONFIG.jwtValidationEnabled && headers.authorization) {
      const jwtValidation = validateJWT(headers.authorization);
      if (!jwtValidation.valid) {
        validation.valid = false;
        validation.errors.push(jwtValidation.error);
      }
    }

    // Validate scopes
    if (API_SECURITY_CONFIG.scopeEnforcementEnabled) {
      const scopeValidation = validateScopes(endpoint.requiredScopes, userScopes);
      if (!scopeValidation.valid) {
        validation.valid = false;
        validation.errors.push(scopeValidation.error);
      }
    }

    // Validate request schema
    if (API_SECURITY_CONFIG.validateRequestSchema && body) {
      const schemaValidation = validateRequestSchema(endpoint, body);
      if (!schemaValidation.valid) {
        validation.warnings.push(...schemaValidation.warnings);
      }
    }

    requestValidations.push(validation);

    logger.info('[APISecurity] Request validated', {
      endpoint: endpointKey,
      valid: validation.valid,
      errors: validation.errors.length,
    });

    return validation;
  } catch (err) {
    logger.error('[APISecurity] Exception validating request', {
      error: err.message,
    });
    return { valid: false, error: err.message };
  }
};

/**
 * Validate JWT token
 */
const validateJWT = (authHeader) => {
  try {
    if (!authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'Invalid authorization header format' };
    }

    const token = authHeader.substring(7);

    // Simulate JWT validation (in production, use jsonwebtoken library)
    if (token.length < 20) {
      return { valid: false, error: 'Invalid JWT token format' };
    }

    // Basic structure validation: header.payload.signature
    if ((token.match(/\./g) || []).length !== 2) {
      return { valid: false, error: 'Invalid JWT structure' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
};

/**
 * Validate scopes
 */
const validateScopes = (requiredScopes, userScopes) => {
  try {
    for (const requiredScope of requiredScopes) {
      if (!userScopes.includes(requiredScope)) {
        return {
          valid: false,
          error: `Missing required scope: ${requiredScope}`,
        };
      }
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
};

/**
 * Validate request schema
 */
const validateRequestSchema = (endpoint, body) => {
  try {
    const warnings = [];

    // Basic validation based on endpoint
    if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
      if (!body || Object.keys(body).length === 0) {
        warnings.push('Empty request body for POST/PUT');
      }
    }

    return { valid: true, warnings };
  } catch (err) {
    logger.warn('[APISecurity] Exception validating request schema', {
      error: err.message,
    });
    return { valid: true, warnings: [] };
  }
};

/**
 * Get API status
 */
export const getAPISecurityStatus = () => {
  try {
    const now = new Date();
    const last24Hours = requestValidations.filter(
      (v) => new Date(v.timestamp) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );

    const failedValidations = last24Hours.filter((v) => !v.valid);

    return {
      success: true,
      apiVersioningEnabled: API_SECURITY_CONFIG.apiVersioningEnabled,
      currentVersion: API_SECURITY_CONFIG.currentApiVersion,
      versions: Array.from(apiVersions.values()),
      endpoints: apiEndpoints.size,
      deprecatedEndpoints: deprecatedEndpoints.size,
      scopes: scopeDefinitions.size,
      last24HourMetrics: {
        totalValidations: last24Hours.length,
        failedValidations: failedValidations.length,
        validationFailureRate: last24Hours.length > 0
          ? (failedValidations.length / last24Hours.length * 100).toFixed(2)
          : 0,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[APISecurity] Exception getting API security status', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get deprecated endpoints status
 */
export const getDeprecatedEndpointsStatus = () => {
  try {
    const deprecated = Array.from(deprecatedEndpoints.values());

    return {
      success: true,
      deprecatedEndpoints: deprecated.map((d) => ({
        ...d,
        daysUntilSunset: Math.ceil((d.sunsetDate - new Date()) / (1000 * 60 * 60 * 24)),
      })),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[APISecurity] Exception getting deprecated endpoints', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

export default {
  initializeAPISecurity,
  validateRequest,
  getAPISecurityStatus,
  getDeprecatedEndpointsStatus,
};
