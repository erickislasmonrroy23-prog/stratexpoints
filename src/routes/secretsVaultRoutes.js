/**
 * Secrets Vault Service Routes
 * Express route handlers for secrets vault operations
 * Endpoints: store, retrieve, rotate, list, status, versions, access logs
 */

import express from 'express';
import logger from '../utils/logger.js';
import * as secretsVault from '../services/secretsVaultService.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';
import { logSecretAccess } from '../middleware/auditMiddleware.js';

const router = express.Router();

/**
 * POST /api/secrets/store
 * Store a new secret in the vault
 */
router.post('/store', authenticateRequest, logSecretAccess, (req, res) => {
  try {
    const { secretName, secretValue, metadata } = req.body;

    if (!secretName || !secretValue) {
      return res.status(400).json({
        success: false,
        error: 'secretName and secretValue are required',
      });
    }

    const result = secretsVault.storeSecret(secretName, secretValue, metadata);

    logger.info('[SecretsVaultRoutes] Secret stored via API', {
      secretName,
      user: req.user?.id,
      result: result.success ? 'success' : 'failed',
    });

    return res.status(result.success ? 201 : 400).json(result);
  } catch (err) {
    logger.error('[SecretsVaultRoutes] Exception storing secret', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to store secret',
    });
  }
});

/**
 * GET /api/secrets/retrieve/:secretName
 * Retrieve a secret from the vault with access control
 */
router.get('/retrieve/:secretName', authenticateRequest, logSecretAccess, (req, res) => {
  try {
    const { secretName } = req.params;
    const userRole = req.user?.role || 'user';
    const userId = req.user?.id;

    const result = secretsVault.retrieveSecret(secretName, userRole, userId);

    logger.info('[SecretsVaultRoutes] Secret retrieved via API', {
      secretName,
      user: userId,
      success: result.success,
    });

    if (!result.success) {
      return res.status(403).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    logger.error('[SecretsVaultRoutes] Exception retrieving secret', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve secret',
    });
  }
});

/**
 * POST /api/secrets/rotate/:secretName
 * Rotate a secret to a new value
 */
router.post('/rotate/:secretName', authenticateRequest, logSecretAccess, (req, res) => {
  try {
    const { secretName } = req.params;
    const { newValue } = req.body;

    if (!newValue) {
      return res.status(400).json({
        success: false,
        error: 'newValue is required',
      });
    }

    const result = secretsVault.rotateSecret(secretName, newValue);

    logger.info('[SecretsVaultRoutes] Secret rotated via API', {
      secretName,
      user: req.user?.id,
      result: result.success ? 'success' : 'failed',
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    logger.error('[SecretsVaultRoutes] Exception rotating secret', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to rotate secret',
    });
  }
});

/**
 * POST /api/secrets/schedule-rotation/:secretName
 * Schedule automatic secret rotation
 */
router.post('/schedule-rotation/:secretName', authenticateRequest, (req, res) => {
  try {
    const { secretName } = req.params;
    const { intervalDays } = req.body;

    const result = secretsVault.scheduleSecretRotation(secretName, intervalDays || 90);

    logger.info('[SecretsVaultRoutes] Secret rotation scheduled via API', {
      secretName,
      intervalDays: intervalDays || 90,
      user: req.user?.id,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    logger.error('[SecretsVaultRoutes] Exception scheduling rotation', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to schedule rotation',
    });
  }
});

/**
 * GET /api/secrets/status
 * Get vault status and metrics
 */
router.get('/status', authenticateRequest, (req, res) => {
  try {
    const result = secretsVault.getVaultStatus();

    return res.status(200).json(result);
  } catch (err) {
    logger.error('[SecretsVaultRoutes] Exception getting vault status', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to get vault status',
    });
  }
});

/**
 * GET /api/secrets/versions/:secretName
 * Get all versions of a secret
 */
router.get('/versions/:secretName', authenticateRequest, (req, res) => {
  try {
    const { secretName } = req.params;

    const result = secretsVault.getSecretVersions(secretName);

    return res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    logger.error('[SecretsVaultRoutes] Exception getting secret versions', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to get secret versions',
    });
  }
});

/**
 * GET /api/secrets/access-logs
 * Get secret access logs
 */
router.get('/access-logs', authenticateRequest, (req, res) => {
  try {
    const { secretName, limit } = req.query;

    const result = secretsVault.getAccessLogs(secretName || null, parseInt(limit) || 100);

    return res.status(200).json(result);
  } catch (err) {
    logger.error('[SecretsVaultRoutes] Exception getting access logs', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to get access logs',
    });
  }
});

export default router;
