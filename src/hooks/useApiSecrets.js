/**
 * useApiSecrets Hook
 * Provides convenient access to FASE 5 secrets management API endpoints
 * Handles loading states and error management automatically
 */

import { useState, useCallback } from 'react';
import logger from '../utils/logger.js';
import {
  apiSecretsService,
  apiKeyRotationService,
  apiLifecycleService,
} from '../services/apiClientService.js';

export const useApiSecrets = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [secrets, setSecrets] = useState([]);

  // ════════════════════════════════════════════════════════════════════════════════
  // SECRETS OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════════

  const createSecret = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiSecretsService.createSecret(payload);
      logger.info('[useApiSecrets] Secret created', { id: result?.id });
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to create secret';
      setError(msg);
      logger.error('[useApiSecrets] Create failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSecret = useCallback(async (secretId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiSecretsService.getSecret(secretId);
      logger.info('[useApiSecrets] Secret retrieved');
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to retrieve secret';
      setError(msg);
      logger.error('[useApiSecrets] Get failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSecretValue = useCallback(async (secretId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiSecretsService.getSecretValue(secretId);
      logger.info('[useApiSecrets] Secret value decrypted', { id: secretId });
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to decrypt secret value';
      setError(msg);
      logger.error('[useApiSecrets] Decrypt failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listSecrets = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiSecretsService.listSecrets(filters);
      const secretsList = result?.secrets || result || [];
      setSecrets(secretsList);
      logger.info('[useApiSecrets] Secrets listed', { count: secretsList.length });
      return secretsList;
    } catch (err) {
      const msg = err?.message || 'Failed to list secrets';
      setError(msg);
      logger.error('[useApiSecrets] List failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSecret = useCallback(async (secretId, payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiSecretsService.updateSecret(secretId, payload);
      logger.info('[useApiSecrets] Secret updated', { id: secretId });
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to update secret';
      setError(msg);
      logger.error('[useApiSecrets] Update failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSecret = useCallback(async (secretId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiSecretsService.deleteSecret(secretId);
      logger.info('[useApiSecrets] Secret deleted', { id: secretId });
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to delete secret';
      setError(msg);
      logger.error('[useApiSecrets] Delete failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const archiveSecret = useCallback(async (secretId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiSecretsService.archiveSecret(secretId);
      logger.info('[useApiSecrets] Secret archived', { id: secretId });
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to archive secret';
      setError(msg);
      logger.error('[useApiSecrets] Archive failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ════════════════════════════════════════════════════════════════════════════════
  // KEY ROTATION OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════════

  const getRotationPolicy = useCallback(async (secretId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiKeyRotationService.getRotationPolicy(secretId);
      logger.info('[useApiSecrets] Rotation policy retrieved');
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to get rotation policy';
      setError(msg);
      logger.error('[useApiSecrets] Get policy failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRotationPolicy = useCallback(async (secretId, policy) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiKeyRotationService.updateRotationPolicy(secretId, policy);
      logger.info('[useApiSecrets] Rotation policy updated', { id: secretId });
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to update rotation policy';
      setError(msg);
      logger.error('[useApiSecrets] Update policy failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const rotateNow = useCallback(async (secretId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiKeyRotationService.rotateNow(secretId);
      logger.info('[useApiSecrets] Key rotated immediately', { id: secretId });
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to rotate key';
      setError(msg);
      logger.error('[useApiSecrets] Rotation failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRotationHistory = useCallback(async (secretId, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiKeyRotationService.getRotationHistory(secretId, options);
      logger.info('[useApiSecrets] Rotation history retrieved');
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to get rotation history';
      setError(msg);
      logger.error('[useApiSecrets] Get history failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ════════════════════════════════════════════════════════════════════════════════
  // LIFECYCLE OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════════

  const getLifecycleStatus = useCallback(async (secretId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiLifecycleService.getStatus(secretId);
      logger.info('[useApiSecrets] Lifecycle status retrieved');
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to get lifecycle status';
      setError(msg);
      logger.error('[useApiSecrets] Get status failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLifecycleStage = useCallback(async (secretId, stage) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiLifecycleService.updateStage(secretId, stage);
      logger.info('[useApiSecrets] Lifecycle stage updated', { id: secretId, stage });
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to update lifecycle stage';
      setError(msg);
      logger.error('[useApiSecrets] Update stage failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deprecateSecret = useCallback(async (secretId, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiLifecycleService.deprecate(secretId, options);
      logger.info('[useApiSecrets] Secret deprecated', { id: secretId });
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to deprecate secret';
      setError(msg);
      logger.error('[useApiSecrets] Deprecate failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSecretAuditTrail = useCallback(async (secretId, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiSecretsService.getAuditTrail(secretId, options);
      logger.info('[useApiSecrets] Secret audit trail retrieved', { id: secretId });
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to get audit trail';
      setError(msg);
      logger.error('[useApiSecrets] Get audit trail failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getComplianceReport = useCallback(async (secretId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiLifecycleService.getComplianceReport(secretId);
      logger.info('[useApiSecrets] Compliance report retrieved');
      return result;
    } catch (err) {
      const msg = err?.message || 'Failed to get compliance report';
      setError(msg);
      logger.error('[useApiSecrets] Get report failed', { error: msg });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    // State
    loading,
    error,
    secrets,
    clearError,

    // FASE 6: Secrets operations
    createSecret,
    getSecret,
    getSecretValue,
    listSecrets,
    updateSecret,
    deleteSecret,
    archiveSecret,
    getSecretAuditTrail,

    // FASE 7: Key rotation operations
    getRotationPolicy,
    updateRotationPolicy,
    rotateNow,
    getRotationHistory,

    // FASE 8+: Lifecycle operations
    getLifecycleStatus,
    updateLifecycleStage,
    deprecateSecret,
    getComplianceReport,
  };
};

export default useApiSecrets;
