import logger from '../utils/logger.js';
import React, { useState } from 'react';
import { useTenant } from './TenantContext';

/**
 * OrganizationSwitcher Component
 * 
 * Provides UI for users to switch between organizations they belong to.
 * Displays current organization and lists available organizations.
 * 
 * Features:
 * - Dropdown menu of available organizations
 * - Current organization indicator
 * - Role badge for each organization
 * - Keyboard navigation support
 * - Click-outside handling to close menu
 * 
 * Usage:
 * <OrganizationSwitcher />
 * 
 * or with custom styling:
 * <OrganizationSwitcher variant="compact" />
 */
export const OrganizationSwitcher = ({ variant = 'default', onOrgChange }) => {
  const { currentOrg, availableOrganizations, switchOrganization } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOrgSwitch = async (orgId) => {
    setIsLoading(true);
    try {
      await switchOrganization(orgId);
      setIsOpen(false);
      if (onOrgChange) {
        onOrgChange(orgId);
      }
    } catch (error) {
      logger.error('Failed to switch organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest('[data-org-switcher]')) {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  if (!currentOrg || availableOrganizations.length === 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div
        data-org-switcher
        className="relative inline-block"
        aria-label="Organization switcher"
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
          disabled={isLoading}
        >
          <span className="text-sm font-medium truncate maw-w-xs">
            {currentOrg.name}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="p-2 max-h-80 overflow-y-auto">
              {availableOrganizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleOrgSwitch(org.id)}
                  disabled={isLoading || org.id === currentOrg.id}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    org.id === currentOrg.id
                      ? 'bg-blue-50 text-blue-900'
                      : 'hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{org.name}</span>
                    {org.id === currentOrg.id && (
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default variant - full width card style
  return (
    <div data-org-switcher className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Current Organization
      </label>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isLoading}
          aria-expanded={isOpen}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{currentOrg.name}</div>
              <div className="text-xs text-gray-500">{currentOrg.id}</div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl z-50">
            <div className="p-2 max-h-96 overflow-y-auto">
              {availableOrganizations.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-500">
                  No organizations available
                </div>
              ) : (
                availableOrganizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleOrgSwitch(org.id)}
                    disabled={isLoading || org.id === currentOrg.id}
                    className={`w-full text-left px-4 py-3 rounded-md transition-colors border-b border-gray-100 last:border-0 ${
                      org.id === currentOrg.id
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {org.name}
                        </div>
                        {org.description && (
                          <div className="text-xs text-gray-500">
                            {org.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {org.role && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {org.role}
                          </span>
                        )}
                        {org.id === currentOrg.id && (
                          <svg
                            className="w-5 h-5 text-blue-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              y}
            </div>
          </div>
        )}
      </div>

      {availableOrganizations.length <= 1 && (
        <p className="text-xs text-gray-500">
          You are a member of {availableOrganizations.length} organization
        </p>
      )}
  
  
  </div>
  );
};

/**
 * OrganizationInfo Component
 * 
 * Displays current organization information as a compact badge
 * Useful for sidebar or header placement
 * 
 * Usage:
 * <OrganizationInfo />
 */
export const OrganizationInfo = () => {
  const { currentOrg, userRole } = useTenant();
  
  if (!currentOrg) return null;
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 border border-blue-200">
      <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center">
        <span className="text-xs font-bold text-blue-800">
          {currentOrg.name.substring(0, 1).toUpperCase()}
        </span>
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900">
          {currentOrg.name}
        </div>
        <div className="text-xs text-gray-600">{userRole}</div>
      </div>
    </div>
  
    
   );
};

/**
 * useOrganizationContext Hook
 * 
 * Custom hook for accessing organization context in components
 * More convenient than importing useTenant directly
 */
export const useOrganization = () => {
  const { currentOrg, availableOrganizations, switchOrganization, userRole } =
    useTenant();
  
  return {
    currentOrg,
    availableOrganizations,
    switchOrganization,
    userRole,
  };
};

export default OrganizationSwitcher;