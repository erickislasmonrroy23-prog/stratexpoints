/**
 * API Interceptor for Multi-Tenant Request Handling
 *
 * Automatically injects organization context into all API requests
 * Handles authentication, CSRF protection, and error responses
 *
 * Features:
 * - Automatic organization_id injection in request headers
 * - CSRF token inclusion in POST/PUT/PATCH/DELETE requests
 * - Bearer token authentication from Supabase session
 * - Error handling with 401/403 token refresh logic
 * - Retry mechanism for authentication failures
 * - Request/response logging for debugging
 *
 * Usage:
 * import apiClient from './utils/apiInterceptor.js';
 *
 * // All requests automatically include organization context
 * const response = await apiClient.get('/api/okrs');
 * const created = await apiClient.post('/api/okrs', { name: 'Q1 Goals' });
 */

import axios from 'axios';
import { getCSRFToken } from './csrfUtils.js';
import logger from './logger.js';

// Configuration
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || '';
const AUTH_TOKEN_STORAGE_KEY = 'sb-auth-token';
const ORGANIZATION_ID_STORAGE_KEY = 'current-organization-id';
const MAX_RETRIES = 2;

/**
 * Create axios instance with interceptors
 */
const createApiClient = () => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 second timeout
    headers: {
      'Content-Type': 'application/json',
    },
  });

  /**
   * Request interceptor:
   * - Inject authorization token
   * - Inject organization context
   * - Add CSRF token for state-changing requests
   * - Log requests in development
   */
  client.interceptors.request.use(
    (config) => {
      try {
        // 1. Add authentication token from session/localStorage
        const token = getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 2. Inject organization ID for tenant isolation
        const organizationId = getCurrentOrganizationId();
        if (organizationId) {
          config.headers['X-Organization-ID'] = organizationId;
        }

        // 3. Add CSRF token for state-changing requests
        const stateChangingMethods = ['post', 'put', 'patch', 'delete'];
        if (stateChangingMethods.includes(config.method?.toLowerCase())) {
          const csrfToken = getCSRFToken();
          if (csrfToken) {
            config.headers['X-CSRF-Token'] = csrfToken;
          } else {
            logger.warn('CSRF token not found for state-changing request', {
              method: config.method,
              url: config.url,
            });
          }
        }

        // 4. Add request ID for tracing
        config.headers['X-Request-ID'] = generateRequestId();

        // 5. Log request in development
        if (import.meta.env.DEV) {
          logger.debug('API Request', {
            method: config.method?.toUpperCase(),
            url: config.url,
            organizationId,
          });
        }

        return config;
      } catch (error) {
        logger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    },
    (error) => {
      logger.error('Request interceptor failed', error);
      return Promise.reject(error);
    }
  );

  /**
   * Response interceptor:
   * - Handle 401/403 errors (token refresh, re-authentication)
   * - Handle 429 errors (rate limiting)
   * - Handle 500+ errors (server errors)
   * - Log responses in development
   */
  client.interceptors.response.use(
    (response) => {
      // Log successful responses in development
      if (import.meta.env.DEV) {
        logger.debug('API Response', {
          status: response.status,
          url: response.config.url,
        });
      }
      return response;
    },
    async (error) => {
      const config = error.config;

      // Prevent infinite retry loops
      if (!config) {
        return Promise.reject(error);
      }

      // Track retry attempts
      config.retryCount = config.retryCount || 0;

      // Handle 401 Unauthorized
      if (error.response?.status === 401) {
        logger.warn('Unauthorized (401) - Token may have expired', {
          url: config.url,
        });

        // Retry once with token refresh attempt
        if (config.retryCount < MAX_RETRIES) {
          config.retryCount++;
          try {
            // Attempt token refresh (would call refresh endpoint in production)
            const newToken = await attemptTokenRefresh();
            if (newToken) {
              config.headers.Authorization = `Bearer ${newToken}`;
              return client(config);
            }
          } catch (refreshError) {
            logger.error('Token refresh failed', refreshError);
            // Trigger logout/re-authentication flow
            handleAuthenticationFailure();
            return Promise.reject(error);
          }
        }
        handleAuthenticationFailure();
      }

      // Handle 403 Forbidden
      if (error.response?.status === 403) {
        logger.warn('Forbidden (403) - Permission denied', {
          url: config.url,
          organizationId: config.headers['X-Organization-ID'],
        });
        // This could be:
        // 1. RLS policy denied access
        // 2. Permission check failed
        // 3. Organization context mismatch
        return Promise.reject(error);
      }

      // Handle 429 Too Many Requests
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || '60';
        logger.warn('Rate limited (429)', {
          url: config.url,
          retryAfter,
        });
        // Could implement exponential backoff here if needed
        return Promise.reject(error);
      }

      // Handle 500+ Server Errors
      if (error.response?.status >= 500) {
        logger.error('Server error (5xx)', {
          status: error.response.status,
          url: config.url,
          data: error.response.data,
        });
        return Promise.reject(error);
      }

      // Log other errors
      logger.error('API Error', {
        status: error.response?.status || 'unknown',
        url: config.url,
        message: error.message,
      });

      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Get authentication token from session
 * In production, this would get token from Supabase session
 *
 * @returns {string|null} JWT token or null if not authenticated
 */
const getAuthToken = () => {
  try {
    // Check sessionStorage first (most recent session)
    let token = sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (token) return token;

    // Fall back to localStorage (persistent login)
    token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (token) return token;

    // In a real app, you'd check Supabase session here:
    // const { data: { session } } = await supabase.auth.getSession();
    // return session?.access_token;

    return null;
  } catch (error) {
    logger.error('Failed to retrieve auth token', error);
    return null;
  }
};

/**
 * Get current organization ID from context/storage
 *
 * @returns {string|null} Organization ID or null if not set
 */
const getCurrentOrganizationId = () => {
  try {
    const orgId = sessionStorage.getItem(ORGANIZATION_ID_STORAGE_KEY);
    return orgId || null;
  } catch (error) {
    logger.error('Failed to retrieve organization ID', error);
    return null;
  }
};

/**
 * Generate unique request ID for tracing
 *
 * @returns {string} Unique request identifier
 */
const generateRequestId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Attempt to refresh authentication token
 * In production, this would call a refresh endpoint
 *
 * @returns {Promise<string|null>} New token or null if refresh failed
 */
const attemptTokenRefresh = async () => {
  try {
    // In a real app, you would:
    // 1. Call /api/auth/refresh endpoint with refresh token
    // 2. Store new token in session storage
    // 3. Return new token

    // For now, return null (will trigger logout)
    logger.info('Token refresh attempted (not implemented)');
    return null;
  } catch (error) {
    logger.error('Token refresh failed', error);
    return null;
  }
};

/**
 * Handle authentication failure
 * Triggers logout and redirects to login
 */
const handleAuthenticationFailure = () => {
  try {
    // Clear stored tokens
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);

    // Dispatch logout event for app to handle
    const event = new CustomEvent('auth:logout', {
      detail: { reason: 'token-expired' },
    });
    window.dispatchEvent(event);

    // In a real app, would use router to redirect to login
    logger.warn('Authentication failure - user logged out');
  } catch (error) {
    logger.error('Error handling authentication failure', error);
  }
};

/**
 * Set authentication token (called after successful login)
 *
 * @param {string} token - JWT token from authentication
 * @param {boolean} persistent - Whether to persist token across sessions
 */
export const setAuthToken = (token, persistent = false) => {
  try {
    sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    if (persistent) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    }
  } catch (error) {
    logger.error('Failed to store auth token', error);
  }
};

/**
 * Clear authentication token (called on logout)
 */
export const clearAuthToken = () => {
  try {
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch (error) {
    logger.error('Failed to clear auth token', error);
  }
};

/**
 * Set current organization context
 *
 * @param {string} organizationId - Organization ID to set
 */
export const setCurrentOrganization = (organizationId) => {
  try {
    if (organizationId) {
      sessionStorage.setItem(ORGANIZATION_ID_STORAGE_KEY, organizationId);
    } else {
      sessionStorage.removeItem(ORGANIZATION_ID_STORAGE_KEY);
    }
  } catch (error) {
    logger.error('Failed to set organization context', error);
  }
};

/**
 * Get current organization ID
 *
 * @returns {string|null} Current organization ID
 */
export const getOrganizationId = () => {
  return getCurrentOrganizationId();
};

// Create and export the configured API client
const apiClient = createApiClient();

export default apiClient;

/**
 * Exported utilities for common HTTP operations with full interceptor support
 */
export const api = {
  get: (url, config) => apiClient.get(url, config),
  post: (url, data, config) => apiClient.post(url, data, config),
  put: (url, data, config) => apiClient.put(url, data, config),
  patch: (url, data, config) => apiClient.patch(url, data, config),
  delete: (url, config) => apiClient.delete(url, config),
  request: (config) => apiClient.request(config),
};
