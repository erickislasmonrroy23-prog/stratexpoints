import { supabase } from '../supabase.js';

/**
 * JWT Token Management Utilities
 * Handles token lifecycle, auto-refresh, and API calls with token validation
 */

/**
 * Get current JWT access token from session
 * @returns {string|null} Access token or null if no session
 */
export const getCurrentJWT = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

/**
 * Decode JWT payload without verification
 * @param {string} token JWT token
 * @returns {object|null} Decoded payload
 */
export const decodeJWT = (token) => {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(atob(parts[1]));
    return decoded;
  } catch (err) {
    logger.error('[JWT] Decode error:', err);
    return null;
  }
};

/**
 * Check if token is near expiry (< 5 minutes remaining)
 * @returns {boolean} True if token expires in < 5 minutes
 */
export const isTokenNearExpiry = async () => {
  const token = await getCurrentJWT();
  if (!token) return false;

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return false;

  const expiryTime = decoded.exp * 1000; // Convert to ms
  const now = Date.now();
  const timeUntilExpiry = expiryTime - now;

  // Return true if less than 5 minutes (300,000 ms) remaining
  return timeUntilExpiry < 300000;
};

/**
 * Get token expiry time
 * @returns {Date|null} Expiry date or null
 */
export const getTokenExpiry = async () => {
  const token = await getCurrentJWT();
  if (!token) return null;

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return null;

  return new Date(decoded.exp * 1000);
};

/**
 * Get current token claims without HTTP call
 * @returns {object|null} Token claims (payload)
 */
export const getTokenInfo = async () => {
  const token = await getCurrentJWT();
  return decodeJWT(token);
};

/**
 * Refresh JWT access token
 * @returns {boolean} True if refresh successful
 */
export const refreshJWT = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      logger.error('[JWT] Refresh error:', error);
      return false;
    }
    if (data.session) {
      logger.log('[JWT] Token refreshed successfully');
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[JWT] Refresh exception:', err);
    return false;
  }
};

/**
 * Check if session is valid and not expired
 * @returns {boolean} True if valid session exists
 */
export const hasValidSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const token = session.access_token;
  const decoded = decodeJWT(token);

  if (!decoded || !decoded.exp) return false;

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp > now;
};

/**
 * Auto-refresh token if near expiry
 * @returns {boolean} True if refresh occurred or not needed
 */
export const autoRefreshIfNeeded = async () => {
  if (await isTokenNearExpiry()) {
    logger.log('[JWT] Token near expiry, refreshing...');
    return await refreshJWT();
  }
  return true;
};

/**
 * Make Supabase API call with automatic token refresh
 * Handles 401 responses by refreshing token and retrying
 * @param {string} url API endpoint URL
 * @param {object} options Request options
 * @returns {object} Response data
 */
export const supabaseApiCall = async (url, options = {}) => {
  // Auto-refresh if needed
  await autoRefreshIfNeeded();

  const token = await getCurrentJWT();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle 401 - token may have expired, refresh and retry once
    if (response.status === 401) {
      logger.log('[JWT] Received 401, attempting token refresh...');
      const refreshed = await refreshJWT();

      if (refreshed) {
        const newToken = await getCurrentJWT();
        const retryHeaders = {
          ...headers,
          'Authorization': `Bearer ${newToken}`
        };

        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders
        });

        return {
          ok: retryResponse.ok,
          status: retryResponse.status,
          data: await retryResponse.json(),
          headers: retryResponse.headers
        };
      } else {
        throw new Error('Token refresh failed');
      }
    }

    const data = await response.json();
    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: response.headers
    };
  } catch (err) {
    logger.error('[JWT] API call error:', err);
    throw err;
  }
};

/**
 * Call Supabase Edge Function with JWT token
 * @param {string} functionName Edge function name
 * @param {object} body Request body
 * @returns {object} Response data
 */
export const callEdgeFunction = async (functionName, body = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('No valid session');
  }

  const url = `${supabase.supabaseUrl}/functions/v1/${functionName}`;

  return supabaseApiCall(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
};

/**
 * Generic API call wrapper with automatic token management
 * @param {string} endpoint API endpoint (relative to supabase URL)
 * @param {object} options Request options
 * @returns {object} Response
 */
export const apiCall = async (endpoint, options = {}) => {
  if (endpoint.startsWith('functions/')) {
    // Edge function call
    const functionName = endpoint.replace('functions/', '');
    return callEdgeFunction(functionName, options.body);
  } else {
    // Regular Supabase API call
    const url = `${supabase.supabaseUrl}/rest/v1/${endpoint}`;
    return supabaseApiCall(url, options);
  }
};

/**
 * Initialize JWT monitoring (optional)
 * Can be called on app startup to log token state
 */
export const initializeJWTMonitoring = async () => {
  const valid = await hasValidSession();
  const expiry = await getTokenExpiry();
  const info = await getTokenInfo();

  logger.log('[JWT] Session initialized:', {
    valid,
    expiry: expiry?.toISOString(),
    user_id: info?.sub,
    expires_at: new Date(info?.exp * 1000).toISOString()
  });

  return {
    valid,
    expiry,
    info
  };
};

export default {
  getCurrentJWT,
  decodeJWT,
  isTokenNearExpiry,
  getTokenExpiry,
  getTokenInfo,
  refreshJWT,
  hasValidSession,
  autoRefreshIfNeeded,
  supabaseApiCall,
  callEdgeFunction,
  apiCall,
  initializeJWTMonitoring
};
