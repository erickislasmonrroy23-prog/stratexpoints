/**
 * useApiAuth Hook
 * Manages authentication between Supabase and backend API
 * Automatically generates/refreshes API tokens from Supabase session
 */

import { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import logger from '../utils/logger.js';
import {
  apiAuthService,
  getAuthToken,
} from '../services/apiClientService.js';

export const useApiAuth = () => {
  const [isAuthenticated, isAuthenticatedSet] = useState(false);
  const [isLoading, isLoadingSet] = useState(true);
  const [backendStatus] = useState({ status: 'supabase-only' });

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get current Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          logger.warn('[useApiAuth] No active session');
          isAuthenticatedSet(false);
          isLoadingSet(false);
          return;
        }

        // Extract JWT from session and store it for API calls
        const idToken = session.access_token;
        await apiAuthService.generateApiToken(idToken);

        // No backend server — app uses Supabase directly
        isAuthenticatedSet(true);
        logger.info('[useApiAuth] Supabase session active');
      } catch (err) {
        logger.error('[useApiAuth] Auth initialization failed', {
          error: err.message,
        });
        isAuthenticatedSet(false);
      } finally {
        isLoadingSet(false);
      }
    };

    initAuth();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        logger.info('[useApiAuth] User signed in');
        const idToken = session.access_token;
        await apiAuthService.generateApiToken(idToken);
        isAuthenticatedSet(true);
      } else if (event === 'SIGNED_OUT') {
        logger.info('[useApiAuth] User signed out');
        apiAuthService.logout();
        isAuthenticatedSet(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        logger.info('[useApiAuth] Token refreshed');
        const idToken = session.access_token;
        await apiAuthService.generateApiToken(idToken);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return {
    isAuthenticated,
    isLoading,
    backendStatus,
    getToken: getAuthToken,
  };
};

export default useApiAuth;
