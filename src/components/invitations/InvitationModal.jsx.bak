/**
 * InvitationModal - User Invitation Form
 *
 * Modal component for inviting new members to an organization
 *
 * Features:
 * - Email input with validation
 * - Role selection dropdown
 * - Custom message field
 * - Success/error feedback
 * - Loading state
 * - Accessible form controls
 *
 * Usage:
 * import InvitationModal from './components/invitations/InvitationModal.jsx';
 *
 * <InvitationModal
 *   isOpen={showModal}
 *   organizationId={currentOrgId}
 *   onClose={() => setShowModal(false)}
 *   onInvitationSent={(invitation) => logger.log('Invited:', invitation)}
 * />
 */

import React, { useState, useCallback } from 'react';
import { useInvitation } from '../../hooks/useInvitation.js';
import logger from '../../utils/logger.js';

/**
 * InvitationModal Component
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {string} props.organizationId - Organization to invite to
 * @param {Function} props.onClose - Called when modal closes
 * @param {Function} [props.onInvitationSent] - Called after successful invitation
 * @param {Array<string>} [props.availableRoles] - Available roles (default: member, manager, admin)
 * @returns {JSX.Element} Modal component
 */
export default function InvitationModal({
  isOpen,
  organizationId,
  onClose,
  onInvitationSent,
  availableRoles = ['member', 'manager', 'admin'],
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [message, setMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const { inviteUser, loading, error: hookError } = useInvitation(organizationId);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Reset previous errors
      setValidationError('');

      // Validate inputs
      if (!email.trim()) {
        setValidationError('Email is required');
        return;
      }

      if (!role) {
        setValidationError('Role is required');
        return;
      }

      // Call invite function
      const result = await inviteUser({
        email: email.trim(),
        role,
        message: message.trim(),
      });

      if (result.success) {
        logger.info('Invitation sent successfully', { email });

        // Call callback if provided
        if (onInvitationSent) {
          onInvitationSent(result.invitation);
        }

        // Reset form
        setEmail('');
        setRole('member');
        setMessage('');

        // Close modal
        onClose();
      } else {
        setValidationError(result.error || 'Failed to send invitation');
      }
    },
    [email, role, message, inviteUser, onClose, onInvitationSent]
  );

  /**
   * Handle close with reset
   */
  const handleClose = useCallback(() => {
    setEmail('');
    setRole('member');
    setMessage('');
    setValidationError('');
    onClose();
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  const hasError = validationError || hookError;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Invite Team Member</h2>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email Input */}
          <div>
            <label
              htmlFor="invite-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              aria-describedby={hasError ? 'invite-error' : undefined}
            />
          </div>

          {/* Role Select */}
          <div>
            <label
              htmlFor="invite-role"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Members can view and edit organization data. Managers have additional oversight.
              Admins have full control.
            </p>
          </div>

          {/* Message Input */}
          <div>
            <label
              htmlFor="invite-message"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Message (Optional)
            </label>
            <textarea
              id="invite-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Welcome to our team!"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* Error Message */}
          {hasError && (
            <div
              id="invite-error"
              className="p-3 bg-red-50 border border-red-200 rounded-md"
            >
              <p className="text-sm text-red-700">{hasError}</p>
            </div>
          )}

          {/* Info Message */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              An invitation will be sent to the email address. The recipient will have 7 days to
              accept.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
}
