/**
 * useAuditLog Hook - Frontend Audit Logging
 *
 * Provides convenient audit logging for frontend operations that should be tracked
 * in the audit trail. Integrates with the backend audit logging system.
 *
 * Features:
 * - Simple interface for logging actions
 * - Automatic organization context from TenantContext
 * - Automatic user context from auth
 * - Client IP detection for logging
 * - Error handling and fallback
 * - Batch logging for multiple actions
 *
 * Usage:
 * import { useAuditLog } from './hooks/useAuditLog.js';
 *
 * const { logAction, logError } = useAuditLog();
 *
 * // Log a user action
 * await logAction({
 *   action: 'OKRS_UPDATED',
 *   resourceType: 'okr',
 *   resourceId: okrId,
 *   details: { status: 'active' }
 * });
 *
 * // Log an error
 * await logError({
 *   action: 'API_ERROR',
 *   endpoint: '/api/okrs',
 *   statusCode: 500,
 *   errorMessage: 'Database connection failed'
 * });
 */

import { useCallback, useRef, useEffect } from 'react';
import apiClient from '../utils/apiInterceptor.js';
import { useTenant } from '../contexts/TenantContext.jsx';
import logger from '../utils/logger.js';

/**
 * Audit action constants
 * Maps to backend AuditAction enum
 */
export const FRONTEND_AUDIT_ACTIONS = {
  // Organization events
  ORG_SWITCHED: 'ORG_SWITCHED',
  ORG_SETTINGS_VIEWED: 'ORG_SETTINGS_VIEWED',

  // User actions on data
  OKRS_CREATED: 'OKRS_CREATED',
  OKRS_UPDATED: 'OKRS_UPDATED',
  OKRS_DELETED: 'OKRS_DELETED',
  OKRS_STATUS_CHANGED: 'OKRS_STATUS_CHANGED',

  KPIS_CREATED: 'KPIS_CREATED',
  KPIS_UPDATED: 'KPIS_UPDATED',
  KPIS_DELETED: 'KPIS_DELETED',
  KPIS_DATA_UPDATED: 'KPIS_DATA_UPDATED',

  INITIATIVES_CREATED: 'INITIATIVES_CREATED',
  INITIATIVES_UPDATED: 'INITIATIVES_UPDATED',
  INITIATIVES_DELETED: 'INITIATIVES_DELETED',

  // User management
  USER_INVITED: 'USER_INVITED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',

  // Permission events
  PERMISSION_CHECKED: 'PERMISSION_CHECKED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // UI events
  EXPORT_INITIATED: 'EXPORT_INITIATED',
  REPORT_GENERATED: 'REPORT_GENERATED',

  // Error events
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
};

/**
 * Custom hook for frontend audit logging
 *
 * @returns {Object} Audit logging functions
 *   - logAction(params): Log a user action
 *   - logError(params): Log an error
 *   - logBatch(actions): Log multiple actions
 */
export const useAuditLog = () => {
  const { currentOrgId, isSuperAdmin } = useTenant();
  const userId = useRef(null);
  const clientIP = useRef(null);

  // Initialize user context on mount
  useEffect(() => {
    try {
      // Get user ID from auth context or JWT
      const token = sessionStorage.getItem('sb-auth-token');
      if (token) {
        // Decode JWT to get user ID
        const parts = token.split('.');
        if (parts.length === 3) {
          const decoded = JSON.parse(atob(parts[1]));
          userId.current = decoded.sub || null;
        }
      }

      // Get client IP from headers (would be set by API)
      clientIP.current = getClientIP();
    } catch (error) {
      logger.warn('Failed to initialize audit log context', error);
    }
  }, []);

  /**
   * Log a user action
   *
   * @param {Object} params - Log parameters
   * @param {string} params.action - Action from FRONTEND_AUDIT_ACTIONS
   * @param {string} [params.resourceType] - Type of resource (okr, kpi, user, etc.)
   * @param {string} [params.resourceId] - ID of the resource
   * @param {Object} [params.details] - Additional details
   * @param {string} [params.severity] - Severity level (INFO, WARNING, ERROR, CRITICAL)
   * @returns {Promise<{success: boolean, logId?: string}>}
   */
  const logAction = useCallback(
    async (params = {}) => {
      const {
        action,
        resourceType = null,
        resourceId = null,
        details = {},
        severity = 'INFO',
      } = params;

      // Validation
      if (!action) {
        logger.warn('Audit log missing required action');
        return { success: false };
      }

      if (!currentOrgId) {
        logger.warn('Audit log missing organization context');
        return { success: false };
      }

      try {
        // Log to backend via API
        const response = await apiClient.post('/api/audit-logs', {
          action,
          organizationId: currentOrgId,
          userId: userId.current,
          resourceType,
          resourceId,
          details,
          severity,
          clientIP: clientIP.current,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        });

        if (response.status === 201 || response.status === 200) {
          logger.debug('Audit log recorded', { action, resourceId });
          return { success: true, logId: response.data?.id };
        }

        return { success: false };
      } catch (error) {
        // Fail silently for audit logging errors - don't disrupt user experience
        logger.error('Failed to record audit log', error, { action });
        return { success: false };
      }
    },
    [currentOrgId]
  );

  /**
   * Log an API error
   *
   * @param {Object} params - Error log parameters
   * @param {string} params.action - Action (usually API_ERROR)
   * @param {string} params.endpoint - API endpoint
   * @param {number} params.statusCode - HTTP status code
   * @param {string} params.errorMessage - Error message
   * @param {Object} [params.details] - Additional error details
   * @returns {Promise<{success: boolean}>}
   */
  const logError = useCallback(
    async (params = {}) => {
      const {
        action = FRONTEND_AUDIT_ACTIONS.API_ERROR,
        endpoint,
        statusCode,
        errorMessage,
        details = {},
      } = params;

      if (!endpoint || !statusCode) {
        logger.warn('Error audit log missing required fields');
        return { success: false };
      }

      return logAction({
        action,
        resourceType: 'api',
        resourceId: endpoint,
        details: {
          endpoint,
          statusCode,
          errorMessage,
          ...details,
        },
        severity: statusCode >= 500 ? 'ERROR' : 'WARNING',
      });
    },
    [logAction]
  );

  /**
   * Log multiple actions in batch
   *
   * @param {Array<Object>} actions - Array of action objects
   * @returns {Promise<Array<{success: boolean}>>} Results for each action
   */
  const logBatch = useCallback(
    async (actions = []) => {
      if (!Array.isArray(actions) || actions.length === 0) {
        return [];
      }

      try {
        const results = await Promise.allSettled(
          actions.map((action) => logAction(action))
        );

        return results.map((result) =>
          result.status === 'fulfilled'
            ? result.value
            : { success: false }
        );
      } catch (error) {
        logger.error('Batch audit logging failed', error);
        return actions.map(() => ({ success: false }));
      }
    },
    [logAction]
  );

  /**
   * Log organization switch
   *
   * @param {string} fromOrgId - Previous organization ID
   * @param {string} toOrgId - New organization ID
   * @returns {Promise<{success: boolean}>}
   */
  const logOrgSwitch = useCallback(
    async (fromOrgId, toOrgId) => {
      // Use toOrgId for the organization context since we're switching to it
      const prevOrgId = currentOrgId;

      try {
        const response = await apiClient.post('/api/audit-logs', {
          action: FRONTEND_AUDIT_ACTIONS.ORG_SWITCHED,
          organizationId: toOrgId,
          userId: userId.current,
          resourceType: 'organization',
          resourceId: toOrgId,
          details: {
            fromOrgId,
            toOrgId,
          },
          severity: 'INFO',
          clientIP: clientIP.current,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        });

        return {
          success: response.status === 201 || response.status === 200,
        };
      } catch (error) {
        logger.error('Failed to log organization switch', error);
        return { success: false };
      }
    },
    [currentOrgId]
  );

  /**
   * Log permission check result (useful for debugging access issues)
   *
   * @param {string} permission - Permission that was checked
   * @param {boolean} granted - Whether permission was granted
   * @param {Object} [context] - Additional context
   * @returns {Promise<{success: boolean}>}
   */
  const logPermissionCheck = useCallback(
    async (permission, granted, context = {}) => {
      // Only log denied permissions and super admin checks
      if (granted && !isSuperAdmin) {
        return { success: true };
      }

      return logAction({
        action: granted
          ? FRONTEND_AUDIT_ACTIONS.PERMISSION_CHECKED
          : FRONTEND_AUDIT_ACTIONS.PERMISSION_DENIED,
        resourceType: 'permission',
        resourceId: permission,
        details: {
          permission,
          granted,
          ...context,
        },
        severity: granted ? 'INFO' : 'WARNING',
      });
    },
    [logAction, isSuperAdmin]
  );

  return {
    logAction,
    logError,
    logBatch,
    logOrgSwitch,
    logPermissionCheck,
  };
};

/**
 * Helper function to get client IP
 * In production, this would come from the backend
 *
 * @returns {string|null} Client IP address or null
 */
const getClientIP = () => {
  // This would typically come from a header set by the server
  // For now, we use a placeholder
  return null;
};

export default useAuditLog;
