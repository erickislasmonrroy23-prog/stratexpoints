/**
 * Secrets Management Service
 * FASE 6: Business logic for secrets CRUD and encryption
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/database.js';
import { encryptSecret, decryptSecret, hashKey } from '../utils/encryption.js';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
} from '../middleware/errorHandler.js';

/**
 * Create a new secret
 */
export async function createSecret(organizationId, userId, secretData) {
  try {
    // Validate required fields
    if (!secretData.name || !secretData.secret_value) {
      throw new ValidationError('Name and secret value are required', {
        name: secretData.name ? null : 'Required',
        secret_value: secretData.secret_value ? null : 'Required',
      });
    }

    // Check if secret with same name already exists
    const existing = await query(
      'SELECT id FROM secrets WHERE organization_id = $1 AND name = $2',
      [organizationId, secretData.name]
    );

    if (existing.rows.length > 0) {
      throw new ConflictError(`Secret with name '${secretData.name}' already exists`);
    }

    // Get or create encryption key
    let encryptionKeyId = secretData.encryption_key_id;
    if (!encryptionKeyId) {
      const keyResult = await query(
        `SELECT id FROM encryption_keys
         WHERE organization_id = $1 AND status = 'active'
         ORDER BY created_at DESC LIMIT 1`,
        [organizationId]
      );

      if (keyResult.rows.length === 0) {
        // Create default key
        const keyId = uuidv4();
        await query(
          `INSERT INTO encryption_keys (id, organization_id, key_name, status, key_hash, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [keyId, organizationId, 'default-key', 'active', hashKey('default')]
        );
        encryptionKeyId = keyId;
      } else {
        encryptionKeyId = keyResult.rows[0].id;
      }
    }

    // Encrypt the secret value
    const { encryptedData, iv, authTag } = encryptSecret(secretData.secret_value);

    // Create secret record
    const secretId = uuidv4();
    const result = await query(
      `INSERT INTO secrets (
        id, organization_id, encryption_key_id, name, description, secret_value,
        secret_type, status, tags, expires_at, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING *`,
      [
        secretId,
        organizationId,
        encryptionKeyId,
        secretData.name,
        secretData.description || null,
        JSON.stringify({ encryptedData, iv, authTag }), // Store encryption metadata with secret
        secretData.secret_type || 'api_key',
        'active',
        secretData.tags ? JSON.stringify(secretData.tags) : null,
        secretData.expires_at || null,
        userId,
      ]
    );

    // Log audit event
    await query(
      `INSERT INTO audit_logs (
        organization_id, user_id, action, resource_type, resource_id, resource_name,
        status, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [organizationId, userId, 'create', 'secret', secretId, secretData.name, 'success']
    );

    // Return secret without the encrypted value
    const secret = result.rows[0];
    delete secret.secret_value;
    return secret;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }
    console.error('Create secret error:', error);
    throw new Error('Failed to create secret');
  }
}

/**
 * List secrets with pagination and filtering
 */
export async function listSecrets(organizationId, userId, filters = {}) {
  try {
    const {
      status = 'active',
      page = 1,
      limit = 50,
      search = '',
      tags = null,
      sort = 'created_at',
      order = 'DESC',
    } = filters;

    const offset = (page - 1) * limit;
    const validStatuses = ['active', 'archived', 'expired', 'revoked'];
    const safeStatus = validStatuses.includes(status) ? status : 'active';

    let whereClause = 'WHERE s.organization_id = $1 AND s.status = $2';
    let params = [organizationId, safeStatus];
    let paramIndex = 3;

    // Add search filter
    if (search) {
      whereClause += ` AND (s.name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add tags filter
    if (tags && Array.isArray(tags) && tags.length > 0) {
      whereClause += ` AND s.tags @> $${paramIndex}::jsonb`;
      params.push(JSON.stringify(tags));
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM secrets s ${whereClause}`,
      params.slice(0, paramIndex - 1)
    );
    const total = parseInt(countResult.rows[0].count);

    // Get secrets (without values)
    const selectClause = `
      SELECT id, organization_id, name, description, secret_type, status,
             tags, expires_at, created_at, updated_at, created_by
      FROM secrets s
    `;

    const result = await query(
      `${selectClause} ${whereClause}
       ORDER BY ${sort} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      secrets: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('List secrets error:', error);
    throw new Error('Failed to list secrets');
  }
}

/**
 * Get a secret by ID (without decrypting the value)
 */
export async function getSecret(organizationId, secretId) {
  try {
    const result = await query(
      `SELECT id, organization_id, name, description, secret_type, status, tags,
              expires_at, created_at, updated_at, created_by
       FROM secrets WHERE organization_id = $1 AND id = $2`,
      [organizationId, secretId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Secret not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error('Get secret error:', error);
    throw new Error('Failed to get secret');
  }
}

/**
 * Get secret value (decrypt)
 */
export async function getSecretValue(organizationId, secretId, userId) {
  try {
    const result = await query(
      'SELECT id, name, secret_value, secret_type FROM secrets WHERE organization_id = $1 AND id = $2',
      [organizationId, secretId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Secret not found');
    }

    const secret = result.rows[0];
    const { encryptedData, iv, authTag } = JSON.parse(secret.secret_value);

    // Decrypt the value
    const decryptedValue = decryptSecret(encryptedData, iv, authTag);

    // Log access
    await query(
      `INSERT INTO secret_access_logs (
        organization_id, secret_id, user_id, access_type, success, accessed_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [organizationId, secretId, userId, 'read', true]
    );

    return {
      id: secret.id,
      name: secret.name,
      value: decryptedValue,
      type: secret.secret_type,
    };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error('Get secret value error:', error);
    throw new Error('Failed to retrieve secret value');
  }
}

/**
 * Update a secret
 */
export async function updateSecret(organizationId, secretId, userId, updates) {
  try {
    // Get existing secret
    const existing = await query(
      'SELECT * FROM secrets WHERE organization_id = $1 AND id = $2',
      [organizationId, secretId]
    );

    if (existing.rows.length === 0) {
      throw new NotFoundError('Secret not found');
    }

    const currentSecret = existing.rows[0];

    // If updating the secret value, re-encrypt it
    let secretValue = currentSecret.secret_value;
    if (updates.secret_value) {
      const { encryptedData, iv, authTag } = encryptSecret(updates.secret_value);
      secretValue = JSON.stringify({ encryptedData, iv, authTag });
    }

    // Build update query
    const updatableFields = ['name', 'description', 'secret_type', 'status', 'tags', 'expires_at'];
    const updateClauses = [];
    const updateParams = [];
    let paramIndex = 1;

    updatableFields.forEach(field => {
      if (field in updates) {
        updateClauses.push(`${field} = $${paramIndex}`);
        updateParams.push(
          field === 'tags' && updates[field] ? JSON.stringify(updates[field]) : updates[field]
        );
        paramIndex++;
      }
    });

    if (secretValue !== currentSecret.secret_value) {
      updateClauses.push(`secret_value = $${paramIndex}`);
      updateParams.push(secretValue);
      paramIndex++;
    }

    updateClauses.push(`updated_by = $${paramIndex}`);
    updateParams.push(userId);
    paramIndex++;

    updateClauses.push(`updated_at = NOW()`);

    // Execute update
    const result = await query(
      `UPDATE secrets SET ${updateClauses.join(', ')}
       WHERE organization_id = $${paramIndex} AND id = $${paramIndex + 1}
       RETURNING id, organization_id, name, description, secret_type, status, tags, expires_at, created_at, updated_at, created_by`,
      [...updateParams, organizationId, secretId]
    );

    // Log audit event
    await query(
      `INSERT INTO audit_logs (
        organization_id, user_id, action, resource_type, resource_id, resource_name,
        changes, status, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        organizationId,
        userId,
        'update',
        'secret',
        secretId,
        updates.name || currentSecret.name,
        JSON.stringify(updates),
        'success',
      ]
    );

    return result.rows[0];
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error('Update secret error:', error);
    throw new Error('Failed to update secret');
  }
}

/**
 * Archive a secret
 */
export async function archiveSecret(organizationId, secretId, userId) {
  try {
    const result = await query(
      `UPDATE secrets SET status = 'archived', updated_by = $1, updated_at = NOW()
       WHERE organization_id = $2 AND id = $3
       RETURNING *`,
      [userId, organizationId, secretId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Secret not found');
    }

    // Log audit event
    await query(
      `INSERT INTO audit_logs (
        organization_id, user_id, action, resource_type, resource_id, resource_name,
        status, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [organizationId, userId, 'archive', 'secret', secretId, result.rows[0].name, 'success']
    );

    return result.rows[0];
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error('Archive secret error:', error);
    throw new Error('Failed to archive secret');
  }
}

/**
 * Delete a secret
 */
export async function deleteSecret(organizationId, secretId, userId) {
  try {
    const secret = await query(
      'SELECT name FROM secrets WHERE organization_id = $1 AND id = $2',
      [organizationId, secretId]
    );

    if (secret.rows.length === 0) {
      throw new NotFoundError('Secret not found');
    }

    await query('DELETE FROM secrets WHERE organization_id = $1 AND id = $2', [
      organizationId,
      secretId,
    ]);

    // Log audit event
    await query(
      `INSERT INTO audit_logs (
        organization_id, user_id, action, resource_type, resource_id, resource_name,
        status, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [organizationId, userId, 'delete', 'secret', secretId, secret.rows[0].name, 'success']
    );

    return { success: true };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    console.error('Delete secret error:', error);
    throw new Error('Failed to delete secret');
  }
}

/**
 * Get audit trail for a secret
 */
export async function getSecretAuditTrail(organizationId, secretId, options = {}) {
  try {
    const { limit = 100, offset = 0 } = options;

    const result = await query(
      `SELECT id, user_id, action, changes, timestamp, ip_address, user_agent, status
       FROM audit_logs
       WHERE organization_id = $1 AND resource_type = 'secret' AND resource_id = $2
       ORDER BY timestamp DESC
       LIMIT $3 OFFSET $4`,
      [organizationId, secretId, limit, offset]
    );

    return result.rows;
  } catch (error) {
    console.error('Get audit trail error:', error);
    throw new Error('Failed to get audit trail');
  }
}

export default {
  createSecret,
  listSecrets,
  getSecret,
  getSecretValue,
  updateSecret,
  archiveSecret,
  deleteSecret,
  getSecretAuditTrail,
};
