/**
 * JWT Authentication Middleware
 * FASE 6: Verify JWT tokens and validate user sessions
 */

import jwt from 'jsonwebtoken';
import { query } from '../utils/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * Generate JWT token
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @param {string} role - User role
 * @returns {string} JWT token
 */
export function generateJWT(userId, organizationId, role = 'viewer') {
  return jwt.sign(
    {
      userId,
      organizationId,
      role,
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Generate refresh token
 * @param {string} userId - User ID
 * @param {string} organizationId - Organization ID
 * @returns {string} Refresh token
 */
export function generateRefreshToken(userId, organizationId) {
  return jwt.sign(
    {
      userId,
      organizationId,
      type: 'refresh',
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
}

/**
 * Middleware: Verify JWT token
 * Attaches decoded payload to req.user
 */
export function authMiddleware(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
        code: 'AUTH_MISSING_TOKEN',
      });
    }

    const token = authHeader.substring(7);

    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach to request
    req.user = {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      role: decoded.role,
      type: decoded.type,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        code: 'AUTH_TOKEN_EXPIRED',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'AUTH_INVALID_TOKEN',
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Middleware: Verify organization access
 * Ensures user belongs to the organization
 */
export async function organizationMiddleware(req, res, next) {
  try {
    // Get organization from route params or query
    const organizationId = req.params.orgId || req.query.orgId || req.user.organizationId;

    // Verify user has access to this organization
    if (req.user.organizationId !== organizationId) {
      console.warn(`[SECURITY] User ${req.user.userId} attempted to access org ${organizationId}`);
      return res.status(403).json({
        error: 'Access denied - organization mismatch',
        code: 'RBAC_ORG_DENIED',
      });
    }

    // Attach organization ID to request
    req.organizationId = organizationId;
    next();
  } catch (error) {
    console.error('Organization middleware error:', error);
    return res.status(500).json({
      error: 'Organization validation failed',
      code: 'ORG_VALIDATION_ERROR',
    });
  }
}

/**
 * Middleware: Verify RBAC permissions
 * @param {string[]} allowedRoles - Allowed roles
 */
export function rbacMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    try {
      if (!allowedRoles.includes(req.user.role)) {
        console.warn(
          `[SECURITY] User ${req.user.userId} (${req.user.role}) attempted restricted action: ${req.method} ${req.path}`
        );
        return res.status(403).json({
          error: `Access denied - role '${req.user.role}' not permitted`,
          code: 'RBAC_PERMISSION_DENIED',
        });
      }

      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({
        error: 'RBAC validation failed',
        code: 'RBAC_ERROR',
      });
    }
  };
}

/**
 * Alias for rbacMiddleware - for backward compatibility with rotationRoutes
 * @param {string[]} allowedRoles - Allowed roles
 */
export const requireRole = rbacMiddleware;

/**
 * Middleware: Log authentication events
 */
export async function auditAuthMiddleware(req, res, next) {
  try {
    if (req.user) {
      // Log authentication action to audit trail
      await query(
        `INSERT INTO audit_logs (
          organization_id, user_id, action, resource_type, ip_address, user_agent, status, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          req.user.organizationId,
          req.user.userId,
          'authenticate',
          'session',
          req.ip,
          req.get('user-agent'),
          'success',
        ]
      );
    }
    next();
  } catch (error) {
    console.error('Audit auth middleware error:', error);
    // Don't fail request if audit logging fails
    next();
  }
}

export default {
  generateJWT,
  generateRefreshToken,
  authMiddleware,
  organizationMiddleware,
  rbacMiddleware,
  requireRole,
  auditAuthMiddleware,
};
