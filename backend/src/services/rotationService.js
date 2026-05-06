/**
 * Key Rotation Management Service
 * FASE 7: Business logic for rotation policies, execution, and tracking
 */

import { query, getClient } from '../utils/database.js';
import { ValidationError, NotFoundError, AuthorizationError } from '../middleware/errorHandler.js';
import crypto from 'crypto';

/**
 * Get rotation policy for a secret
 * @param {string} organizationId - Organization ID
 * @param {string} secretId - Secret ID
 * @returns {Promise<object>} Rotation policy
 */
export async function getRotationPolicy(organizationId, secretId) {
  const result = await query(
    `SELECT * FROM key_rotation_policies
     WHERE organization_id = $1 AND secret_id = $2`,
    [organizationId, secretId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Rotation policy not found');
  }

  return result.rows[0];
}

/**
 * Create or update rotation policy
 * @param {string} organizationId - Organization ID
 * @param {string} secretId - Secret ID
 * @param {string} userId - User making the change
 * @param {object} updates - Policy updates
 * @returns {Promise<object>} Updated policy
 */
export async function updateRotationPolicy(organizationId, secretId, userId, updates) {
  const allowedFields = [
    'enabled',
    'rotation_frequency',
    'rotation_interval_days',
    'auto_rotate',
    'notification_days_before',
    'max_versions_to_keep',
  ];

  // Validate that only allowed fields are being updated
  const updateKeys = Object.keys(updates);
  const invalidKeys = updateKeys.filter(key => !allowedFields.includes(key));

  if (invalidKeys.length > 0) {
    throw new ValidationError(`Invalid fields: ${invalidKeys.join(', ')}`);
  }

  // Validate field values
  if (updates.rotation_interval_days !== undefined && updates.rotation_interval_days < 1) {
    throw new ValidationError('rotation_interval_days must be at least 1');
  }

  if (updates.max_versions_to_keep !== undefined && updates.max_versions_to_keep < 1) {
    throw new ValidationError('max_versions_to_keep must be at least 1');
  }

  if (updates.notification_days_before !== undefined && updates.notification_days_before < 0) {
    throw new ValidationError('notification_days_before cannot be negative');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Check if policy exists
    const existing = await client.query(
      `SELECT id FROM key_rotation_policies
       WHERE organization_id = $1 AND secret_id = $2`,
      [organizationId, secretId]
    );

    let policy;

    if (existing.rows.length > 0) {
      // Update existing policy
      const setClause = updateKeys
        .map((key, idx) => `${key} = $${idx + 3}`)
        .join(', ');

      const values = updateKeys.map(key => updates[key]);
      const secretIdParamNum = 3 + updateKeys.length;

      const sqlQuery = 'UPDATE key_rotation_policies\n' +
        '         SET ' + setClause + ', updated_by = $2, updated_at = CURRENT_TIMESTAMP\n' +
        '         WHERE organization_id = $1 AND secret_id = $' + secretIdParamNum + '\n' +
        '         RETURNING *';

      const result = await client.query(
        sqlQuery,
        [organizationId, userId, ...values, secretId]
      );

      policy = result.rows[0];

      // Log audit entry
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, status, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [organizationId, userId, 'update_rotation_policy', 'rotation_policy', policy.id, 'success']
      );
    } else {
      // Create new policy with defaults
      const policyData = {
        enabled: false,
        rotation_frequency: 'monthly',
        rotation_interval_days: 30,
        auto_rotate: false,
        notification_days_before: 7,
        max_versions_to_keep: 5,
        ...updates,
      };

      const result = await client.query(
        `INSERT INTO key_rotation_policies
         (organization_id, secret_id, enabled, rotation_frequency, rotation_interval_days,
          auto_rotate, notification_days_before, max_versions_to_keep, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          organizationId,
          secretId,
          policyData.enabled,
          policyData.rotation_frequency,
          policyData.rotation_interval_days,
          policyData.auto_rotate,
          policyData.notification_days_before,
          policyData.max_versions_to_keep,
          userId,
          userId,
        ]
      );

      policy = result.rows[0];

      // Log audit entry
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, status, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [organizationId, userId, 'create_rotation_policy', 'rotation_policy', policy.id, 'success']
      );
    }

    await client.query('COMMIT');
    return policy;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Preview rotation without actually executing it
 * @param {string} organizationId - Organization ID
 * @param {string} secretId - Secret ID
 * @returns {Promise<object>} Preview of what will happen
 */
export async function previewRotation(organizationId, secretId) {
  // Get the secret
  const secretResult = await query(
    `SELECT id, encryption_key_id FROM secrets WHERE id = $1 AND organization_id = $2`,
    [secretId, organizationId]
  );

  if (secretResult.rows.length === 0) {
    throw new NotFoundError('Secret not found');
  }

  const secret = secretResult.rows[0];

  // Get rotation policy
  const policyResult = await query(
    `SELECT * FROM key_rotation_policies WHERE secret_id = $1 AND organization_id = $2`,
    [secretId, organizationId]
  );

  if (policyResult.rows.length === 0) {
    throw new NotFoundError('No rotation policy configured for this secret');
  }

  const policy = policyResult.rows[0];

  // Get current encryption key
  const keyResult = await query(
    `SELECT id, algorithm FROM encryption_keys WHERE id = $1`,
    [secret.encryption_key_id]
  );

  if (keyResult.rows.length === 0) {
    throw new NotFoundError('Encryption key not found');
  }

  const currentKey = keyResult.rows[0];

  return {
    secretId,
    currentKeyId: currentKey.id,
    algorithm: currentKey.algorithm,
    rotationFrequency: policy.rotation_frequency,
    rotationIntervalDays: policy.rotation_interval_days,
    nextRotationScheduled: policy.next_rotation_at,
    lastRotation: policy.last_rotated_at,
    willCreateNewKey: true,
    estimatedDowntime: '< 1 second',
    affectedSecrets: 1,
  };
}

/**
 * Execute immediate key rotation
 * @param {string} organizationId - Organization ID
 * @param {string} secretId - Secret ID
 * @param {string} userId - User initiating rotation
 * @returns {Promise<object>} Rotation result
 */
export async function rotateNow(organizationId, secretId, userId) {
  const client = await getClient();
  const startTime = Date.now();

  try {
    await client.query('BEGIN');

    // Get the secret
    const secretResult = await client.query(
      `SELECT id, encryption_key_id FROM secrets WHERE id = $1 AND organization_id = $2`,
      [secretId, organizationId]
    );

    if (secretResult.rows.length === 0) {
      throw new NotFoundError('Secret not found');
    }

    const secret = secretResult.rows[0];

    // Get rotation policy
    const policyResult = await client.query(
      `SELECT * FROM key_rotation_policies WHERE secret_id = $1 AND organization_id = $2`,
      [secretId, organizationId]
    );

    if (policyResult.rows.length === 0) {
      throw new NotFoundError('No rotation policy configured for this secret');
    }

    const policy = policyResult.rows[0];

    // Get current encryption key details
    const oldKeyResult = await client.query(
      `SELECT * FROM encryption_keys WHERE id = $1`,
      [secret.encryption_key_id]
    );

    if (oldKeyResult.rows.length === 0) {
      throw new NotFoundError('Current encryption key not found');
    }

    const oldKey = oldKeyResult.rows[0];

    // Generate new encryption key (256-bit for AES-256)
    const newKeyId = crypto.randomUUID();
    const keySize = 256; // bits
    const newKeyData = crypto.randomBytes(keySize / 8).toString('hex');
    const newKeyHash = crypto.createHash('sha256').update(newKeyData).digest('hex');

    // Insert new encryption key
    await client.query(
      `INSERT INTO encryption_keys
       (id, organization_id, key_name, algorithm, key_hash, status, parent_key_id, is_rotated_version, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        newKeyId,
        organizationId,
        `${oldKey.key_name}-rotated-${Date.now()}`,
        oldKey.algorithm,
        newKeyHash,
        'active',
        oldKey.id,
        true,
      ]
    );

    // Re-encrypt secret with new key (in production, this would be more complex)
    // For now, we just mark the secret as using the new key
    await client.query(
      `UPDATE secrets SET encryption_key_id = $1
       WHERE id = $2 AND organization_id = $3`,
      [newKeyId, secretId, organizationId]
    );

    // Update rotation policy
    const nextRotation = new Date();
    nextRotation.setDate(nextRotation.getDate() + (policy.rotation_interval_days || 30));

    await client.query(
      `UPDATE key_rotation_policies
       SET last_rotated_at = CURRENT_TIMESTAMP, next_rotation_at = $1, updated_by = $2
       WHERE id = $3`,
      [nextRotation, userId, policy.id]
    );

    // Record rotation in history
    const duration = Date.now() - startTime;
    const historyResult = await client.query(
      `INSERT INTO key_rotation_history
       (organization_id, secret_id, encryption_key_id, old_key_id, new_key_id, rotation_type, status, rotated_by, completed_at, rotation_duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)
       RETURNING *`,
      [
        organizationId,
        secretId,
        oldKey.id,
        oldKey.id,
        newKeyId,
        'manual',
        'completed',
        userId,
        Math.floor(duration / 1000),
      ]
    );

    const historyEntry = historyResult.rows[0];

    // Log audit entry
    await client.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, status, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [organizationId, userId, 'rotate_key', 'secret', secretId, 'success']
    );

    // Create notification for other organization users
    const usersResult = await client.query(
      `SELECT id FROM users WHERE organization_id = $1 AND id != $2 AND status = 'active'`,
      [organizationId, userId]
    );

    for (const userRecord of usersResult.rows) {
      await client.query(
        `INSERT INTO rotation_notifications (organization_id, user_id, secret_id, notification_type, message)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          organizationId,
          userRecord.id,
          secretId,
          'rotation_completed',
          `Key rotation completed for secret ${secretId} by user ${userId}`,
        ]
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      rotationId: historyEntry.id,
      oldKeyId: oldKey.id,
      newKeyId,
      rotationType: 'manual',
      status: 'completed',
      duration: Math.floor(duration / 1000),
      completedAt: new Date().toISOString(),
      nextRotationScheduled: nextRotation.toISOString(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get rotation history for a secret
 * @param {string} organizationId - Organization ID
 * @param {string} secretId - Secret ID
 * @param {object} options - Pagination options { limit, offset }
 * @returns {Promise<object>} Rotation history with pagination
 */
export async function getRotationHistory(organizationId, secretId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM key_rotation_history
     WHERE organization_id = $1 AND secret_id = $2`,
    [organizationId, secretId]
  );

  const total = parseInt(countResult.rows[0].total);

  // Get paginated results
  const result = await query(
    `SELECT * FROM key_rotation_history
     WHERE organization_id = $1 AND secret_id = $2
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [organizationId, secretId, limit, offset]
  );

  return {
    rotations: result.rows,
    pagination: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get all scheduled rotations for organization
 * @param {string} organizationId - Organization ID
 * @param {object} options - Pagination options { limit, offset }
 * @returns {Promise<object>} Scheduled rotations with pagination
 */
export async function getScheduledRotations(organizationId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM rotation_schedules
     WHERE organization_id = $1 AND status IN ('pending', 'in_progress')`,
    [organizationId]
  );

  const total = parseInt(countResult.rows[0].total);

  // Get paginated results with secret information
  const result = await query(
    `SELECT rs.*, s.name as secret_name, krp.rotation_frequency
     FROM rotation_schedules rs
     JOIN secrets s ON rs.secret_id = s.id
     JOIN key_rotation_policies krp ON rs.policy_id = krp.id
     WHERE rs.organization_id = $1 AND rs.status IN ('pending', 'in_progress')
     ORDER BY rs.scheduled_for ASC
     LIMIT $2 OFFSET $3`,
    [organizationId, limit, offset]
  );

  return {
    schedules: result.rows,
    pagination: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Cancel a scheduled rotation
 * @param {string} organizationId - Organization ID
 * @param {string} scheduleId - Schedule ID to cancel
 * @param {string} userId - User cancelling the schedule
 * @returns {Promise<object>} Cancelled schedule
 */
export async function cancelScheduledRotation(organizationId, scheduleId, userId) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get the schedule
    const scheduleResult = await client.query(
      `SELECT * FROM rotation_schedules WHERE id = $1 AND organization_id = $2`,
      [scheduleId, organizationId]
    );

    if (scheduleResult.rows.length === 0) {
      throw new NotFoundError('Scheduled rotation not found');
    }

    const schedule = scheduleResult.rows[0];

    // Check if already completed or cancelled
    if (schedule.status !== 'pending' && schedule.status !== 'in_progress') {
      throw new ValidationError(`Cannot cancel schedule with status: ${schedule.status}`);
    }

    // Cancel the schedule
    const result = await client.query(
      `UPDATE rotation_schedules SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [scheduleId, organizationId]
    );

    const cancelled = result.rows[0];

    // Log audit entry
    await client.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, status, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [organizationId, userId, 'cancel_rotation_schedule', 'rotation_schedule', scheduleId, 'success']
    );

    // Create notification
    await client.query(
      `INSERT INTO rotation_notifications (organization_id, user_id, secret_id, notification_type, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        organizationId,
        userId,
        cancelled.secret_id,
        'rotation_cancelled',
        `Scheduled rotation for secret ${cancelled.secret_id} has been cancelled`,
      ]
    );

    await client.query('COMMIT');

    return cancelled;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Schedule future rotations (internal function, called by scheduler)
 * @param {string} organizationId - Organization ID
 * @param {string} policyId - Policy ID
 * @param {Date} scheduledFor - When to schedule the rotation
 * @returns {Promise<object>} Created schedule
 */
export async function createRotationSchedule(organizationId, policyId, scheduledFor) {
  // Get policy to get secret_id
  const policyResult = await query(
    `SELECT secret_id FROM key_rotation_policies WHERE id = $1 AND organization_id = $2`,
    [policyId, organizationId]
  );

  if (policyResult.rows.length === 0) {
    throw new NotFoundError('Rotation policy not found');
  }

  const secretId = policyResult.rows[0].secret_id;

  const result = await query(
    `INSERT INTO rotation_schedules (organization_id, secret_id, policy_id, scheduled_for, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [organizationId, secretId, policyId, scheduledFor]
  );

  return result.rows[0];
}

/**
 * Schedule a manual rotation (user-facing API)
 * @param {string} organizationId - Organization ID
 * @param {string} secretId - Secret ID
 * @param {string} userId - User creating the schedule
 * @param {Date} scheduledFor - When to schedule the rotation
 * @returns {Promise<object>} Created schedule
 */
export async function scheduleRotation(organizationId, secretId, userId, scheduledFor) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Validate scheduled time is in the future
    if (new Date(scheduledFor) <= new Date()) {
      throw new ValidationError('Scheduled rotation time must be in the future');
    }

    // Get secret to ensure it exists
    const secretResult = await client.query(
      `SELECT id FROM secrets WHERE id = $1 AND organization_id = $2`,
      [secretId, organizationId]
    );

    if (secretResult.rows.length === 0) {
      throw new NotFoundError('Secret not found');
    }

    // Get rotation policy
    const policyResult = await client.query(
      `SELECT id FROM key_rotation_policies WHERE secret_id = $1 AND organization_id = $2`,
      [secretId, organizationId]
    );

    if (policyResult.rows.length === 0) {
      throw new NotFoundError('No rotation policy configured for this secret');
    }

    const policy = policyResult.rows[0];

    // Check for existing pending schedules for this secret
    const existingResult = await client.query(
      `SELECT COUNT(*) as count FROM rotation_schedules
       WHERE secret_id = $1 AND organization_id = $2 AND status = 'pending'`,
      [secretId, organizationId]
    );

    if (parseInt(existingResult.rows[0].count) > 0) {
      throw new ValidationError('This secret already has a pending rotation schedule');
    }

    // Create the schedule
    const scheduleResult = await client.query(
      `INSERT INTO rotation_schedules (organization_id, secret_id, policy_id, scheduled_for, status, created_by)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING *`,
      [organizationId, secretId, policy.id, scheduledFor, userId]
    );

    const schedule = scheduleResult.rows[0];

    // Log audit entry
    await client.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, status, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [organizationId, userId, 'schedule_rotation', 'rotation_schedule', schedule.id, 'success']
    );

    // Create notification
    await client.query(
      `INSERT INTO rotation_notifications (organization_id, user_id, secret_id, notification_type, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        organizationId,
        userId,
        secretId,
        'rotation_scheduled',
        `Rotation scheduled for secret ${secretId} at ${new Date(scheduledFor).toISOString()}`,
      ]
    );

    await client.query('COMMIT');
    return schedule;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get a specific schedule by ID
 * @param {string} organizationId - Organization ID
 * @param {string} scheduleId - Schedule ID
 * @returns {Promise<object>} Schedule details
 */
export async function getScheduleById(organizationId, scheduleId) {
  const result = await query(
    `SELECT rs.*, s.name as secret_name, krp.rotation_frequency
     FROM rotation_schedules rs
     JOIN secrets s ON rs.secret_id = s.id
     JOIN key_rotation_policies krp ON rs.policy_id = krp.id
     WHERE rs.id = $1 AND rs.organization_id = $2`,
    [scheduleId, organizationId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Scheduled rotation not found');
  }

  return result.rows[0];
}

/**
 * Get all schedules for a specific secret
 * @param {string} organizationId - Organization ID
 * @param {string} secretId - Secret ID
 * @param {object} options - Pagination options { limit, offset }
 * @returns {Promise<object>} Schedules with pagination
 */
export async function getSchedulesForSecret(organizationId, secretId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM rotation_schedules
     WHERE organization_id = $1 AND secret_id = $2`,
    [organizationId, secretId]
  );

  const total = parseInt(countResult.rows[0].total);

  // Get paginated results
  const result = await query(
    `SELECT rs.*, s.name as secret_name, krp.rotation_frequency
     FROM rotation_schedules rs
     JOIN secrets s ON rs.secret_id = s.id
     JOIN key_rotation_policies krp ON rs.policy_id = krp.id
     WHERE rs.organization_id = $1 AND rs.secret_id = $2
     ORDER BY rs.scheduled_for DESC
     LIMIT $3 OFFSET $4`,
    [organizationId, secretId, limit, offset]
  );

  return {
    schedules: result.rows,
    pagination: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update a scheduled rotation
 * @param {string} organizationId - Organization ID
 * @param {string} scheduleId - Schedule ID
 * @param {string} userId - User updating the schedule
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated schedule
 */
export async function updateSchedule(organizationId, scheduleId, userId, updates) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get current schedule
    const currentResult = await client.query(
      `SELECT * FROM rotation_schedules WHERE id = $1 AND organization_id = $2`,
      [scheduleId, organizationId]
    );

    if (currentResult.rows.length === 0) {
      throw new NotFoundError('Scheduled rotation not found');
    }

    const currentSchedule = currentResult.rows[0];

    // Only allow updating pending schedules
    if (currentSchedule.status !== 'pending') {
      throw new ValidationError(`Cannot update schedule with status: ${currentSchedule.status}`);
    }

    const allowedFields = ['scheduled_for'];
    const updateKeys = Object.keys(updates);
    const invalidKeys = updateKeys.filter(key => !allowedFields.includes(key));

    if (invalidKeys.length > 0) {
      throw new ValidationError(`Cannot update fields: ${invalidKeys.join(', ')}`);
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('At least one field must be updated');
    }

    // Validate scheduled time
    if (updates.scheduled_for && new Date(updates.scheduled_for) <= new Date()) {
      throw new ValidationError('Scheduled rotation time must be in the future');
    }

    // Build UPDATE query
    const setClause = updateKeys
      .map((key, idx) => `${key} = $${idx + 3}`)
      .join(', ');

    const values = updateKeys.map(key => updates[key]);

    const updateResult = await client.query(
      `UPDATE rotation_schedules
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [scheduleId, organizationId, ...values]
    );

    const updated = updateResult.rows[0];

    // Log audit entry
    await client.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, status, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [organizationId, userId, 'update_rotation_schedule', 'rotation_schedule', scheduleId, 'success']
    );

    await client.query('COMMIT');
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default {
  getRotationPolicy,
  updateRotationPolicy,
  previewRotation,
  rotateNow,
  getRotationHistory,
  getScheduledRotations,
  cancelScheduledRotation,
  createRotationSchedule,
  scheduleRotation,
  getScheduleById,
  getSchedulesForSecret,
  updateSchedule,
};
