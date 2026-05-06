/**
 * Secrets Lifecycle Service Routes
 * Express route handlers for secrets lifecycle operations
 * Endpoints: provision, deprovision, emergency revocation, status, alerts, access recording
 */

import express from 'express';
import logger from '../utils/logger.js';
import * as secretsLifecycle from '../services/secretsLifecycleService.js';
import { authenticateRequest } from '../middleware/authMiddleware.js';
import { logSecurityAudit } from '../middleware/auditMiddleware.js';

const router = express.Router();

/**
 * POST /api/lifecycle/provision
 * Initiate secret provisioning
 */
router.post('/provision', authenticateRequest, logSecurityAudit, (req, res) => {
  try {
    const { secretId, secretName, type, requestedBy } = req.body;

    if (!secretId || !secretName) {
      return res.status(400).json({
        success: false,
        error: 'secretId and secretName are required',
      });
    }

    const secretMetadata = {
      secretId,
      secretName,
      type: type || 'api-key',
      requestedBy: requestedBy || req.user?.id,
    };

    const result = secretsLifecycle.provisionSecret(secretMetadata);

    logger.info('[SecretsLifecycleRoutes] Secret provisioning initiated via API', {
      secretId,
      secretName,
      user: req.user?.id,
    });

    return res.status(result.success ? 202 : 400).json(result);
  } catch (err) {
    logger.error('[SecretsLifecycleRoutes] Exception provisioning secret', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to provision secret',
    });
  }
});

/**
 * POST /api/lifecycle/complete-provisioning
 * Complete secret provisioning
 */
router.post('/complete-provisioning', authenticateRequest, logSecurityAudit, (req, res) => {
  try {
    const { provisioningId, secretValue } = req.body;

    if (!provisioningId || !secretValue) {
      return res.status(400).json({
        success: false,
        error: 'provisioningId and secretValue are required',
      });
    }

    const result = secretsLifecycle.completeProvisioning(provisioningId, secretValue);

    logger.info('[SecretsLifecycleRoutes] Secret provisioning completed via API', {
      provisioningId,
      user: req.user?.id,
      result: result.success ? 'success' : 'failed',
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    logger.error('[SecretsLifecycleRoutes] Exception completing provisioning', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to complete provisioning',
    });
  }
});

/**
 * POST /api/lifecycle/request-deprovisioning
 * Request secret deprovisioning with grace period
 */
router.post('/request-deprovisioning', authenticateRequest, logSecurityAudit, (req, res) => {
  try {
    const { secretId, reason } = req.body;

    if (!secretId) {
      return res.status(400).json({
        success: false,
        error: 'secretId is required',
      });
    }

    const result = secretsLifecycle.requestDeprovisioning(secretId, reason || '');

    logger.info('[SecretsLifecycleRoutes] Secret deprovisioning requested via API', {
      secretId,
      user: req.user?.id,
      result: result.success ? 'success' : 'failed',
    });

    return res.status(result.success ? 202 : 400).json(result);
  } catch (err) {
    logger.error('[SecretsLifecycleRoutes] Exception requesting deprovisioning', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to request deprovisioning',
    });
  }
});

/**
 * POST /api/lifecycle/complete-deprovisioning
 * Complete secret deprovisioning
 */
router.post('/complete-deprovisioning', authenticateRequest, logSecurityAudit, (req, res) => {
  try {
    const { deprovisioningId } = req.body;

    if (!deprovisioningId) {
      return res.status(400).json({
        success: false,
        error: 'deprovisioningId is required',
      });
    }

    const result = secretsLifecycle.completeDeprovisioning(deprovisioningId);

    logger.info('[SecretsLifecycleRoutes] Secret deprovisioning completed via API', {
      deprovisioningId,
      user: req.user?.id,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    logger.error('[SecretsLifecycleRoutes] Exception completing deprovisioning', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to complete deprovisioning',
    });
  }
});

/**
 * POST /api/lifecycle/emergency-revocation
 * Emergency revocation of a secret
 */
router.post('/emergency-revocation', authenticateRequest, logSecurityAudit, (req, res) => {
  try {
    const { secretId, reason } = req.body;

    if (!secretId) {
      return res.status(400).json({
        success: false,
        error: 'secretId is required',
      });
    }

    const result = secretsLifecycle.emergencyRevocation(secretId, reason || 'Emergency revocation');

    logger.error('[SecretsLifecycleRoutes] EMERGENCY REVOCATION via API', {
      secretId,
      user: req.user?.id,
      reason,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    logger.error('[SecretsLifecycleRoutes] Exception in emergency revocation', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to perform emergency revocation',
    });
  }
});

/**
 * GET /api/lifecycle/status
 * Get lifecycle status and metrics
 */
router.get('/status', authenticateRequest, (req, res) => {
  try {
    const result = secretsLifecycle.getLifecycleStatus();

    return res.status(200).json(result);
  } catch (err) {
    logger.error('[SecretsLifecycleRoutes] Exception getting lifecycle status', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to get lifecycle status',
    });
  }
});

/**
 * GET /api/lifecycle/alerts
 * Get lifecycle alerts
 */
router.get('/alerts', authenticateRequest, (req, res) => {
  try {
    const { severity, limit } = req.query;

    const result = secretsLifecycle.getAlerts(severity || null, parseInt(limit) || 100);

    return res.status(200).json(result);
  } catch (err) {
    logger.error('[SecretsLifecycleRoutes] Exception getting alerts', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to get alerts',
    });
  }
});

/**
 * POST /api/lifecycle/record-access/:secretId
 * Record secret access for lifecycle tracking
 */
router.post('/record-access/:secretId', authenticateRequest, (req, res) => {
  try {
    const { secretId } = req.params;

    const result = secretsLifecycle.recordSecretAccess(secretId);

    logger.info('[SecretsLifecycleRoutes] Secret access recorded', {
      secretId,
      user: req.user?.id,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    logger.error('[SecretsLifecycleRoutes] Exception recording access', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to record access',
    });
  }
});

export default router;
