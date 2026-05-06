/**
 * FASE 3.2: Web Application Firewall (WAF) Configuration
 * Protects against common web attacks (SQL injection, XSS, etc.)
 * IP blocking, request filtering, rate limiting per IP
 */

import logger from '../utils/logger.js';

/**
 * WAF rules configuration
 */
const WAF_RULES = {
  SQL_INJECTION: {
    enabled: true,
    patterns: [
      /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/gi,
      /(--|;|\/\*|\*\/)/g,
      /(\bOR\b.*=.*|1=1)/gi,
    ],
    action: 'block',
    severity: 'high',
  },
  XSS: {
    enabled: true,
    patterns: [
      /<script[^>]*>.*?<\/script>/gi,
      /on\w+\s*=/gi,
      /(javascript:|vbscript:|data:text\/html)/gi,
      /<iframe[^>]*>/gi,
    ],
    action: 'block',
    severity: 'high',
  },
  PATH_TRAVERSAL: {
    enabled: true,
    patterns: [/\.\.\//g, /\.\./g, /%2e%2e/gi],
    action: 'block',
    severity: 'high',
  },
  COMMAND_INJECTION: {
    enabled: true,
    patterns: [/[`$(){}[\]|&;<>]/g],
    action: 'block',
    severity: 'critical',
  },
  MALICIOUS_HEADERS: {
    enabled: true,
    blockedHeaders: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'],
    action: 'sanitize',
    severity: 'medium',
  },
};

/**
 * IP reputation database
 */
let blockedIPs = new Set();
let suspiciousIPs = new Map(); // IP -> {violations, lastViolation}
let whitelistedIPs = new Set();

/**
 * Initialize WAF
 */
export const initializeWAF = (config = {}) => {
  try {
    // Load custom rules if provided
    if (config.customRules) {
      Object.assign(WAF_RULES, config.customRules);
    }

    // Load IP reputation lists
    if (config.blockedIPs) {
      blockedIPs = new Set(config.blockedIPs);
    }

    if (config.whitelistedIPs) {
      whitelistedIPs = new Set(config.whitelistedIPs);
    }

    logger.info('[WAF] Web Application Firewall initialized', {
      rulesCount: Object.keys(WAF_RULES).length,
      blockedIPsCount: blockedIPs.size,
      whitelistedIPsCount: whitelistedIPs.size,
    });

    return { success: true };
  } catch (err) {
    logger.error('[WAF] Exception initializing WAF', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Check request against WAF rules
 */
export const inspectRequest = (req) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    const violations = [];

    // Check IP whitelist
    if (whitelistedIPs.has(clientIP)) {
      logger.info('[WAF] Whitelisted IP allowed', { clientIP });
      return { allowed: true, violations: [] };
    }

    // Check IP blocklist
    if (blockedIPs.has(clientIP)) {
      logger.warn('[WAF] Blocked IP attempted access', { clientIP });
      return {
        allowed: false,
        violations: [{ rule: 'IP_BLOCKLIST', severity: 'critical' }],
      };
    }

    // Inspect request body
    const body = JSON.stringify(req.body || {});
    const headers = JSON.stringify(req.headers || {});
    const url = req.url || '';

    // SQL Injection check
    if (WAF_RULES.SQL_INJECTION.enabled) {
      const matches = body.match(WAF_RULES.SQL_INJECTION.patterns);
      if (matches) {
        violations.push({
          rule: 'SQL_INJECTION',
          severity: WAF_RULES.SQL_INJECTION.severity,
          matches: matches.slice(0, 3),
        });
      }
    }

    // XSS check
    if (WAF_RULES.XSS.enabled) {
      const matches = body.match(WAF_RULES.XSS.patterns);
      if (matches) {
        violations.push({
          rule: 'XSS',
          severity: WAF_RULES.XSS.severity,
          matches: matches.slice(0, 3),
        });
      }
    }

    // Path traversal check
    if (WAF_RULES.PATH_TRAVERSAL.enabled) {
      if (WAF_RULES.PATH_TRAVERSAL.patterns.some((p) => p.test(url))) {
        violations.push({
          rule: 'PATH_TRAVERSAL',
          severity: WAF_RULES.PATH_TRAVERSAL.severity,
        });
      }
    }

    // Command injection check
    if (WAF_RULES.COMMAND_INJECTION.enabled) {
      const matches = body.match(WAF_RULES.COMMAND_INJECTION.patterns);
      if (matches && matches.length > 5) {
        // Threshold to avoid false positives
        violations.push({
          rule: 'COMMAND_INJECTION',
          severity: WAF_RULES.COMMAND_INJECTION.severity,
        });
      }
    }

    // Malicious headers check
    if (WAF_RULES.MALICIOUS_HEADERS.enabled) {
      const foundMaliciousHeaders = WAF_RULES.MALICIOUS_HEADERS.blockedHeaders.filter(
        (h) => req.headers[h]
      );

      if (foundMaliciousHeaders.length > 0) {
        violations.push({
          rule: 'MALICIOUS_HEADERS',
          severity: WAF_RULES.MALICIOUS_HEADERS.severity,
          headers: foundMaliciousHeaders,
        });
      }
    }

    // Track suspicious activity
    if (violations.length > 0) {
      recordSuspiciousActivity(clientIP, violations);

      logger.warn('[WAF] Request violations detected', {
        clientIP,
        violationCount: violations.length,
        violations: violations.map((v) => v.rule),
      });
    }

    const allowed = violations.every((v) => v.severity !== 'critical');

    return {
      allowed,
      violations,
      clientIP,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[WAF] Exception inspecting request', {
      error: err.message,
    });
    return { allowed: false, error: err.message };
  }
};

/**
 * Record suspicious activity from IP
 */
const recordSuspiciousActivity = (clientIP, violations) => {
  try {
    const severity = Math.max(...violations.map((v) => {
      const severityMap = { low: 1, medium: 2, high: 3, critical: 4 };
      return severityMap[v.severity] || 1;
    }));

    if (!suspiciousIPs.has(clientIP)) {
      suspiciousIPs.set(clientIP, {
        violations: 0,
        lastViolation: new Date(),
        rules: [],
      });
    }

    const record = suspiciousIPs.get(clientIP);
    record.violations += violations.length;
    record.lastViolation = new Date();
    record.rules.push(...violations.map((v) => v.rule));

    // Auto-block after 10 violations
    if (record.violations >= 10) {
      blockIP(clientIP);
      logger.warn('[WAF] IP auto-blocked due to excessive violations', {
        clientIP,
        violations: record.violations,
      });
    }
  } catch (err) {
    logger.error('[WAF] Exception recording suspicious activity', {
      clientIP,
      error: err.message,
    });
  }
};

/**
 * Block an IP address
 */
export const blockIP = (ipAddress) => {
  try {
    blockedIPs.add(ipAddress);

    logger.info('[WAF] IP address blocked', { ipAddress });

    return { success: true, ipAddress };
  } catch (err) {
    logger.error('[WAF] Exception blocking IP', {
      ipAddress,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Unblock an IP address
 */
export const unblockIP = (ipAddress) => {
  try {
    blockedIPs.delete(ipAddress);

    logger.info('[WAF] IP address unblocked', { ipAddress });

    return { success: true, ipAddress };
  } catch (err) {
    logger.error('[WAF] Exception unblocking IP', {
      ipAddress,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Whitelist an IP address
 */
export const whitelistIP = (ipAddress) => {
  try {
    whitelistedIPs.add(ipAddress);
    blockedIPs.delete(ipAddress); // Remove from blocked if present

    logger.info('[WAF] IP address whitelisted', { ipAddress });

    return { success: true, ipAddress };
  } catch (err) {
    logger.error('[WAF] Exception whitelisting IP', {
      ipAddress,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get WAF statistics
 */
export const getWAFStatistics = () => {
  try {
    const suspiciousArray = Array.from(suspiciousIPs.entries()).map(([ip, data]) => ({
      ip,
      ...data,
      rules: [...new Set(data.rules)],
    }));

    return {
      blockedIPsCount: blockedIPs.size,
      whitelistedIPsCount: whitelistedIPs.size,
      suspiciousIPsCount: suspiciousIPs.size,
      enabledRules: Object.keys(WAF_RULES).filter((r) => WAF_RULES[r].enabled),
      topSuspiciousIPs: suspiciousArray
        .sort((a, b) => b.violations - a.violations)
        .slice(0, 10),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[WAF] Exception getting statistics', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Sanitize request data
 */
export const sanitizeRequest = (req) => {
  try {
    // Remove potentially dangerous headers
    const sanitized = { ...req };

    WAF_RULES.MALICIOUS_HEADERS.blockedHeaders.forEach((header) => {
      delete sanitized.headers[header];
    });

    return sanitized;
  } catch (err) {
    logger.error('[WAF] Exception sanitizing request', {
      error: err.message,
    });
    return req;
  }
};

export default {
  initializeWAF,
  inspectRequest,
  blockIP,
  unblockIP,
  whitelistIP,
  getWAFStatistics,
  sanitizeRequest,
};
