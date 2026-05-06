/**
 * FASE 4.1: API Gateway & Rate Limiting Service
 * Manages request throttling, rate limiting, quota management, and API access control
 * Token bucket algorithm, per-user/per-IP/per-endpoint limiting, adaptive throttling
 */

import logger from '../utils/logger.js';

/**
 * API Gateway Configuration
 */
const GATEWAY_CONFIG = {
  rateLimitingEnabled: true,
  globalRateLimit: 10000, // requests per hour globally
  perIpLimit: 1000, // requests per hour per IP
  perUserLimit: 5000, // requests per hour per authenticated user
  perEndpointLimit: 500, // requests per hour per endpoint
  adaptiveThrottling: true,
  adaptiveThrottlingThreshold: 80, // percentage of limit
  burstAllowance: 1.5, // allow 50% burst above sustained rate
  cleanupInterval: 3600000, // 1 hour
};

/**
 * Rate limiting storage
 */
let rateLimitBuckets = new Map(); // IP/user/endpoint -> token bucket
let requestHistory = []; // Track all requests for analytics
let rateLimitEvents = []; // Track rate limit violations

/**
 * Initialize API Gateway service
 */
export const initializeAPIGateway = (config = {}) => {
  try {
    Object.assign(GATEWAY_CONFIG, config);

    // Start cleanup interval
    startBucketCleanup();

    logger.info('[APIGateway] API Gateway service initialized', {
      rateLimitingEnabled: GATEWAY_CONFIG.rateLimitingEnabled,
      globalRateLimit: GATEWAY_CONFIG.globalRateLimit,
      adaptiveThrottling: GATEWAY_CONFIG.adaptiveThrottling,
    });

    return { success: true };
  } catch (err) {
    logger.error('[APIGateway] Exception initializing API Gateway', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Check rate limit for request
 */
export const checkRateLimit = (identifier, identifierType = 'ip', endpoint = '/') => {
  try {
    if (!GATEWAY_CONFIG.rateLimitingEnabled) {
      return { allowed: true, remaining: GATEWAY_CONFIG.perIpLimit };
    }

    const bucketKey = `${identifierType}:${identifier}:${endpoint}`;
    const now = Date.now();
    const windowSize = 3600000; // 1 hour

    // Get or create bucket
    let bucket = rateLimitBuckets.get(bucketKey);
    if (!bucket) {
      const limit = determineLimit(identifierType, endpoint);
      bucket = {
        identifier,
        identifierType,
        endpoint,
        tokens: limit,
        maxTokens: limit,
        lastRefillTime: now,
        createdAt: now,
        violations: 0,
      };
      rateLimitBuckets.set(bucketKey, bucket);
    }

    // Refill tokens based on elapsed time
    const timePassed = now - bucket.lastRefillTime;
    const tokensToAdd = (timePassed / windowSize) * bucket.maxTokens;
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefillTime = now;

    // Check if request allowed
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;

      requestHistory.push({
        identifier,
        identifierType,
        endpoint,
        timestamp: new Date(),
        allowed: true,
      });

      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetTime: new Date(bucket.lastRefillTime + windowSize).toISOString(),
        limit: bucket.maxTokens,
      };
    } else {
      bucket.violations++;

      rateLimitEvents.push({
        identifier,
        identifierType,
        endpoint,
        timestamp: new Date(),
        violations: bucket.violations,
      });

      logger.warn('[APIGateway] Rate limit exceeded', {
        identifier,
        identifierType,
        endpoint,
        violations: bucket.violations,
      });

      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((windowSize - timePassed) / 1000),
        message: 'Rate limit exceeded',
      };
    }
  } catch (err) {
    logger.error('[APIGateway] Exception checking rate limit', {
      error: err.message,
    });
    return { allowed: true, error: err.message }; // Fail open for availability
  }
};

/**
 * Determine limit based on identifier type and endpoint
 */
const determineLimit = (identifierType, endpoint) => {
  switch (identifierType) {
    case 'user':
      return GATEWAY_CONFIG.perUserLimit;
    case 'endpoint':
      return GATEWAY_CONFIG.perEndpointLimit;
    case 'ip':
    default:
      return GATEWAY_CONFIG.perIpLimit;
  }
};

/**
 * Start bucket cleanup interval
 */
const startBucketCleanup = () => {
  setInterval(() => {
    try {
      const now = Date.now();
      const maxAge = 86400000; // 24 hours
      let cleanedCount = 0;

      for (const [key, bucket] of rateLimitBuckets.entries()) {
        if (now - bucket.createdAt > maxAge) {
          rateLimitBuckets.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info('[APIGateway] Cleaned expired buckets', { count: cleanedCount });
      }
    } catch (err) {
      logger.error('[APIGateway] Exception in bucket cleanup', {
        error: err.message,
      });
    }
  }, GATEWAY_CONFIG.cleanupInterval);
};

/**
 * Get rate limit status for identifier
 */
export const getRateLimitStatus = (identifier, identifierType = 'ip') => {
  try {
    const buckets = Array.from(rateLimitBuckets.entries())
      .filter(([key]) => key.startsWith(`${identifierType}:${identifier}`))
      .map(([key, bucket]) => ({
        endpoint: bucket.endpoint,
        remaining: Math.floor(bucket.tokens),
        limit: bucket.maxTokens,
        violations: bucket.violations,
      }));

    return {
      success: true,
      identifier,
      identifierType,
      endpoints: buckets,
      totalViolations: buckets.reduce((sum, b) => sum + b.violations, 0),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[APIGateway] Exception getting rate limit status', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get gateway metrics
 */
export const getGatewayMetrics = () => {
  try {
    const now = new Date();
    const last24Hours = requestHistory.filter(
      (r) => new Date(r.timestamp) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );

    const violations = rateLimitEvents.filter(
      (e) => new Date(e.timestamp) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );

    const allowedCount = last24Hours.filter((r) => r.allowed).length;
    const blockedCount = last24Hours.filter((r) => !r.allowed).length;

    return {
      success: true,
      last24HourMetrics: {
        totalRequests: last24Hours.length,
        allowedRequests: allowedCount,
        blockedRequests: blockedCount,
        blockRate: last24Hours.length > 0 ? (blockedCount / last24Hours.length * 100).toFixed(2) : 0,
      },
      violations: violations.length,
      activeBuckets: rateLimitBuckets.size,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[APIGateway] Exception getting gateway metrics', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Reset rate limit for identifier
 */
export const resetRateLimit = (identifier, identifierType = 'ip') => {
  try {
    let resetCount = 0;

    for (const [key] of rateLimitBuckets.entries()) {
      if (key.startsWith(`${identifierType}:${identifier}`)) {
        rateLimitBuckets.delete(key);
        resetCount++;
      }
    }

    logger.info('[APIGateway] Rate limit reset', {
      identifier,
      identifierType,
      bucketsReset: resetCount,
    });

    return { success: true, bucketsReset: resetCount };
  } catch (err) {
    logger.error('[APIGateway] Exception resetting rate limit', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get gateway status
 */
export const getGatewayStatus = () => {
  try {
    return {
      success: true,
      rateLimitingEnabled: GATEWAY_CONFIG.rateLimitingEnabled,
      globalRateLimit: GATEWAY_CONFIG.globalRateLimit,
      perIpLimit: GATEWAY_CONFIG.perIpLimit,
      perUserLimit: GATEWAY_CONFIG.perUserLimit,
      perEndpointLimit: GATEWAY_CONFIG.perEndpointLimit,
      adaptiveThrottling: GATEWAY_CONFIG.adaptiveThrottling,
      activeBuckets: rateLimitBuckets.size,
      recentViolations: rateLimitEvents.slice(-50).reverse(),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[APIGateway] Exception getting gateway status', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

export default {
  initializeAPIGateway,
  checkRateLimit,
  getRateLimitStatus,
  getGatewayMetrics,
  resetRateLimit,
  getGatewayStatus,
};
