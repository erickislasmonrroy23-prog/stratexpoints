/**
 * Global Error Handler Middleware
 * FASE 6: Centralized error handling and logging
 */

import { query as dbQuery } from '../utils/database.js';

/**
 * Custom Application Error
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date();
  }
}

/**
 * Validation Error
 */
export class ValidationError extends AppError {
  constructor(message, fields = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.fields = fields;
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTH_ERROR');
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'RBAC_DENIED');
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('[ERROR]', {
    message: err.message,
    code: err.code || 'UNKNOWN',
    statusCode: err.statusCode || 500,
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
    organizationId: req.user?.organizationId,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Log to audit trail if error is security-related
  if (err.code && ['RBAC_DENIED', 'AUTH_ERROR', 'FORBIDDEN'].includes(err.code)) {
    try {
      dbQuery(
        `INSERT INTO audit_logs (
          organization_id, user_id, action, resource_type, ip_address, user_agent, status, error_message, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          req.user?.organizationId,
          req.user?.userId,
          'security_event',
          'api_request',
          req.ip,
          req.get('user-agent'),
          'failure',
          err.message,
        ]
      ).catch(logError => console.error('Failed to log security event:', logError));
    } catch (e) {
      // Ignore audit logging failures
    }
  }

  // Build error response
  const statusCode = err.statusCode || 500;
  const response = {
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: err.timestamp || new Date(),
  };

  // Include field validation errors if present
  if (err.fields && Object.keys(err.fields).length > 0) {
    response.fields = err.fields;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Handler
 */
export function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Route not found: ${req.method} ${req.path}`);
  next(error);
}

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
};
