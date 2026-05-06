/**
 * Audit Logging Middleware
 * Logs security events and sensitive operations for compliance and debugging
 */

import logger from '../utils/logger.js';

/**
 * General security audit logging middleware
 * Logs all requests to security-sensitive endpoints
 */
export const logSecurityAudit = (req, res, next) => {
  try {
    // Store the original send function
    const originalSend = res.send;

    // Override the send function to log response status
    res.send = function (data) {
      logger.info('[AuditLog] Security event', {
        method: req.method,
        endpoint: req.path,
        userId: req.user?.id || 'anonymous',
        userRole: req.user?.role || 'guest',
        ipAddress: req.ip || req.connection.remoteAddress,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString(),
      });

      // Call the original send function
      res.send = originalSend;
      return res.send(data);
    };

    next();
  } catch (err) {
    logger.error('[AuditMiddleware] Exception in security audit logging', {
      error: err.message,
    });
    next();
  }
};

/**
 * Specific middleware for logging secret access
 * Logs all secret retrieval and modification operations
 */
export const logSecretAccess = (req, res, next) => {
  try {
    const startTime = Date.now();

    // Store the original send function
    const originalSend = res.send;

    // Override the send function to log response with duration
    res.send = function (data) {
      const duration = Date.now() - startTime;

      logger.info('[SecretAccessAudit] Secret operation', {
        method: req.method,
        endpoint: req.path,
        secretName: req.params.secretName || req.body?.secretName || 'unknown',
        userId: req.user?.id || 'anonymous',
        userRole: req.user?.role || 'guest',
        ipAddress: req.ip || req.connection.remoteAddress,
        statusCode: res.statusCode,
        success: res.statusCode < 400,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });

      // Call the original send function
      res.send = originalSend;
      return res.send(data);
    };

    next();
  } catch (err) {
    logger.error('[AuditMiddleware] Exception in secret access logging', {
      error: err.message,
    });
    next();
  }
};

/**
 * Middleware for logging lifecycle management operations
 */
export const logLifecycleAudit = (req, res, next) => {
  try {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function (data) {
      const duration = Date.now() - startTime;

      logger.info('[LifecycleAudit] Lifecycle operation', {
        method: req.method,
        endpoint: req.path,
        operation: req.body?.operation || req.params?.action || 'unknown',
        secretId: req.body?.secretId || req.params?.secretId || 'unknown',
        userId: req.user?.id || 'anonymous',
        userRole: req.user?.role || 'guest',
        ipAddress: req.ip || req.connection.remoteAddress,
        statusCode: res.statusCode,
        success: res.statusCode < 400,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });

      res.send = originalSend;
      return res.send(data);
    };

    next();
  } catch (err) {
    logger.error('[AuditMiddleware] Exception in lifecycle audit logging', {
      error: err.message,
    });
    next();
  }
};

export default {
  logSecurityAudit,
  logSecretAccess,
  logLifecycleAudit,
};
