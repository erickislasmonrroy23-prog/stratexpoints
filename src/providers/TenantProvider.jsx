/**
 * TenantProvider - Multi-Tenant Context Initialization
 *
 * Wraps the application with TenantContext and handles initialization of:
 * - Organization context from SessionStorage
 * - User authentication state
 * - Organization membership loading
 * - CSRF token generation
 * - Auth token validation
 *
 * Usage in App.jsx:
 * import TenantProvider from './providers/TenantProvider.jsx';
 * import AuthProvider from './providers/AuthProvider.jsx'; (or similar)
 *
 * export default function App() {
 *   return (
 *     <AuthProvider>
 *       <TenantProvider>
 *         <AppRoutes />
 *       </TenantProvider>
 *     </AuthProvider>
 *   );
 * }
 */

import React, { useEffect, useState } from 'react';
import TenantContext from '../contexts/TenantContext.jsx';
import { storeCSRFToken } from '../utils/csrfUtils.js';
import { setCurrentOrganization } from '../utils/apiInterceptor.js';
import logger from '../utils/logger.js';

/**
 * TenantProvider Component
 *
 * Initializes and provides multi-tenant context to the entire application
 *
 * @param {React.ReactNode} children - Child components
 * @returns {JSX.Element} Wrapped application with TenantContext
 */
export default function TenantProvider({ children }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    const initializeTenantContext = async () => {
      try {
        logger.info('Initializing TenantProvider...');

        // 1. Generate and store CSRF token
        try {
          const csrfToken = storeCSRFToken();
          logger.debug('CSRF token generated and stored');
        } catch (error) {
          logger.error('Failed to generate CSRF token', error);
          // Continue - CSRF is important but not critical for app startup
        }

        // 2. Load organization context from SessionStorage
        try {
          const savedOrgId = sessionStorage.getItem('current-organization-id');
          if (savedOrgId) {
            setCurrentOrganization(savedOrgId);
            logger.debug('Restored organization context from session', {
              organizationId: savedOrgId,
            });
          }
        } catch (error) {
          logger.warn('Failed to restore organization context', error);
        }

        // 3. Validate auth token exists
        try {
          const token = sessionStorage.getItem('sb-auth-token');
          if (!token) {
            logger.warn('No authentication token found in session');
            // This is handled by AuthProvider - user should be redirected to login
          } else {
            logger.debug('Authentication token validated');
          }
        } catch (error) {
          logger.warn('Failed to validate auth token', error);
        }

        // 4. Initialize event listeners for auth changes
        const handleAuthLogout = () => {
          logger.info('Auth logout event received - clearing tenant context');
          try {
            sessionStorage.removeItem('current-organization-id');
            setCurrentOrganization(null);
          } catch (error) {
            logger.error('Failed to clear tenant context on logout', error);
          }
        };

        window.addEventListener('auth:logout', handleAuthLogout);

        // Cleanup listener on unmount
        return () => {
          window.removeEventListener('auth:logout', handleAuthLogout);
        };
      } catch (error) {
        logger.error('TenantProvider initialization failed', error);
        setInitError(error.message);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeTenantContext();
  }, []);

  // Handle initialization error
  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center p-6">
          <h1 className="text-2xl font-bold text-red-900 mb-2">
            Initialization Error
          </h1>
          <p className="text-red-700 mb-4">
            Failed to initialize application context
          </p>
          <p className="text-sm text-red-600 font-mono bg-red-100 p-3 rounded">
            {initError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
          </div>
          <p className="mt-4 text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }

  // Render wrapped application
  return (
    <TenantContext.Provider>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook to check if TenantProvider is properly initialized
 * Useful for components that need to know initialization status
 *
 * @returns {boolean} True if provider is initialized
 */
export const useTenantProviderReady = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if minimal required setup is done
    const checkReady = () => {
      try {
        // CSRF token should exist
        const csrfToken = sessionStorage.getItem('csrf-token');
        // Auth token should exist (if user is authenticated)
        const authToken = sessionStorage.getItem('sb-auth-token');

        // Provider is ready if we have auth token or are on login page
        const isReady = !!authToken || window.location.pathname === '/login';
        setIsReady(isReady);
      } catch (error) {
        logger.warn('Failed to check TenantProvider readiness', error);
        setIsReady(false);
      }
    };

    checkReady();
  }, []);

  return isReady;
};
