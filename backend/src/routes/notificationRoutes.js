/**
 * Notification Management Routes
 * FASE 7: REST endpoints for managing rotation notifications
 */

import express from 'express';
import { requireRole } from '../middleware/auth.js';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from '../middleware/errorHandler.js';
import {
  getNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getNotificationStats,
} from '../services/notificationService.js';

const router = express.Router();

/**
 * GET /api/notifications
 * Get all rotation notifications for the organization
 * Query params:
 *   - type: notification_type filter (rotation_scheduled, rotation_completed, rotation_failed)
 *   - unread: true/false - only unread notifications
 *   - limit: pagination limit (default 50)
 *   - offset: pagination offset (default 0)
 * Roles: admin, editor, viewer
 */
router.get('/', requireRole(['admin', 'editor', 'viewer']), async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const { type = null, unread = false, limit = 50, offset = 0 } = req.query;

    const notifications = await getNotifications(organizationId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      notificationType: type,
      unreadOnly: unread === 'true' || unread === true,
    });

    res.json({
      success: true,
      data: notifications.notifications,
      pagination: notifications.pagination,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notifications/stats
 * Get notification statistics for the organization
 * Returns counts by type and read status
 * Roles: admin, editor, viewer
 * IMPORTANT: This route must come BEFORE /:id routes
 */
router.get('/stats', requireRole(['admin', 'editor', 'viewer']), async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const stats = await getNotificationStats(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notifications/:id
 * Get a specific notification
 * Roles: admin, editor, viewer
 */
router.get('/:id', requireRole(['admin', 'editor', 'viewer']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    if (!id) {
      throw new ValidationError('Notification ID is required');
    }

    const notification = await getNotificationById(organizationId, id);

    res.json({
      success: true,
      data: notification,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:id
 * Mark a notification as read
 * Roles: admin, editor, viewer
 */
router.patch('/:id', requireRole(['admin', 'editor', 'viewer']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const { action } = req.body;

    if (!id) {
      throw new ValidationError('Notification ID is required');
    }

    if (action === 'mark-read') {
      const notification = await markNotificationAsRead(organizationId, id);

      res.json({
        success: true,
        data: notification,
        message: 'Notification marked as read',
      });
    } else {
      throw new ValidationError('Invalid action. Use action: "mark-read"');
    }
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 * Roles: admin, editor
 */
router.delete('/:id', requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    if (!id) {
      throw new ValidationError('Notification ID is required');
    }

    const deleted = await deleteNotification(organizationId, id);

    res.json({
      success: true,
      data: deleted,
      message: deleted.message,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/actions/mark-all-read
 * Mark all notifications as read for the organization
 * Roles: admin, editor
 */
router.post('/actions/mark-all-read', requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;

    const result = await markAllNotificationsAsRead(organizationId);

    res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/notifications
 * Delete all notifications for the organization
 * Roles: admin
 */
router.delete('/', requireRole(['admin']), async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;

    const result = await deleteAllNotifications(organizationId);

    res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
