/**
 * Secrets Management API Routes
 * FASE 6: 6 endpoints for CRUD operations and audit trail
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  createSecret,
  listSecrets,
  getSecret,
  getSecretValue,
  updateSecret,
  archiveSecret,
  deleteSecret,
  getSecretAuditTrail,
} from '../services/secretsService.js';
import { asyncHandler, ValidationError, AuthorizationError } from '../middleware/errorHandler.js';
import { rbacMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/secrets
 * Create a new secret
 * Required roles: admin, editor
 */
router.post(
  '/',
  rbacMiddleware(['admin', 'editor']),
  asyncHandler(async (req, res) => {
    const { name, description, secret_value, secret_type, tags, expires_at } = req.body;

    if (!name || !secret_value) {
      throw new ValidationError('Name and secret_value are required');
    }

    const secret = await createSecret(req.user.organizationId, req.user.userId, {
      name,
      description,
      secret_value,
      secret_type,
      tags,
      expires_at,
    });

    res.status(201).json({
      success: true,
      data: secret,
      message: 'Secret created successfully',
    });
  })
);

/**
 * GET /api/secrets
 * List secrets with pagination and filtering
 * Required roles: admin, editor, viewer
 */
router.get(
  '/',
  rbacMiddleware(['admin', 'editor', 'viewer']),
  asyncHandler(async (req, res) => {
    const { status, page, limit, search, tags, sort, order } = req.query;

    const result = await listSecrets(req.user.organizationId, req.user.userId, {
      status: status || 'active',
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 50, 100), // Max 100 per page
      search: search || '',
      tags: tags ? (typeof tags === 'string' ? [tags] : tags) : null,
      sort: ['created_at', 'name', 'updated_at'].includes(sort) ? sort : 'created_at',
      order: order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
    });

    res.json({
      success: true,
      data: result.secrets,
      pagination: result.pagination,
    });
  })
);

/**
 * GET /api/secrets/:secretId
 * Get secret details (without value)
 * Required roles: admin, editor, viewer
 */
router.get(
  '/:secretId',
  rbacMiddleware(['admin', 'editor', 'viewer']),
  asyncHandler(async (req, res) => {
    // Validate UUID format
    if (!uuidv4({ validate: req.params.secretId })) {
      throw new ValidationError('Invalid secret ID format');
    }

    const secret = await getSecret(req.user.organizationId, req.params.secretId);

    // Get audit trail
    const auditTrail = await getSecretAuditTrail(req.user.organizationId, req.params.secretId, {
      limit: 10,
    });

    res.json({
      success: true,
      data: {
        ...secret,
        auditTrail,
      },
    });
  })
);

/**
 * GET /api/secrets/:secretId/value
 * Get decrypted secret value
 * Required roles: admin, editor
 */
router.get(
  '/:secretId/value',
  rbacMiddleware(['admin', 'editor']),
  asyncHandler(async (req, res) => {
    if (!uuidv4({ validate: req.params.secretId })) {
      throw new ValidationError('Invalid secret ID format');
    }

    const secretValue = await getSecretValue(
      req.user.organizationId,
      req.params.secretId,
      req.user.userId
    );

    res.json({
      success: true,
      data: secretValue,
    });
  })
);

/**
 * PUT /api/secrets/:secretId
 * Update a secret
 * Required roles: admin, editor
 */
router.put(
  '/:secretId',
  rbacMiddleware(['admin', 'editor']),
  asyncHandler(async (req, res) => {
    if (!uuidv4({ validate: req.params.secretId })) {
      throw new ValidationError('Invalid secret ID format');
    }

    const updates = {};
    const allowedFields = ['name', 'description', 'secret_value', 'secret_type', 'status', 'tags', 'expires_at'];

    allowedFields.forEach(field => {
      if (field in req.body) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    const secret = await updateSecret(req.user.organizationId, req.params.secretId, req.user.userId, updates);

    res.json({
      success: true,
      data: secret,
      message: 'Secret updated successfully',
    });
  })
);

/**
 * DELETE /api/secrets/:secretId
 * Archive or permanently delete a secret
 * Required roles: admin
 */
router.delete(
  '/:secretId',
  rbacMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    if (!uuidv4({ validate: req.params.secretId })) {
      throw new ValidationError('Invalid secret ID format');
    }

    const { permanent = false } = req.query;

    if (permanent === 'true') {
      // Permanent deletion
      await deleteSecret(req.user.organizationId, req.params.secretId, req.user.userId);
      res.json({
        success: true,
        message: 'Secret permanently deleted',
      });
    } else {
      // Archive (soft delete)
      await archiveSecret(req.user.organizationId, req.params.secretId, req.user.userId);
      res.json({
        success: true,
        message: 'Secret archived',
      });
    }
  })
);

/**
 * GET /api/secrets/:secretId/audit
 * Get complete audit trail for a secret
 * Required roles: admin
 */
router.get(
  '/:secretId/audit',
  rbacMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    if (!uuidv4({ validate: req.params.secretId })) {
      throw new ValidationError('Invalid secret ID format');
    }

    const { limit, offset } = req.query;

    const auditTrail = await getSecretAuditTrail(req.user.organizationId, req.params.secretId, {
      limit: Math.min(parseInt(limit) || 100, 500),
      offset: parseInt(offset) || 0,
    });

    res.json({
      success: true,
      data: auditTrail,
    });
  })
);

export default router;
