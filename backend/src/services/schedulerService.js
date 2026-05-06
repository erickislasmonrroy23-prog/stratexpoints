/**
 * Rotation Scheduler Service
 * FASE 7: Automatically executes scheduled key rotations
 * Runs as a background job to process pending rotation schedules
 */

import { query } from '../utils/database.js';
import { rotateNow } from './rotationService.js';

let isRunning = false;
let schedulerInterval = null;

/**
 * Initialize the scheduler
 */
export function initializeScheduler() {
  console.log('✓ Rotation Scheduler initialized');
}

/**
 * Start the rotation scheduler
 * Polls rotation_schedules every 60 seconds for pending rotations
 */
export function startScheduler() {
  if (isRunning) {
    console.warn('⚠️  Scheduler is already running');
    return;
  }

  isRunning = true;
  console.log('🚀 Rotation Scheduler started - checking every 60 seconds');

  // Process rotations immediately on start
  processScheduledRotations();

  // Then run every 60 seconds
  schedulerInterval = setInterval(() => {
    processScheduledRotations();
  }, 60000); // 60 seconds
}

/**
 * Stop the rotation scheduler
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    isRunning = false;
    console.log('⏹️  Rotation Scheduler stopped');
  }
}

/**
 * Main scheduler function: finds and executes pending rotations
 */
async function processScheduledRotations() {
  try {
    // Find all pending rotations that are due
    const pendingRotations = await query(
      `SELECT rs.*, kp.organization_id, s.name as secret_name
       FROM rotation_schedules rs
       JOIN key_rotation_policies kp ON rs.policy_id = kp.id
       JOIN secrets s ON kp.secret_id = s.id
       WHERE rs.status = 'pending'
       AND rs.scheduled_for <= CURRENT_TIMESTAMP
       AND rs.attempts < rs.max_attempts
       ORDER BY rs.scheduled_for ASC
       LIMIT 10` // Process max 10 at a time
    );

    if (pendingRotations.rows.length === 0) {
      return; // No pending rotations
    }

    console.log(`\n⏱️  Processing ${pendingRotations.rows.length} scheduled rotation(s)`);

    // Process each pending rotation
    for (const schedule of pendingRotations.rows) {
      await executeScheduledRotation(schedule);
    }
  } catch (error) {
    console.error('❌ Error in scheduler:', error.message);
  }
}

/**
 * Execute a single scheduled rotation
 */
async function executeScheduledRotation(schedule) {
  const {
    id: scheduleId,
    secret_id: secretId,
    organization_id: organizationId,
    secret_name: secretName,
    attempts,
    max_attempts,
    scheduled_for,
  } = schedule;

  try {
    console.log(`  📋 Rotating secret: ${secretName} (${secretId})`);

    // Update schedule status to in_progress
    await query(
      `UPDATE rotation_schedules
       SET status = 'in_progress',
           attempts = $1,
           last_attempt_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [attempts + 1, scheduleId]
    );

    // Execute the rotation (system user performs it)
    const rotationResult = await rotateNow(
      organizationId,
      secretId,
      'system-scheduler'
    );

    // Mark schedule as completed
    await query(
      `UPDATE rotation_schedules
       SET status = 'completed',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [scheduleId]
    );

    // Log success
    await query(
      `INSERT INTO rotation_notifications
       (organization_id, secret_id, notification_type, message, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [
        organizationId,
        secretId,
        'rotation_completed',
        `Scheduled rotation completed for ${secretName}`,
      ]
    );

    console.log(`  ✅ Rotation completed for ${secretName}`);
  } catch (error) {
    console.error(`  ❌ Rotation failed for ${secretName}:`, error.message);

    // Handle retry logic
    const nextRetryAtTime = new Date();
    nextRetryAtTime.setMinutes(nextRetryAtTime.getMinutes() + (attempts + 1) * 5); // 5, 10, 15 min delays

    if (attempts + 1 >= schedule.max_attempts) {
      // Max retries exceeded - mark as failed
      await query(
        `UPDATE rotation_schedules
         SET status = 'failed',
             attempts = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [attempts + 1, scheduleId]
      );

      // Create failure notification
      await query(
        `INSERT INTO rotation_notifications
         (organization_id, secret_id, notification_type, message, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [
          organizationId,
          secretId,
          'rotation_failed',
          `Scheduled rotation FAILED for ${secretName} after ${attempts + 1} attempts: ${error.message}`,
        ]
      );

      console.log(`  ⚠️  Rotation failed after max attempts for ${secretName}`);
    } else {
      // Schedule retry
      await query(
        `UPDATE rotation_schedules
         SET status = 'pending',
             attempts = $1,
             last_attempt_at = CURRENT_TIMESTAMP,
             next_retry_at = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [attempts + 1, nextRetryAtTime, scheduleId]
      );

      console.log(
        `  🔄 Retry scheduled (attempt ${attempts + 1}/${schedule.max_attempts}) for ${secretName}`
      );
    }
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    isRunning,
    status: isRunning ? 'active' : 'stopped',
    interval: '60 seconds',
  };
}

export default {
  initializeScheduler,
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  processScheduledRotations,
};
