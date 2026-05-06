/**
 * Key Rotation Service Routes
 * Express route handlers for key rotation operations
 * Endpoints: perform rotation, retire version, rotation status, pending rotations, history
 */

import express from 'express';
import logger from '../utils/logger.js';
import * as keyRotation from '../services/keyRotationService.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';
import { logSecurityAudit } from '../middleware/auditMiddleware.js';

const router = express.Router();

/**
 * POST /api/keys/rotate
 * Perform key rotation
 */
router.post('/rotate', authenticateRequest, logSecurityAudit, (req, res) => {
  try {
    const { keyId, newKeyValue } = req.body;

    if (!keyId || !newKeyValue) {
      return res.status(400).json({
        success: false,
        error: 'keyId and newKeyValue are required',
      });
    }

    const result = keyRotation.performKeyRotation(keyId, newKeyValue);

    logger.info('[KeyRotationRoutes] Key rotated via API', {
      keyId,
      user: req.user?.id,
      result: result.success ? 'success' : 'failed',
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    logger.error('[KeyRotationRoutes] Exception performing rotation', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to perform key rotation',
    });
  }
});

/**
 * POST /api/keys/retire
 * Retire an old key version
 */
router.post('/retire', authenticateRequest, logSecurityAudit, (req, res) => {
  try {
    const { keyId, version } = req.body;

    if (!keyId || !version) {
      return res.status(400).json({
        success: false,
        error: 'keyId and version are required',
      });
    }

    const result = keyRotation.retireKeyVersion(keyId, version);

    logger.info('[KeyRotationRoutes] Key version retired via API', {
      keyId,
      version,
      user: req.user?.id,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    logger.error('[KeyRotationRoutes] Exception retiring key version', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to retire key version',
    });
  }
});

/**
 * GET /api/keys/status
 * Get rotation status for all keys
 */
router.get('/status', authenticateRequest, (req, res) => {
  try {
    const result = keyRotation.getRotationStatus();

    return res.status(200).json(result);
  } catch (err) {
    logger.error('[KeyRotationRoutes] Exception getting rotation status', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to get rotation status',
    });
  }
});

/**
 * GET /api/keys/pending
 * Get pending key rotations
 */
router.get('/pending', authenticateRequest, (req, res) => {
  try {
    const result = keyRotation.getPendingRotations();

    return res.status(200).json(result);
  } catch (err) {
    logger.error('[KeyRotationRoutes] Exception getting pending rotations', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to get pending rotations',
    });
  }
});

/**
 * GET /api/keys/history
 * Get key rotation history
 */
router.get('/history', authenticateRequest, (req, res) => {
  try {
    const { keyId, limit } = req.query;

    const result = keyRotation.getRotationHistory(keyId || null, parseInt(limit) || 100);

    return res.status(200).json(result);
  } catch (err) {
    logger.error('[KeyRotationRoutes] Exception getting rotation history', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to get rotation history',
    });
  }
});

/**
 * GET /api/keys/history/:keyId
 * Get rotation history for a specific key
 */
router.get('/history/:keyId', authenticateRequest, (req, res) => {
  try {
    const { keyId } = req.params;
    const { limit } = req.query;

    const result = keyRotation.getRotationHistory(keyId, parseInt(limit) || 100);

    return res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    logger.error('[KeyRotationRoutes] Exception getting key-specific history', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to get key history',
    });
  }
});

export default router;
