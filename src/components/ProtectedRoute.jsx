/**
 * FASE 1.3: Protected Route Component
 * Enforces authentication and authorization checks
 * Validates user role and organization access
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../store';
import logger from '../utils/logger.js';

export const ProtectedRoute = ({
  children,
  requiredRole = null,
  requiredOrganization = null,
  allowSuperAdmin = true,
  onAccessDenied = null
}) => {
  const { user, profile, authContextLoading } = useStore();

  // Log access attempt
  React.useEffect(() => {
    logger.info('[ProtectedRoute] Validating route access', {
      hasUser: !!user,
      hasProfile: !!profile,
      requiredRole,
      requiredOrganization
    });
  }, [user, profile, requiredRole, requiredOrganization]);

  // Loading state
  if (authContextLoading) {
    return (
      <div className="protected-route-loading">
        <div className="loading-spinner">
          <div></div>
          <div></div>
          <div></div>
        </div>
        <p>Verificando autenticación...</p>
      </div>
    );
  }

  // 1. Check authentication - must be logged in
  if (!user || !profile) {
    logger.warn('[ProtectedRoute] Access denied: Not authenticated');
    if (onAccessDenied) {
      onAccessDenied('not_authenticated');
    }
    return <Navigate to="/login" replace />;
  }

  // 2. Check role - if required, verify user has required role
  if (requiredRole) {
    const isSuperAdmin = profile.is_super_admin && allowSuperAdmin;
    const hasRequiredRole = profile.role === requiredRole;

    if (!hasRequiredRole && !isSuperAdmin) {
      logger.warn('[ProtectedRoute] Access denied: Insufficient role', {
        userRole: profile.role,
        requiredRole,
        isSuperAdmin
      });
      if (onAccessDenied) {
        onAccessDenied('insufficient_role');
      }
      return null;
    }
  }

  // 3. Check organization - if required, verify user has access
  if (requiredOrganization) {
    const isSuperAdmin = profile.is_super_admin && allowSuperAdmin;

    if (!isSuperAdmin) {
      const hasOrgAccess = profile.organizations?.some(
        org => org.id === requiredOrganization
      );

      if (!hasOrgAccess) {
        logger.warn('[ProtectedRoute] Access denied: No organization access', {
          userOrganizations: profile.organizations?.map(o => o.id),
          requiredOrganization
        });
        if (onAccessDenied) {
          onAccessDenied('no_organization_access');
        }
        return null;
      }
    }
  }

  // All checks passed - render children
  logger.info('[ProtectedRoute] Access granted', {
    userId: user.id,
    role: profile.role
  });

  return children;
};

/**
 * Higher-order component wrapper for ProtectedRoute
 * Usage: withProtectedRoute(MyComponent, { requiredRole: 'admin' })
 */
export const withProtectedRoute = (Component, routeProps = {}) => {
  return (props) => (
    <ProtectedRoute {...routeProps}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

/**
 * Hook to check if user can access a route
 */
export const useCanAccess = ({ requiredRole = null, requiredOrganization = null } = {}) => {
  const { user, profile } = useStore();

  if (!user || !profile) {
    return false;
  }

  // Check role
  if (requiredRole) {
    const hasRole = profile.role === requiredRole || profile.is_super_admin;
    if (!hasRole) return false;
  }

  // Check organization
  if (requiredOrganization) {
    const hasOrg = profile.organizations?.some(org => org.id === requiredOrganization);
    const isSuperAdmin = profile.is_super_admin;
    if (!hasOrg && !isSuperAdmin) return false;
  }

  return true;
};

export default ProtectedRoute;
