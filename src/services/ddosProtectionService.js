/**
 * FASE 3.3: DDoS Protection Service
 * Detects and mitigates Distributed Denial of Service attacks
 * Circuit breakers, traffic pattern analysis, adaptive rate limiting
 */

import logger from '../utils/logger.js';

/**
 * DDoS protection configuration
 */
const DDOS_CONFIG = {
  requestsPerSecondThreshold: 100, // Requests per second from single IP
  requestsPerMinuteThreshold: 3000, // Requests per minute globally
  suspiciousPatternThreshold: 5, // Consecutive abnormal patterns
  circuitBreakerThreshold: 500, // Error rate before circuit opens
  adaptiveThrottling: true,
};

/**
 * Traffic monitoring
 */
let trafficWindow = new Map(); // IP -> [timestamps]
let globalTrafficWindow = [];
let suspiciousPatterns = new Map(); // IP -> {patterns, count, detected}
let circuitBreaker = {
  state: 'closed', // closed, open, half-open
  failureCount: 0,
  successCount: 0,
  lastStateChange: new Date(),
};

/**
 * Initialize DDoS protection
 */
export const initializeDDoSProtection = (config = {}) => {
  try {
    Object.assign(DDOS_CONFIG, config);

    // Start traffic analysis
    startTrafficAnalysis();

    logger.info('[DDoSProtection] DDoS protection initialized', {
      requestsPerSecondThreshold: DDOS_CONFIG.requestsPerSecondThreshold,
      adaptiveThrottling: DDOS_CONFIG.adaptiveThrottling,
    });

    return { success: true };
  } catch (err) {
    logger.error('[DDoSProtection] Exception initializing DDoS protection', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Analyze request for DDoS patterns
 */
export const analyzeRequest = (req) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    const timestamp = Date.now();

    // Check circuit breaker
    if (circuitBreaker.state === 'open') {
      logger.warn('[DDoSProtection] Circuit breaker OPEN - rejecting request', {
        clientIP,
      });
      return {
        allowed: false,
        reason: 'CIRCUIT_BREAKER_OPEN',
        retryAfter: 60,
      };
    }

    // Initialize IP window if needed
    if (!trafficWindow.has(clientIP)) {
      trafficWindow.set(clientIP, []);
    }

    const ipWindow = trafficWindow.get(clientIP);

    // Remove timestamps older than 1 second
    const oneSecondAgo = timestamp - 1000;
    const recentRequests = ipWindow.filter((t) => t > oneSecondAgo);
    trafficWindow.set(clientIP, recentRequests);

    // Check per-IP rate limit
    if (recentRequests.length >= DDOS_CONFIG.requestsPerSecondThreshold) {
      recordSuspiciousPattern(clientIP, 'HIGH_REQUEST_RATE');

      logger.warn('[DDoSProtection] Rate limit exceeded for IP', {
        clientIP,
        requestCount: recentRequests.length,
        threshold: DDOS_CONFIG.requestsPerSecondThreshold,
      });

      return {
        allowed: false,
        reason: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 5,
      };
    }

    // Check global rate limit
    const oneMinuteAgo = timestamp - 60000;
    const globalRecentRequests = globalTrafficWindow.filter((t) => t > oneMinuteAgo);

    if (globalRecentRequests.length >= DDOS_CONFIG.requestsPerMinuteThreshold) {
      recordSuspiciousPattern(clientIP, 'GLOBAL_RATE_LIMIT');

      logger.warn('[DDoSProtection] Global rate limit exceeded', {
        globalRequests: globalRecentRequests.length,
        threshold: DDOS_CONFIG.requestsPerMinuteThreshold,
      });

      return {
        allowed: false,
        reason: 'GLOBAL_RATE_LIMIT_EXCEEDED',
        retryAfter: 30,
      };
    }

    // Detect suspicious patterns
    const patterns = detectSuspiciousPatterns(req);
    if (patterns.length > 0) {
      patterns.forEach((p) => recordSuspiciousPattern(clientIP, p));
    }

    // Record timestamp
    ipWindow.push(timestamp);
    globalTrafficWindow.push(timestamp);

    return {
      allowed: true,
      patterns: patterns.length > 0 ? patterns : null,
    };
  } catch (err) {
    logger.error('[DDoSProtection] Exception analyzing request', {
      error: err.message,
    });
    return { allowed: true, error: err.message };
  }
};

/**
 * Detect suspicious patterns in request
 */
const detectSuspiciousPatterns = (req) => {
  const patterns = [];

  // Check for bot-like behavior (missing user agent)
  if (!req.headers['user-agent']) {
    patterns.push('MISSING_USER_AGENT');
  }

  // Check for suspicious referer
  if (req.headers['referer'] && /malicious|spam/i.test(req.headers['referer'])) {
    patterns.push('SUSPICIOUS_REFERER');
  }

  // Check for abnormal request paths
  const suspiciousPaths = ['/admin', '/config', '/.env', '/backup', '/database'];
  if (suspiciousPaths.some((p) => req.path?.startsWith(p))) {
    patterns.push('SUSPICIOUS_PATH');
  }

  // Check for rapid method switching
  if (req.method && /^(OPTIONS|HEAD|TRACE|CONNECT)$/.test(req.method)) {
    patterns.push('PROBE_REQUEST');
  }

  return patterns;
};

/**
 * Record suspicious pattern for IP
 */
const recordSuspiciousPattern = (clientIP, pattern) => {
  try {
    if (!suspiciousPatterns.has(clientIP)) {
      suspiciousPatterns.set(clientIP, {
        patterns: [],
        count: 0,
        detected: false,
      });
    }

    const record = suspiciousPatterns.get(clientIP);
    record.patterns.push(pattern);
    record.count++;

    if (record.count >= DDOS_CONFIG.suspiciousPatternThreshold) {
      record.detected = true;
      logger.warn('[DDoSProtection] Suspicious IP detected', {
        clientIP,
        patterns: [...new Set(record.patterns)],
        count: record.count,
      });
    }
  } catch (err) {
    logger.error('[DDoSProtection] Exception recording suspicious pattern', {
      clientIP,
      pattern,
      error: err.message,
    });
  }
};

/**
 * Start traffic analysis loop
 */
const startTrafficAnalysis = () => {
  setInterval(() => {
    try {
      // Clean up old data
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;

      // Clean IP windows
      for (const [ip, window] of trafficWindow.entries()) {
        const filtered = window.filter((t) => t > fiveMinutesAgo);
        if (filtered.length === 0) {
          trafficWindow.delete(ip);
          suspiciousPatterns.delete(ip);
        } else {
          trafficWindow.set(ip, filtered);
        }
      }

      // Clean global window
      globalTrafficWindow = globalTrafficWindow.filter((t) => t > fiveMinutesAgo);

      // Analyze patterns
      const ddosIndicators = analyzeDDoSIndicators();

      if (ddosIndicators.likelyUnderAttack) {
        transitionCircuitBreaker('open');
        logger.error('[DDoSProtection] LIKELY UNDER DDOS ATTACK', {
          indicators: ddosIndicators,
        });
      } else if (circuitBreaker.state === 'open') {
        transitionCircuitBreaker('half-open');
      }
    } catch (err) {
      logger.error('[DDoSProtection] Exception in traffic analysis', {
        error: err.message,
      });
    }
  }, 10000); // Every 10 seconds
};

/**
 * Analyze for DDoS indicators
 */
const analyzeDDoSIndicators = () => {
  try {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = globalTrafficWindow.filter((t) => t > oneMinuteAgo);

    const requestRate = recentRequests.length / 60; // Requests per second
    const suspiciousIPs = Array.from(suspiciousPatterns.values()).filter(
      (p) => p.detected
    ).length;
    const uniqueIPs = trafficWindow.size;

    return {
      requestRate: requestRate.toFixed(2),
      requestsPerMinute: recentRequests.length,
      suspiciousIPsDetected: suspiciousIPs,
      uniqueIPsCurrently: uniqueIPs,
      likelyUnderAttack:
        requestRate > DDOS_CONFIG.requestsPerSecondThreshold * 2 || suspiciousIPs > 10,
    };
  } catch (err) {
    logger.error('[DDoSProtection] Exception analyzing DDoS indicators', {
      error: err.message,
    });
    return { likelyUnderAttack: false };
  }
};

/**
 * Transition circuit breaker state
 */
const transitionCircuitBreaker = (newState) => {
  try {
    if (circuitBreaker.state === newState) return;

    circuitBreaker.state = newState;
    circuitBreaker.lastStateChange = new Date();

    if (newState === 'open') {
      circuitBreaker.failureCount = 0;
      circuitBreaker.successCount = 0;
    }

    logger.info('[DDoSProtection] Circuit breaker transitioned', {
      newState,
      timestamp: circuitBreaker.lastStateChange.toISOString(),
    });
  } catch (err) {
    logger.error('[DDoSProtection] Exception transitioning circuit breaker', {
      error: err.message,
    });
  }
};

/**
 * Record successful request (for circuit breaker)
 */
export const recordSuccess = () => {
  try {
    if (circuitBreaker.state === 'half-open') {
      circuitBreaker.successCount++;

      if (circuitBreaker.successCount >= 5) {
        transitionCircuitBreaker('closed');
        circuitBreaker.failureCount = 0;
      }
    }
  } catch (err) {
    logger.error('[DDoSProtection] Exception recording success', {
      error: err.message,
    });
  }
};

/**
 * Record failed request (for circuit breaker)
 */
export const recordFailure = () => {
  try {
    circuitBreaker.failureCount++;

    if (circuitBreaker.failureCount >= DDOS_CONFIG.circuitBreakerThreshold) {
      transitionCircuitBreaker('open');
    }
  } catch (err) {
    logger.error('[DDoSProtection] Exception recording failure', {
      error: err.message,
    });
  }
};

/**
 * Get DDoS protection status
 */
export const getDDoSStatus = () => {
  try {
    const indicators = analyzeDDoSIndicators();

    return {
      circuitBreakerState: circuitBreaker.state,
      ...indicators,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[DDoSProtection] Exception getting status', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

export default {
  initializeDDoSProtection,
  analyzeRequest,
  recordSuccess,
  recordFailure,
  getDDoSStatus,
};
