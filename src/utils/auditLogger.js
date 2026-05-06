/**
 * Comprehensive Audit Logging System for StratexPoints
 *
 * Logs all critical business operations and state changes for:
 * - Security monitoring
 * - Compliance reporting
 * - Troubleshooting
 * - User activity tracking
 * - Data change history
 *
 * Features:
 * - Organization-scoped logging (tenant isolation)
 * - Automatic context collection (user, IP, timestamp)
 * - Structured log format
 * - Async logging (non-blocking)
 * - Error handling and fallback
 * - Different log levels (INFO, WARNING, ERROR, CRITICAL)
 *
 * Usage:
 * import { auditLog, AuditAction } from './utils/auditLogger.js';
 *
 * // Log user login
 * await auditLog({
 *   action: AuditAction.USER_LOGIN,
 *   organizationId: user.organization_id,
 *   userId: user.id,
 *   details: { method: 'password', ip: clientIP }
 * });
 *
 * // Log data modification
 * await auditLog({
 *   action: AuditAction.OKRS_UPDATED,
 *   organizationId: orgId,
 *   userId: userId,
 *   resourceId: okrId,
 *   details: { changes: { status: 'draft' -> 'active' } },
 *   severity: 'INFO'
 * });
 */

import { supabase } from '../supabase.js';
import logger from './logger.js';

/**
 * Enumeration of auditable actions
 * Grouped by category for easier filtering and analysis
 */
export const AuditAction = {
  // Authentication events
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',
  MFA_VERIFIED: 'MFA_VERIFIED',
  MFA_FAILED: 'MFA_FAILED',

  // User management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_INVITED: 'USER_INVITED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',

  // Organization management
  ORGANIZATION_CREATED: 'ORGANIZATION_CREATED',
  ORGANIZATION_UPDATED: 'ORGANIZATION_UPDATED',
  ORGANIZATION_DELETED: 'ORGANIZATION_DELETED',
  ORGANIZATION_SETTINGS_CHANGED: 'ORGANIZATION_SETTINGS_CHANGED',

  // OKR operations
  OKRS_CREATED: 'OKRS_CREATED',
  OKRS_UPDATED: 'OKRS_UPDATED',
  OKRS_DELETED: 'OKRS_DELETED',
  OKRS_STATUS_CHANGED: 'OKRS_STATUS_CHANGED',

  // KPI operations
  KPIS_CREATED: 'KPIS_CREATED',
  KPIS_UPDATED: 'KPIS_UPDATED',
  KPIS_DELETED: 'KPIS_DELETED',
  KPIS_DATA_UPDATED: 'KPIS_DATA_UPDATED',

  // Initiative operations
  INITIATIVES_CREATED: 'INITIATIVES_CREATED',
  INITIATIVES_UPDATED: 'INITIATIVES_UPDATED',
  INITIATIVES_DELETED: 'INITIATIVES_DELETED',
  INITIATIVES_STATUS_CHANGED: 'INITIATIVES_STATUS_CHANGED',

  // Access control
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_REVOKED: 'PERMISSION_REVOKED',
  ACCESS_DENIED: 'ACCESS_DENIED',

  // System operations
  API_ERROR: 'API_ERROR',
  BACKUP_CREATED: 'BACKUP_CREATED',
  DATA_EXPORTED: 'DATA_EXPORTED',
  INTEGRATION_CONNECTED: 'INTEGRATION_CONNECTED',
  INTEGRATION_DISCONNECTED: 'INTEGRATION_DISCONNECTED',

  // Security events
  SUSPICIOUS_ACTIVITY_DETECTED: 'SUSPICIOUS_ACTIVITY_DETECTED',
  SECURITY_POLICY_CHANGED: 'SECURITY_POLICY_CHANGED',
  FIREWALL_RULE_CHANGED: 'FIREWALL_RULE_CHANGED',
};

/**
 * Audit log severity levels
 */
export const AuditSeverity = {
  INFO: 'INFO', // Routine operations
  WARNING: 'WARNING', // Unusual but not harmful
  ERROR: 'ERROR', // Failed operations
  CRITICAL: 'CRITICAL', // Security-sensitive events
};

/**
 * Main audit logging function
 * Logs actions to the audit_logs table with automatic context
 *
 * @param {Object} params - Audit log parameters
 * @param {string} params.action - Action from AuditAction enum
 * @param {string} params.organizationId - Organization context (for tenant isolation)
 * @param {string} params.userId - User performing the action
 * @param {string} [params.resourceType] - Type of resource affected (okr, kpi, user, etc.)
 * @param {string} [params.resourceId] - ID of the specific resource
 * @param {Object} [params.details] - Additional details (changes, metadata, context)
 * @param {string} [params.severity] - Log severity (INFO, WARNING, ERROR, CRITICAL)
 * @param {string} [params.clientIP] - Client IP address
 * @param {string} [params.userAgent] - User agent string
 * @returns {Promise<{success: boolean, logId?: string, error?: string}>}
 */
export const auditLog = async (params = {}) => {
  const {
    action,
    organizationId,
    userId,
    resourceType = null,
    resourceId = null,
    details = {},
    severity = AuditSeverity.INFO,
    clientIP = null,
    userAgent = null,
  } = params;

  // Validation
  if (!action || !organizationId || !userId) {
    logger.warn('Audit log missing required fields', {
      action,
      organizationId,
      userId,
    });
    return { success: false, error: 'Missing required fields' };
  }

  try {
    // Prepare audit log entry
    const auditEntry = {
      organization_id: organizationId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: JSON.stringify(details),
      severity,
      client_ip: clientIP,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
    };

    // Insert audit log using service role
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([auditEntry])
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to insert audit log', error, {
        action,
        organizationId,
      });
      return { success: false, error: error.message };
    }

    return { success: true, logId: data?.id };
  } catch (error) {
    logger.error('Audit logging exception', error, { action, organizationId });
    return { success: false, error: error.message };
  }
};

/**
 * Log user authentication events
 *
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @param {string} action - AUTH_ACTION (LOGIN, LOGOUT, FAILED_LOGIN, etc.)
 * @param {Object} details - Additional context (method, ip, device, etc.)
 * @returns {Promise<{success: boolean}>}
 */
export const auditAuthEvent = async (userId, organizationId, action, details = {}) => {
  return await auditLog({
    action,
    organizationId,
    userId,
    resourceType: 'auth',
    details,
    severity:
      action.includes('FAILED') || action.includes('DENIED')
        ? AuditSeverity.WARNING
        : AuditSeverity.INFO,
  });
};

/**
 * Log data modification events
 *
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @param {string} action - MODIFY_ACTION (CREATED, UPDATED, DELETED)
 * @param {string} resourceType - Resource type (okr, kpi, initiative, user, etc.)
 * @param {string} resourceId - Resource ID
 * @param {Object} changes - Before/after or change details
 * @returns {Promise<{success: boolean}>}
 */
export const auditDataModification = async (
  userId,
  organizationId,
  action,
  resourceType,
  resourceId,
  changes = {}
) => {
  return await auditLog({
    action,
    organizationId,
    userId,
    resourceType,
    resourceId,
    details: { changes },
    severity: AuditSeverity.INFO,
  });
};

/**
 * Log security-sensitive events
 *
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @param {string} action - SECURITY_ACTION
 * @param {Object} details - Security event details
 * @returns {Promise<{success: boolean}>}
 */
export const auditSecurityEvent = async (userId, organizationId, action, details = {}) => {
  return await auditLog({
    action,
    organizationId,
    userId,
    resourceType: 'security',
    details,
    severity: AuditSeverity.CRITICAL,
  });
};

/**
 * Log API errors
 *
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @param {string} endpoint - API endpoint
 * @param {number} statusCode - HTTP status code
 * @param {string} errorMessage - Error message
 * @returns {Promise<{success: boolean}>}
 */
export const auditAPIError = async (userId, organizationId, endpoint, statusCode, errorMessage) => {
  return await auditLog({
    action: AuditAction.API_ERROR,
    organizationId,
    userId,
    resourceType: 'api',
    resourceId: endpoint,
    details: {
      endpoint,
      statusCode,
      errorMessage,
    },
    severity: statusCode >= 500 ? AuditSeverity.ERROR : AuditSeverity.WARNING,
  });
};

/**
 * Retrieve audit logs with filtering
 *
 * @param {Object} params - Query parameters
 * @param {string} params.organizationId - Filter by organization
 * @param {string} [params.userId] - Filter by user
 * @param {string} [params.action] - Filter by action
 * @param {string} [params.resourceType] - Filter by resource type
 * @param {string} [params.severity] - Filter by severity
 * @param {string} [params.startDate] - Filter by start date (ISO 8601)
 * @param {string} [params.endDate] - Filter by end date (ISO 8601)
 * @param {number} [params.limit] - Number of records to fetch (default: 100)
 * @param {number} [params.offset] - Pagination offset (default: 0)
 * @returns {Promise<{logs: Object[], total: number, error?: string}>}
 */
export const getAuditLogs = async (params = {}) => {
  const {
    organizationId,
    userId = null,
    action = null,
    resourceType = null,
    severity = null,
    startDate = null,
    endDate = null,
    limit = 100,
    offset = 0,
  } = params;

  if (!organizationId) {
    return { logs: [], total: 0, error: 'organizationId is required' };
  }

  try {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    // Apply filters
    if (userId) query = query.eq('user_id', userId);
    if (action) query = query.eq('action', action);
    if (resourceType) query = query.eq('resource_type', resourceType);
    if (severity) query = query.eq('severity', severity);

    // Date range filters
    if (startDate) query = query.gte('timestamp', startDate);
    if (endDate) query = query.lte('timestamp', endDate);

    // Pagination and sorting
    query = query.order('timestamp', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to retrieve audit logs', error);
      return { logs: [], total: 0, error: error.message };
    }

    return { logs: data || [], total: count || 0 };
  } catch (error) {
    logger.error('Audit log retrieval exception', error);
    return { logs: [], total: 0, error: error.message };
  }
};

/**
 * Generate audit report for a date range
 *
 * @param {Object} params - Report parameters
 * @param {string} params.organizationId - Organization ID
 * @param {string} params.startDate - Start date (ISO 8601)
 * @param {string} params.endDate - End date (ISO 8601)
 * @param {string} [params.groupBy] - Group by field (action, user_id, severity)
 * @returns {Promise<{summary: Object, logs: Object[], error?: string}>}
 */
export const generateAuditReport = async (params = {}) => {
  const { organizationId, startDate, endDate, groupBy = null } = params;

  if (!organizationId || !startDate || !endDate) {
    return { summary: {}, logs: [], error: 'Missing required parameters' };
  }

  try {
    // Fetch all logs for the date range
    const { logs, error } = await getAuditLogs({
      organizationId,
      startDate,
      endDate,
      limit: 10000, // Large limit for report
    });

    if (error) {
      return { summary: {}, logs: [], error };
    }

    // Generate summary
    const summary = {
      totalEvents: logs.length,
      dateRange: { startDate, endDate },
      eventsByAction: {},
      eventsBySeverity: {},
      eventsByUser: {},
      eventsByResourceType: {},
    };

    // Aggregate data
    logs.forEach((log) => {
      // By action
      summary.eventsByAction[log.action] = (summary.eventsByAction[log.action] || 0) + 1;

      // By severity
      summary.eventsBySeverity[log.severity] = (summary.eventsBySeverity[log.severity] || 0) + 1;

      // By user
      summary.eventsByUser[log.user_id] = (summary.eventsByUser[log.user_id] || 0) + 1;

      // By resource type
      if (log.resource_type) {
        summary.eventsByResourceType[log.resource_type] =
          (summary.eventsByResourceType[log.resource_type] || 0) + 1;
      }
    });

    return {
      summary,
      logs: groupBy ? logs : [],
    };
  } catch (error) {
    logger.error('Audit report generation failed', error);
    return { summary: {}, logs: [], error: error.message };
  }
};

export default {
  auditLog,
  auditAuthEvent,
  auditDataModification,
  auditSecurityEvent,
  auditAPIError,
  getAuditLogs,
  generateAuditReport,
  AuditAction,
  AuditSeverity,
};
