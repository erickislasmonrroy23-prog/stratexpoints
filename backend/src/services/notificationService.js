/**
 * Notification Service
 * FASE 7: Manages rotation notifications and notification lifecycle
 */

import { query } from '../utils/database.js';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from '../middleware/errorHandler.js';

/**
 * Get notifications for a user/organization
 * @param {string} organizationId - Organization ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Notifications with pagination
 */
export async function getNotifications(organizationId, options = {}) {
  const { limit = 50, offset = 0, notificationType = null, unreadOnly = false } = options;

  let whereClause = 'rn.organization_id = $1';
  const params = [organizationId];
  let paramIndex = 2;

  if (notificationType) {
    whereClause += ` AND rn.notification_type = $${paramIndex}`;
    params.push(notificationType);
    paramIndex++;
  }

  if (unreadOnly) {
    whereClause += ` AND rn.read_at IS NULL`;
  }

  try {
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM rotation_notifications rn WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get notifications with pagination
    const notificationsResult = await query(
      `SELECT
        rn.id,
        rn.organization_id,
        rn.user_id,
        rn.secret_id,
        rn.notification_type,
        rn.message,
        rn.read_at,
        rn.created_at,
        s.name as secret_name
      FROM rotation_notifications rn
      LEFT JOIN secrets s ON rn.secret_id = s.id
      WHERE ${whereClause}
      ORDER BY rn.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      notifications: notificationsResult.rows,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };
  } catch (error) {
    throw new Error(`Failed to retrieve notifications: ${error.message}`);
  }
}

/**
 * Get a single notification
 * @param {string} organizationId - Organization ID
 * @param {string} notificationId - Notification ID
 * @returns {Promise<object>} Notification object
 */
export async function getNotificationById(organizationId, notificationId) {
  try {
    const result = await query(
      `SELECT
        rn.id,
        rn.organization_id,
        rn.user_id,
        rn.secret_id,
        rn.notification_type,
        rn.message,
        rn.read_at,
        rn.created_at,
        s.name as secret_name
      FROM rotation_notifications rn
      LEFT JOIN secrets s ON rn.secret_id = s.id
      WHERE rn.id = $1 AND rn.organization_id = $2`,
      [notificationId, organizationId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Notification not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new Error(`Failed to retrieve notification: ${error.message}`);
  }
}

/**
 * Mark notification as read
 * @param {string} organizationId - Organization ID
 * @param {string} notificationId - Notification ID
 * @returns {Promise<object>} Updated notification
 */
export async function markNotificationAsRead(organizationId, notificationId) {
  try {
    // First verify the notification belongs to this organization
    const existing = await getNotificationById(organizationId, notificationId);

    // Update the notification
    const result = await query(
      `UPDATE rotation_notifications
       SET read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [notificationId, organizationId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Notification not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
}

/**
 * Mark all notifications as read for organization
 * @param {string} organizationId - Organization ID
 * @returns {Promise<object>} Count of updated notifications
 */
export async function markAllNotificationsAsRead(organizationId) {
  try {
    const result = await query(
      `UPDATE rotation_notifications
       SET read_at = CURRENT_TIMESTAMP
       WHERE organization_id = $1 AND read_at IS NULL
       RETURNING id`,
      [organizationId]
    );

    return {
      updatedCount: result.rows.length,
      message: `${result.rows.length} notification(s) marked as read`,
    };
  } catch (error) {
    throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }
}

/**
 * Delete a notification
 * @param {string} organizationId - Organization ID
 * @param {string} notificationId - Notification ID
 * @returns {Promise<object>} Deleted notification info
 */
export async function deleteNotification(organizationId, notificationId) {
  try {
    // First verify the notification belongs to this organization
    const existing = await getNotificationById(organizationId, notificationId);

    // Delete the notification
    const result = await query(
      `DELETE FROM rotation_notifications
       WHERE id = $1 AND organization_id = $2
       RETURNING id, notification_type`,
      [notificationId, organizationId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Notification not found');
    }

    return {
      deletedId: result.rows[0].id,
      notificationType: result.rows[0].notification_type,
      message: 'Notification deleted successfully',
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new Error(`Failed to delete notification: ${error.message}`);
  }
}

/**
 * Delete all notifications for organization
 * @param {string} organizationId - Organization ID
 * @returns {Promise<object>} Count of deleted notifications
 */
export async function deleteAllNotifications(organizationId) {
  try {
    const result = await query(
      `DELETE FROM rotation_notifications
       WHERE organization_id = $1
       RETURNING id`,
      [organizationId]
    );

    return {
      deletedCount: result.rows.length,
      message: `${result.rows.length} notification(s) deleted`,
    };
  } catch (error) {
    throw new Error(`Failed to delete notifications: ${error.message}`);
  }
}

/**
 * Get notification statistics for organization
 * @param {string} organizationId - Organization ID
 * @returns {Promise<object>} Statistics
 */
export async function getNotificationStats(organizationId) {
  try {
    const result = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread,
        COUNT(CASE WHEN notification_type = 'rotation_scheduled' THEN 1 END) as scheduled_count,
        COUNT(CASE WHEN notification_type = 'rotation_completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN notification_type = 'rotation_failed' THEN 1 END) as failed_count
      FROM rotation_notifications
      WHERE organization_id = $1`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      return {
        total: 0,
        unread: 0,
        scheduled_count: 0,
        completed_count: 0,
        failed_count: 0,
      };
    }

    return {
      total: parseInt(result.rows[0].total),
      unread: parseInt(result.rows[0].unread),
      scheduledCount: parseInt(result.rows[0].scheduled_count),
      completedCount: parseInt(result.rows[0].completed_count),
      failedCount: parseInt(result.rows[0].failed_count),
    };
  } catch (error) {
    throw new Error(`Failed to retrieve notification statistics: ${error.message}`);
  }
}

export default {
  getNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getNotificationStats,
};
