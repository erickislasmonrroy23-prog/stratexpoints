/**
 * Key Rotation Management Routes
 * FASE 7: REST endpoints for rotation policies, history, and scheduling
 */

import express from 'express';
import { requireRole } from '../middleware/auth.js';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from '../middleware/errorHandler.js';
import {
  getRotationPolicy,
  updateRotationPolicy,
  rotateNow,
  getRotationHistory,
  getScheduledRotations,
  previewRotation,
  cancelScheduledRotation,
  scheduleRotation,
  getScheduleById,
  getSchedulesForSecret,
  updateSchedule,
} from '../services/rotationService.js';

const router = express.Router();

/**
 * GET /api/keys/scheduled
 * Get all scheduled rotations for the organization
 * Roles: admin, editor, viewer
 * IMPORTANT: This route must come BEFORE /:secretId routes to avoid path parameter conflicts
 */
router.get('/scheduled', requireRole(['admin', 'editor', 'viewer']), async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const { limit = 50, offset = 0 } = req.query;

    const scheduled = await getScheduledRotations(organizationId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: scheduled.schedules,
      pagination: scheduled.pagination,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/keys/:secretId/policy
 * Get rotation policy for a secret
 * Roles: admin, editor, viewer
 */
router.get('/:secretId/policy', requireRole(['admin', 'editor', 'viewer']), async (req, res, next) => {
  try {
    const { secretId } = req.params;
    const organizationId = req.user.organizationId;

    if (!secretId) {
      throw new ValidationError('Secret ID is required');
    }

    const policy = await getRotationPolicy(organizationId, secretId);

    res.json({
      success: true,
      data: policy,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/keys/:secretId/policy
 * Create or update rotation policy for a secret
 * Roles: admin, editor
 */
router.post('/:secretId/policy', requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { secretId } = req.params;
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const updates = req.body;

    if (!secretId) {
      throw new ValidationError('Secret ID is required');
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('At least one field must be updated');
    }

    const policy = await updateRotationPolicy(organizationId, secretId, userId, updates);

    res.json({
      success: true,
      data: policy,
      message: 'Rotation policy updated successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/keys/:secretId/preview
 * Preview what will happen during rotation without actually rotating
 * Roles: admin, editor, viewer
 */
router.get('/:secretId/preview', requireRole(['admin', 'editor', 'viewer']), async (req, res, next) => {
  try {
    const { secretId } = req.params;
    const organizationId = req.user.organizationId;

    if (!secretId) {
      throw new ValidationError('Secret ID is required');
    }

    const preview = await previewRotation(organizationId, secretId);

    res.json({
      success: true,
      data: preview,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/keys/:secretId/rotate
 * Trigger immediate key rotation for a secret
 * Roles: admin, editor
 */
router.post('/:secretId/rotate', requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { secretId } = req.params;
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    if (!secretId) {
      throw new ValidationError('Secret ID is required');
    }

    const result = await rotateNow(organizationId, secretId, userId);

    res.json({
      success: true,
      data: result,
      message: 'Key rotation completed successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/keys/:secretId/schedule
 * Schedule a key rotation for a specific time
 * Roles: admin, editor
 */
router.post('/:secretId/schedule', requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { secretId } = req.params;
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const { scheduledFor } = req.body;

    if (!secretId) {
      throw new ValidationError('Secret ID is required');
    }

    if (!scheduledFor) {
      throw new ValidationError('scheduledFor is required');
    }

    const schedule = await scheduleRotation(organizationId, secretId, userId, scheduledFor);

    res.json({
      success: true,
      data: schedule,
      message: 'Key rotation scheduled successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/keys/:secretId/schedules
 * Get all scheduled rotations for a specific secret
 * Roles: admin, editor, viewer
 */
router.get('/:secretId/schedules', requireRole(['admin', 'editor', 'viewer']), async (req, res, next) => {
  try {
    const { secretId } = req.params;
    const organizationId = req.user.organizationId;
    const { limit = 50, offset = 0 } = req.query;

    if (!secretId) {
      throw new ValidationError('Secret ID is required');
    }

    const result = await getSchedulesForSecret(organizationId, secretId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: result.schedules,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/keys/:secretId/schedule/:scheduleId
 * Get details of a specific scheduled rotation
 * Roles: admin, editor, viewer
 */
router.get('/:secretId/schedule/:scheduleId', requireRole(['admin', 'editor', 'viewer']), async (req, res, next) => {
  try {
    const { secretId, scheduleId } = req.params;
    const organizationId = req.user.organizationId;

    if (!secretId || !scheduleId) {
      throw new ValidationError('Secret ID and Schedule ID are required');
    }

    const schedule = await getScheduleById(organizationId, scheduleId);

    res.json({
      success: true,
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/keys/:secretId/schedule/:scheduleId
 * Update a scheduled rotation
 * Roles: admin, editor
 */
router.put('/:secretId/schedule/:scheduleId', requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { secretId, scheduleId } = req.params;
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const updates = req.body;

    if (!secretId || !scheduleId) {
      throw new ValidationError('Secret ID and Schedule ID are required');
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('At least one field must be updated');
    }

    const schedule = await updateSchedule(organizationId, scheduleId, userId, updates);

    res.json({
      success: true,
      data: schedule,
      message: 'Scheduled rotation updated successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/keys/:secretId/history
 * Get rotation history for a secret with pagination
 * Roles: admin, editor, viewer
 */
router.get('/:secretId/history', requireRole(['admin', 'editor', 'viewer']), async (req, res, next) => {
  try {
    const { secretId } = req.params;
    const organizationId = req.user.organizationId;
    const { limit = 50, offset = 0 } = req.query;

    if (!secretId) {
      throw new ValidationError('Secret ID is required');
    }

    const history = await getRotationHistory(organizationId, secretId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: history.rotations,
      pagination: history.pagination,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/keys/:secretId/schedule/:scheduleId
 * Cancel a scheduled rotation
 * Roles: admin, editor
 */
router.delete('/:secretId/schedule/:scheduleId', requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { secretId, scheduleId } = req.params;
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    if (!secretId || !scheduleId) {
      throw new ValidationError('Secret ID and Schedule ID are required');
    }

    const cancelled = await cancelScheduledRotation(organizationId, scheduleId, userId);

    res.json({
      success: true,
      data: cancelled,
      message: 'Rotation schedule cancelled successfully',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
