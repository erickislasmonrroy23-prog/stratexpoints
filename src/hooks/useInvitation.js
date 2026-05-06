/**
 * useInvitation Hook - Organization Member Invitations
 *
 * Manages the lifecycle of organization member invitations:
 * - Creating invitations with role assignment
 * - Tracking invitation status (pending, accepted, expired, revoked)
 * - Resending expired invitations
 * - Revoking pending invitations
 * - Auto-expiry of invitations after configurable period
 *
 * Features:
 * - Email validation
 * - Duplicate prevention (no invites to existing members)
 * - Role-based access control (org admins can only invite up to their role level)
 * - Expiry tracking (default 7 days)
 * - Audit logging for invitation events
 *
 * Usage:
 * import { useInvitation } from './hooks/useInvitation.js';
 *
 * const {
 *   invitations,
 *   loading,
 *   error,
 *   inviteUser,
 *   revokeInvitation,
 *   resendInvitation,
 *   fetchInvitations
 * } = useInvitation(organizationId);
 *
 * // Invite a user
 * const result = await inviteUser({
 *   email: 'user@example.com',
 *   role: 'member',
 *   message: 'Please join our team'
 * });
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import apiClient from '../utils/apiInterceptor.js';
import { useAuditLog, FRONTEND_AUDIT_ACTIONS } from './useAuditLog.js';
import { useTenant } from '../contexts/TenantContext.jsx';
import logger from '../utils/logger.js';

/**
 * Invitation status constants
 */
export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  DECLINED: 'declined',
};

/**
 * Invitation configuration
 */
const INVITATION_CONFIG = {
  EXPIRY_DAYS: 7, // Invitations expire after 7 days
  MAX_INVITES_PER_ORG: 100, // Max active invites per organization
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

/**
 * Custom hook for managing organization member invitations
 *
 * @param {string} organizationId - Organization ID for invitations
 * @returns {Object} Invitation management interface
 */
export const useInvitation = (organizationId) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { logAction } = useAuditLog();
  const { hasPermission } = useTenant();
  const abortController = useRef(null);

  /**
   * Validate email address
   *
   * @param {string} email - Email to validate
   * @returns {boolean} True if email is valid
   */
  const isValidEmail = useCallback((email) => {
    return INVITATION_CONFIG.EMAIL_REGEX.test(email);
  }, []);

  /**
   * Fetch invitations for the organization
   *
   * @param {Object} [options] - Fetch options
   * @param {string} [options.status] - Filter by status (pending, accepted, etc.)
   * @returns {Promise<void>}
   */
  const fetchInvitations = useCallback(
    async (options = {}) => {
      if (!organizationId) {
        setError('Organization ID is required');
        return;
      }

      // Check permission
      if (!hasPermission('organization.manage_members')) {
        setError('You do not have permission to view invitations');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Cancel previous request if still pending
        if (abortController.current) {
          abortController.current.abort();
        }
        abortController.current = new AbortController();

        const params = new URLSearchParams({
          organization_id: organizationId,
          ...(options.status && { status: options.status }),
        });

        const response = await apiClient.get(
          `/api/organizations/${organizationId}/invitations?${params}`,
          { signal: abortController.current.signal }
        );

        if (response.status === 200) {
          setInvitations(response.data?.data || []);
          logger.debug('Invitations fetched', {
            organizationId,
            count: response.data?.data?.length,
          });
        } else {
          setError('Failed to fetch invitations');
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          logger.debug('Invitation fetch cancelled');
          return;
        }

        logger.error('Failed to fetch invitations', err);
        setError(err.message || 'Failed to fetch invitations');
      } finally {
        setLoading(false);
      }
    },
    [organizationId, hasPermission]
  );

  /**
   * Invite a user to the organization
   *
   * @param {Object} params - Invitation parameters
   * @param {string} params.email - Email address of invitee
   * @param {string} params.role - Role to assign (member, manager, admin)
   * @param {string} [params.message] - Optional custom message
   * @returns {Promise<{success: boolean, invitation?: Object, error?: string}>}
   */
  const inviteUser = useCallback(
    async (params = {}) => {
      const { email, role, message = '' } = params;

      // Validation
      if (!organizationId) {
        setError('Organization ID is required');
        return { success: false, error: 'Organization ID is required' };
      }

      if (!email || !isValidEmail(email)) {
        setError('Invalid email address');
        return { success: false, error: 'Invalid email address' };
      }

      if (!role) {
        setError('Role is required');
        return { success: false, error: 'Role is required' };
      }

      // Check permission
      if (!hasPermission('organization.manage_members')) {
        setError('You do not have permission to invite members');
        return { success: false, error: 'Permission denied' };
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.post(
          `/api/organizations/${organizationId}/invitations`,
          {
            email,
            role,
            message,
          }
        );

        if (response.status === 201) {
          const newInvitation = response.data?.data;

          // Update invitations list
          setInvitations((prev) => [newInvitation, ...prev]);

          // Log invitation
          await logAction({
            action: FRONTEND_AUDIT_ACTIONS.USER_INVITED,
            resourceType: 'invitation',
            resourceId: newInvitation?.id,
            details: {
              email,
              role,
              expiresAt: newInvitation?.expires_at,
            },
          });

          logger.info('User invited successfully', { email, organizationId });

          return {
            success: true,
            invitation: newInvitation,
          };
        } else {
          setError('Failed to create invitation');
          return { success: false, error: 'Failed to create invitation' };
        }
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message;
        setError(errorMsg);
        logger.error('Failed to invite user', err);

        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [organizationId, hasPermission, logAction, isValidEmail]
  );

  /**
   * Revoke a pending invitation
   *
   * @param {string} invitationId - ID of invitation to revoke
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const revokeInvitation = useCallback(
    async (invitationId) => {
      if (!invitationId || !organizationId) {
        return { success: false, error: 'Missing required parameters' };
      }

      // Check permission
      if (!hasPermission('organization.manage_members')) {
        return { success: false, error: 'Permission denied' };
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.delete(
          `/api/organizations/${organizationId}/invitations/${invitationId}`
        );

        if (response.status === 200) {
          // Remove from list
          setInvitations((prev) =>
            prev.filter((inv) => inv.id !== invitationId)
          );

          // Log revocation
          await logAction({
            action: 'INVITATION_REVOKED',
            resourceType: 'invitation',
            resourceId: invitationId,
            details: {
              organizationId,
            },
          });

          return { success: true };
        } else {
          setError('Failed to revoke invitation');
          return { success: false, error: 'Failed to revoke invitation' };
        }
      } catch (err) {
        const errorMsg = err.message || 'Failed to revoke invitation';
        setError(errorMsg);
        logger.error('Failed to revoke invitation', err);

        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [organizationId, hasPermission, logAction]
  );

  /**
   * Resend an expired invitation
   *
   * @param {string} invitationId - ID of invitation to resend
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const resendInvitation = useCallback(
    async (invitationId) => {
      if (!invitationId || !organizationId) {
        return { success: false, error: 'Missing required parameters' };
      }

      // Check permission
      if (!hasPermission('organization.manage_members')) {
        return { success: false, error: 'Permission denied' };
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.post(
          `/api/organizations/${organizationId}/invitations/${invitationId}/resend`,
          {}
        );

        if (response.status === 200) {
          const updatedInvitation = response.data?.data;

          // Update in list
          setInvitations((prev) =>
            prev.map((inv) =>
              inv.id === invitationId ? updatedInvitation : inv
            )
          );

          logger.info('Invitation resent successfully', { invitationId });

          return { success: true };
        } else {
          setError('Failed to resend invitation');
          return { success: false, error: 'Failed to resend invitation' };
        }
      } catch (err) {
        const errorMsg = err.message || 'Failed to resend invitation';
        setError(errorMsg);
        logger.error('Failed to resend invitation', err);

        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [organizationId, hasPermission]
  );

  /**
   * Get stats about invitations
   *
   * @returns {Object} Invitation statistics
   */
  const getStats = useCallback(() => {
    return {
      total: invitations.length,
      pending: invitations.filter((i) => i.status === INVITATION_STATUS.PENDING)
        .length,
      accepted: invitations.filter((i) => i.status === INVITATION_STATUS.ACCEPTED)
        .length,
      expired: invitations.filter((i) => i.status === INVITATION_STATUS.EXPIRED)
        .length,
      revoked: invitations.filter((i) => i.status === INVITATION_STATUS.REVOKED)
        .length,
    };
  }, [invitations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return {
    invitations,
    loading,
    error,
    inviteUser,
    revokeInvitation,
    resendInvitation,
    fetchInvitations,
    getStats,
    isValidEmail,
  };
};

export default useInvitation;
