/**
 * API Client Service for FASE 5 Backend Integration
 * Handles authentication and communication with Express security framework
 *
 * Endpoints:
 * - /health (GET) - Server health check
 * - /security/framework/* - Framework status endpoints
 * - /api/secrets/* - Secrets vault operations
 * - /api/keys/* - Key rotation operations
 * - /api/lifecycle/* - Secrets lifecycle management
 */

import logger from '../utils/logger.js';

// Get backend API URL from environment
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Store authentication token
let authToken = null;

/**
 * Set authentication token for all subsequent requests
 * @param {string} token - JWT or Bearer token
 */
export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('apiAuthToken', token);
    logger.info('[APIClient] Auth token set');
  } else {
    localStorage.removeItem('apiAuthToken');
    logger.info('[APIClient] Auth token cleared');
  }
};

/**
 * Get stored authentication token
 * @returns {string|null} Stored token or null
 */
export const getAuthToken = () => {
  if (!authToken) {
    authToken = localStorage.getItem('apiAuthToken');
  }
  return authToken;
};

/**
 * Build Authorization header
 * @returns {Object} Headers object with Authorization
 */
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} Response data
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    logger.info(`[APIClient] ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = data?.error || `HTTP ${response.status}`;
      logger.error('[APIClient] Request failed', {
        endpoint,
        status: response.status,
        error,
      });
      throw new Error(error);
    }

    logger.info('[APIClient] Success', { endpoint, status: response.status });
    return data;
  } catch (err) {
    logger.error('[APIClient] Exception', { endpoint, error: err.message });
    throw err;
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// HEALTH & STATUS ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════════

export const apiHealthService = {
  /**
   * Check if backend is healthy
   * @returns {Promise<Object>} Health status
   */
  checkHealth: async () => {
    return apiRequest('/health');
  },

  /**
   * Get security framework status (requires auth)
   * @returns {Promise<Object>} Framework status
   */
  getFrameworkStatus: async () => {
    return apiRequest('/security/framework/status');
  },

  /**
   * Get security framework health (requires auth)
   * @returns {Promise<Object>} Framework health
   */
  getFrameworkHealth: async () => {
    return apiRequest('/security/framework/health');
  },

  /**
   * Get security framework configuration (requires auth)
   * @returns {Promise<Object>} Framework config
   */
  getFrameworkConfig: async () => {
    return apiRequest('/security/framework/config');
  },

  /**
   * Get all security services (requires auth)
   * @returns {Promise<Object>} Services list
   */
  getSecurityServices: async () => {
    return apiRequest('/security/framework/services');
  },

  /**
   * Get framework summary (requires auth)
   * @returns {Promise<Object>} Framework summary
   */
  getFrameworkSummary: async () => {
    return apiRequest('/security/framework/summary');
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// SECRETS VAULT ENDPOINTS (/api/secrets/*)
// ════════════════════════════════════════════════════════════════════════════════

export const apiSecretsService = {
  /**
   * Create a new secret in the vault
   * FASE 6: POST /api/secrets
   * @param {Object} payload - { name, description, secret_value, secret_type, tags, expires_at }
   * @returns {Promise<Object>} Created secret
   */
  createSecret: async (payload) => {
    return apiRequest('/api/secrets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Retrieve a secret by ID (metadata only, no decrypted value)
   * FASE 6: GET /api/secrets/:secretId
   * @param {string} secretId - Secret ID
   * @returns {Promise<Object>} Secret metadata
   */
  getSecret: async (secretId) => {
    return apiRequest(`/api/secrets/${secretId}`);
  },

  /**
   * Get decrypted secret value
   * FASE 6: GET /api/secrets/:secretId/value
   * @param {string} secretId - Secret ID
   * @returns {Promise<Object>} Decrypted secret value
   */
  getSecretValue: async (secretId) => {
    return apiRequest(`/api/secrets/${secretId}/value`);
  },

  /**
   * List all secrets (with optional filtering and pagination)
   * FASE 6: GET /api/secrets?status=active&page=1&limit=50&search=api&sort=created_at&order=DESC
   * @param {Object} filters - { status, page, limit, search, sort, order }
   * @returns {Promise<Object>} List of secrets with pagination
   */
  listSecrets: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return apiRequest(`/api/secrets?${query}`);
  },

  /**
   * Update a secret
   * FASE 6: PUT /api/secrets/:secretId
   * @param {string} secretId - Secret ID
   * @param {Object} payload - { description, secret_value, status }
   * @returns {Promise<Object>} Updated secret
   */
  updateSecret: async (secretId, payload) => {
    return apiRequest(`/api/secrets/${secretId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete or archive a secret
   * FASE 6: DELETE /api/secrets/:secretId?permanent=false
   * @param {string} secretId - Secret ID
   * @param {boolean} permanent - If true, permanently delete; if false, archive
   * @returns {Promise<Object>} Deletion/archive confirmation
   */
  deleteSecret: async (secretId, permanent = false) => {
    const url = `/api/secrets/${secretId}${permanent ? '?permanent=true' : ''}`;
    return apiRequest(url, { method: 'DELETE' });
  },

  /**
   * Archive a secret (soft delete)
   * FASE 6: DELETE /api/secrets/:secretId (with permanent=false default)
   * @param {string} secretId - Secret ID
   * @returns {Promise<Object>} Archive confirmation
   */
  archiveSecret: async (secretId) => {
    return apiRequest(`/api/secrets/${secretId}`, {
      method: 'DELETE',
      body: JSON.stringify({ permanent: false })
    });
  },

  /**
   * Get audit trail for a secret
   * FASE 6: GET /api/secrets/:secretId/audit
   * @param {string} secretId - Secret ID
   * @param {Object} options - { limit, offset }
   * @returns {Promise<Object>} Audit trail
   */
  getAuditTrail: async (secretId, options = {}) => {
    const query = new URLSearchParams(options).toString();
    return apiRequest(`/api/secrets/${secretId}/audit?${query}`);
  },

  /**
   * Export secret for backup (FASE 7+)
   * @param {string} secretId - Secret ID
   * @returns {Promise<Object>} Encrypted export
   */
  exportSecret: async (secretId) => {
    return apiRequest(`/api/secrets/${secretId}/export`);
  },

  /**
   * Import secret from backup (FASE 7+)
   * @param {Object} payload - Encrypted export data
   * @returns {Promise<Object>} Imported secret
   */
  importSecret: async (payload) => {
    return apiRequest('/api/secrets/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// KEY ROTATION ENDPOINTS (/api/keys/*)
// ════════════════════════════════════════════════════════════════════════════════

export const apiKeyRotationService = {
  /**
   * Get key rotation policy
   * @param {string} secretId - Secret ID
   * @returns {Promise<Object>} Rotation policy
   */
  getRotationPolicy: async (secretId) => {
    return apiRequest(`/api/keys/${secretId}/policy`);
  },

  /**
   * Update key rotation policy
   * @param {string} secretId - Secret ID
   * @param {Object} policy - { enabled, frequency, nextRotation }
   * @returns {Promise<Object>} Updated policy
   */
  updateRotationPolicy: async (secretId, policy) => {
    return apiRequest(`/api/keys/${secretId}/policy`, {
      method: 'PUT',
      body: JSON.stringify(policy),
    });
  },

  /**
   * Trigger immediate key rotation
   * @param {string} secretId - Secret ID
   * @returns {Promise<Object>} Rotation result
   */
  rotateNow: async (secretId) => {
    return apiRequest(`/api/keys/${secretId}/rotate`, { method: 'POST' });
  },

  /**
   * Get rotation history
   * @param {string} secretId - Secret ID
   * @param {Object} options - { limit, offset }
   * @returns {Promise<Object>} Rotation history
   */
  getRotationHistory: async (secretId, options = {}) => {
    const query = new URLSearchParams(options).toString();
    return apiRequest(`/api/keys/${secretId}/history?${query}`);
  },

  /**
   * Get scheduled rotations
   * @returns {Promise<Object>} List of upcoming rotations
   */
  getScheduledRotations: async () => {
    return apiRequest('/api/keys/scheduled');
  },

  /**
   * Preview next rotation
   * @param {string} secretId - Secret ID
   * @returns {Promise<Object>} Preview of what will be rotated
   */
  previewRotation: async (secretId) => {
    return apiRequest(`/api/keys/${secretId}/preview`);
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// SECRETS LIFECYCLE ENDPOINTS (/api/lifecycle/*)
// ════════════════════════════════════════════════════════════════════════════════

export const apiLifecycleService = {
  /**
   * Get secret lifecycle status
   * @param {string} secretId - Secret ID
   * @returns {Promise<Object>} Lifecycle status
   */
  getStatus: async (secretId) => {
    return apiRequest(`/api/lifecycle/${secretId}/status`);
  },

  /**
   * Update lifecycle stage (draft → active → deprecated → archived)
   * @param {string} secretId - Secret ID
   * @param {string} stage - New stage
   * @returns {Promise<Object>} Updated status
   */
  updateStage: async (secretId, stage) => {
    return apiRequest(`/api/lifecycle/${secretId}/stage`, {
      method: 'PUT',
      body: JSON.stringify({ stage }),
    });
  },

  /**
   * Mark secret as deprecated
   * @param {string} secretId - Secret ID
   * @param {Object} options - { reason, replacementSecretId, decommissionDate }
   * @returns {Promise<Object>} Updated status
   */
  deprecate: async (secretId, options = {}) => {
    return apiRequest(`/api/lifecycle/${secretId}/deprecate`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  /**
   * Schedule secret decommission
   * @param {string} secretId - Secret ID
   * @param {Date|string} decommissionDate - When to decommission
   * @returns {Promise<Object>} Schedule confirmation
   */
  scheduleDecommission: async (secretId, decommissionDate) => {
    return apiRequest(`/api/lifecycle/${secretId}/decommission`, {
      method: 'POST',
      body: JSON.stringify({ decommissionDate }),
    });
  },

  /**
   * Get audit trail for secret
   * @param {string} secretId - Secret ID
   * @param {Object} options - { limit, offset, eventTypes }
   * @returns {Promise<Object>} Audit events
   */
  getAuditTrail: async (secretId, options = {}) => {
    const query = new URLSearchParams(options).toString();
    return apiRequest(`/api/lifecycle/${secretId}/audit?${query}`);
  },

  /**
   * Get compliance report for secret
   * @param {string} secretId - Secret ID
   * @returns {Promise<Object>} Compliance data
   */
  getComplianceReport: async (secretId) => {
    return apiRequest(`/api/lifecycle/${secretId}/compliance`);
  },

  /**
   * Get lifecycle metrics across all secrets
   * @returns {Promise<Object>} Aggregate metrics
   */
  getMetrics: async () => {
    return apiRequest('/api/lifecycle/metrics');
  },

  /**
   * Get upcoming expirations/rotations
   * @param {Object} options - { daysAhead }
   * @returns {Promise<Object>} Upcoming events
   */
  getUpcomingEvents: async (options = {}) => {
    const query = new URLSearchParams(options).toString();
    return apiRequest(`/api/lifecycle/upcoming?${query}`);
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION INTEGRATION
// ════════════════════════════════════════════════════════════════════════════════

export const apiAuthService = {
  /**
   * Generate API token from authentication provider (Supabase, etc.)
   * In production: exchange auth token for API token
   * @param {string} idToken - Authentication token from provider
   * @returns {Promise<Object>} { token, expiresIn }
   */
  generateApiToken: async (idToken) => {
    // For now, use idToken directly as Bearer token
    // In production, this would exchange it for a service-specific token
    setAuthToken(idToken);
    return { token: idToken, expiresIn: 3600 };
  },

  /**
   * Validate current API token
   * @returns {Promise<Object>} Token validity
   */
  validateToken: async () => {
    try {
      const health = await apiHealthService.checkHealth();
      return { valid: true, ...health };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  },

  /**
   * Refresh API token
   * @returns {Promise<Object>} New token
   */
  refreshToken: async () => {
    // Token refresh logic would go here
    // For now, just validate the existing token
    return apiAuthService.validateToken();
  },

  /**
   * Clear authentication
   */
  logout: () => {
    setAuthToken(null);
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Initialize API client (called from App.jsx)
 * Restores auth token from localStorage and validates connection
 * @returns {Promise<boolean>} True if successfully initialized
 */
export const initializeApiClient = async () => {
  try {
    // Restore token from localStorage
    const token = localStorage.getItem('apiAuthToken');
    if (token) {
      setAuthToken(token);
    }

    // Test connection
    const health = await apiHealthService.checkHealth();
    logger.info('[APIClient] Initialized successfully', health);
    return true;
  } catch (err) {
    logger.warn('[APIClient] Backend not available - using local mode', {
      error: err.message,
      baseUrl: API_BASE_URL,
    });
    return false;
  }
};

export default {
  // Auth
  setAuthToken,
  getAuthToken,
  apiAuthService,

  // Health
  apiHealthService,

  // Secrets
  apiSecretsService,

  // Key Rotation
  apiKeyRotationService,

  // Lifecycle
  apiLifecycleService,

  // Initialization
  initializeApiClient,
};
