import React from 'react';
import { useTenant } from './TenantContext';

/**
 * PermissionGuard Component
 * 
 * Conditionally renders children based on user permissions.
 * Supports multiple permission checking strategies:
 * - Single permission check
 * - Any-of permissions (OR logic)
 * - All permissions (AND logic)
 * - Minimum role level
 * 
 * Usage:
 * <PermissionGuard permission="okrs.edit">
 *   <EditOKRButton />
 * </PermissionGuard>
 * 
 * <PermissionGuard anyOf={['okrs.edit', 'okrs.create']}>
 *   <OKRActionMenu />
 * </PermissionGuard>
 * 
 * <PermissionGuard role="admin">
 *   <AdminPanel />
 * </PermissionGuard>
 */
export const PermissionGuard = ({
  children,
  permission,
  anyOf,
  allOf,
  role,
  fallback = null,
  requireSuperAdmin = false,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isMinimumRole, isSuperAdmin } = useTenant();

  // Super admin check
  if (requireSuperAdmin && !isSuperAdmin) {
    return fallback;
  }

  // Single permission check
  if (permission) {
    if (!hasPermission(permission)) {
      return fallback;
    }
  }

  // Any-of permissions (OR logic)
  if (anyOf && Array.isArray(anyOf)) {
    if (!hasAnyPermission(anyOf)) {
      return fallback;
    }
  }

  // All permissions (AND logic)
  if (allOf && Array.isArray(allOf)) {
    if (!hasAllPermissions(allOf)) {
      return fallback;
    }
  }

  // Role-based check
  if (role) {
    if (!isMinimumRole(role)) {
      return fallback;
    }
  }

  // All checks passed, render children
  return <>{children}</>;
};

/**
 * withPermissionGuard HOC
 * 
 * Higher-Order Component wrapper for protecting entire component routes/pages
 * 
 * Usage:
 * export default withPermissionGuard(AdminDashboard, { permission: 'org.settings' });
 */
export const withPermissionGuard = (Component, guardConfig = {}) => {
  return (props) => (
    <PermissionGuard {...guardConfig}>
      <Component {...props} />
    </PermissionGuard>
  );
};

/**
 * usePermissionGuard Hook
 * 
 * Custom hook for imperative permission checking in components
 * Useful when you need to conditionally execute logic rather than render UI
 * 
 * Usage:
 * const canEdit = usePermissionGuard('okrs.edit');
 * if (canEdit) {
 *   // Enable edit functionality
 * }
 */
export const usePermissionGuard = (permission) => {
  const { hasPermission, isSuperAdmin } = useTenant();
  return isSuperAdmin || hasPermission(permission);
};

/**
 * PermissionBadge Component
 * 
 * Displays visual indicator of permission status
 * Useful for debugging and user feedback
 * 
 * Usage:
 * <PermissionBadge permission="okrs.edit" />
 */
export const PermissionBadge = ({ permission, label }) => {
  const { hasPermission, isSuperAdmin } = useTenant();
  const hasAccess = isSuperAdmin || hasPermission(permission);

  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
        hasAccess
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'
      }`}
      title={`Permission: ${permission}`}
    >
      {label || permission}
      {hasAccess ? ' ✓' : ' ✗'}
    </span>
  );
};

/**
 * PermissionDenied Component
 * 
 * Fallback UI component shown when user lacks permission
 * Can be customized per PermissionGuard instance
 * 
 * Usage:
 * <PermissionGuard
 *   permission="okrs.edit"
 *   fallback={<PermissionDenied permission="okrs.edit" />}
 * >
 *   <EditButton />
 * </PermissionGuard>
 */
export const PermissionDenied = ({ permission, message }) => {
  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
      <p className="text-sm text-yellow-800">
        {message || `You don't have permission to access this. Required: ${permission}`}
      </p>
    </div>
  
 "�
}

export default PermissionGuard;