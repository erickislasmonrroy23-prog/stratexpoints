/**
 * API Wrapper Utility for StratexPoints
 *
 * Provides structured error handling for all API calls
 * Automatically catches errors, logs them, and returns structured responses
 *
 * Usage:
 * import { apiCall } from './utils/apiWrapper.js';
 *
 * const { data, error } = await apiCall(
 *   () => supabase.from('okrs').select('*'),
 *   'Failed to fetch OKRs'
 * );
 *
 * if (error) {
 *   notificationService.error(error.message);
 *   return;
 * }
 */

import logger from './logger.js';

/**
 * Custom error class for structured error handling
 */
export class APIError extends Error {
  constructor(message, code = 'API_ERROR', originalError = null, context = {}) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp
    };
  }
}

/**
 * Structured response object returned by apiCall
 */
class APIResponse {
  constructor(success, data = null, error = null) {
    this.ok = success;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Execute an API call with comprehensive error handling
 *
 * @param {Function} apiFunction - Async function that makes the API call
 * @param {string} errorMessage - User-friendly error message
 * @param {Object} options - Additional options
 * @param {boolean} options.logError - Whether to log errors (default: true)
 * @param {any} options.context - Additional context for logging
 * @returns {Promise<{ok: boolean, data: any, error: APIError|null}>}
 */
export const apiCall = async (apiFunction, errorMessage = 'An error occurred', options = {}) => {
  const { logError = true, context = {} } = options;

  try {
    if (typeof apiFunction !== 'function') {
      throw new Error('apiFunction must be a function');
    }

    const startTime = performance.now();
    const result = await apiFunction();
    const duration = performance.now() - startTime;

    // Check for Supabase error format
    if (result && result.error) {
      const error = new APIError(
        result.error.message || errorMessage,
        result.error.code || 'SUPABASE_ERROR',
        result.error,
        { ...context, supabaseError: result.error }
      );

      if (logError) {
        logger.warn(`API Warning: ${errorMessage}`, error);
      }

      return new APIResponse(false, null, error);
    }

    // Log performance for successful calls
    if (duration > 1000) {
      logger.performance('Slow API Call', duration, { errorMessage, context });
    }

    return new APIResponse(true, result.data || result, null);
  } catch (error) {
    const apiError = new APIError(
      error.message || errorMessage,
      error.code || 'NETWORK_ERROR',
      error,
      context
    );

    if (logError) {
      logger.error(errorMessage, apiError, context);
    }

    return new APIResponse(false, null, apiError);
  }
};

/**
 * Execute multiple API calls in parallel with error handling
 *
 * @param {Array<Function>} apiFunctions - Array of async API functions
 * @param {string} errorMessage - User-friendly error message
 * @param {Object} options - Additional options
 * @returns {Promise<{ok: boolean, data: any[], errors: APIError[]}>}
 */
export const apiCallBatch = async (apiFunctions, errorMessage = 'Batch operation failed', options = {}) => {
  const { logError = true, context = {} } = options;

  try {
    const results = await Promise.allSettled(
      apiFunctions.map(fn => (typeof fn === 'function' ? fn() : Promise.resolve(fn)))
    );

    const data = [];
    const errors = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const value = result.value;
        // Check for Supabase error in fulfilled promise
        if (value && value.error) {
          const error = new APIError(
            value.error.message || `Item ${index} failed`,
            value.error.code || 'SUPABASE_ERROR',
            value.error,
            { ...context, index }
          );
          errors.push(error);
        } else {
          data.push(value);
        }
      } else {
        const error = new APIError(
          result.reason?.message || `Item ${index} failed`,
          'BATCH_ERROR',
          result.reason,
          { ...context, index }
        );
        errors.push(error);
      }
    });

    if (errors.length > 0 && logError) {
      logger.warn(`${errorMessage} (${errors.length}/${results.length} failed)`, {
        errors: errors.map(e => e.toJSON())
      });
    }

    return {
      ok: errors.length === 0,
      data,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    const apiError = new APIError(
      error.message || errorMessage,
      'BATCH_NETWORK_ERROR',
      error,
      context
    );

    if (logError) {
      logger.error(errorMessage, apiError, context);
    }

    return {
      ok: false,
      data: [],
      errors: [apiError]
    };
  }
};

/**
 * Retry an API call with exponential backoff
 *
 * @param {Function} apiFunction - Async function that makes the API call
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 100)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 5000)
 * @param {Function} options.shouldRetry - Function to determine if should retry (default: retries on any error)
 * @returns {Promise<APIResponse>}
 */
export const apiCallWithRetry = async (apiFunction, options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 5000,
    shouldRetry = () => true,
    context = {}
  } = options;

  let lastError = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiFunction();

      // If successful, return immediately
      if (!result || !result.error) {
        return new APIResponse(true, result.data || result, null);
      }

      lastError = result.error;

      // Check if should retry this error
      if (!shouldRetry(result.error) || attempt === maxRetries) {
        const error = new APIError(
          result.error.message || 'API call failed',
          result.error.code || 'API_ERROR',
          result.error,
          { ...context, attempts: attempt + 1 }
        );
        return new APIResponse(false, null, error);
      }

      // Wait before retrying
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, maxDelay); // Exponential backoff
      }
    } catch (error) {
      lastError = error;

      // Check if should retry this error
      if (!shouldRetry(error) || attempt === maxRetries) {
        const apiError = new APIError(
          error.message || 'API call failed',
          'RETRY_ERROR',
          error,
          { ...context, attempts: attempt + 1 }
        );
        return new APIResponse(false, null, apiError);
      }

      // Wait before retrying
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, maxDelay);
      }
    }
  }

  // All retries exhausted
  const finalError = new APIError(
    lastError?.message || 'API call failed after retries',
    'MAX_RETRIES_EXCEEDED',
    lastError,
    { ...context, attempts: maxRetries + 1 }
  );

  return new APIResponse(false, null, finalError);
};

/**
 * Validate API response structure
 *
 * @param {any} response - Response to validate
 * @param {Array<string>} requiredFields - Required fields in response
 * @returns {APIError|null} - Error if validation fails, null if valid
 */
export const validateAPIResponse = (response, requiredFields = []) => {
  if (!response) {
    return new APIError('Response is null or undefined', 'INVALID_RESPONSE');
  }

  if (typeof response !== 'object') {
    return new APIError('Response is not an object', 'INVALID_RESPONSE');
  }

  for (const field of requiredFields) {
    if (!(field in response)) {
      return new APIError(
        `Missing required field: ${field}`,
        'MISSING_REQUIRED_FIELD',
        null,
        { requiredFields, missingField: field }
      );
    }
  }

  return null;
};

export default { apiCall, apiCallBatch, apiCallWithRetry, validateAPIResponse, APIError };
