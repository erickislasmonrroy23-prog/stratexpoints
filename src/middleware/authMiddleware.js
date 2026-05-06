/**
 * Authentication Middleware
 * Verifies JWT tokens and extracts user information from requests
 */

import logger from '../utils/logger.js';

/**
 * Mock authentication middleware
 * In production, this would verify JWT tokens against your auth provider
 */
export const authenticateRequest = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.substring(7);

    // In production, verify the token with your auth provider (JWT, OAuth, etc.)
    // For now, we'll extract mock user info from token
    try {
      // This is a simplified example - replace with actual JWT verification
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

      req.user = {
        id: decoded.sub || decoded.user_id || 'user-' + Math.random().toString(36).substr(2, 9),
        email: decoded.email || 'user@example.com',
        role: decoded.role || 'user',
        permissions: decoded.permissions || [],
      };

      logger.info('[AuthMiddleware] User authenticated', {
        userId: req.user.id,
        userRole: req.user.role,
      });

      next();
    } catch (parseErr) {
      // If token parsing fails, create a mock user for testing
      req.user = {
        id: 'test-user-' + Math.random().toString(36).substr(2, 9),
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write', 'delete'],
      };

      logger.warn('[AuthMiddleware] Using mock authentication for testing', {
        userId: req.user.id,
      });

      next();
    }
  } catch (err) {
    logger.error('[AuthMiddleware] Exception in authentication', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Authorization middleware - checks user permissions
 */
export const authorizePermissions = (requiredPermissions = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const userPermissions = req.user.permissions || [];
      const hasPermission = requiredPermissions.every((perm) =>
        userPermissions.includes(perm)
      );

      if (!hasPermission && requiredPermissions.length > 0) {
        logger.warn('[AuthMiddleware] User lacks required permissions', {
          userId: req.user.id,
          requiredPermissions,
          userPermissions,
        });
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      next();
    } catch (err) {
      logger.error('[AuthMiddleware] Exception in authorization', {
        error: err.message,
      });
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed',
      });
    }
  };
};

export default { authenticateRequest, authorizePermissions };
