/**
 * FASE 3.5: SSL/TLS Certificate Management Service
 * Manages certificate lifecycle, automated renewal, HSTS configuration
 * Certificate pinning, expiration monitoring, compliance validation
 */

import { supabase } from '../supabase.js';
import logger from '../utils/logger.js';

/**
 * SSL/TLS Configuration
 */
const SSL_CONFIG = {
  certificateProvider: 'letsencrypt', // letsencrypt, digicert, comodo
  autoRenewalEnabled: true,
  renewalDaysBeforeExpiry: 30, // Renew 30 days before expiry
  hstsEnabled: true,
  hstsMaxAge: 31536000, // 1 year in seconds
  hstsIncludeSubdomains: true,
  hstsPreload: true,
  certificatePinningEnabled: true,
  tlsVersions: ['TLSv1.2', 'TLSv1.3'],
  cipherSuites: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-CHACHA20-POLY1305',
  ],
};

/**
 * Certificate storage
 */
let certificates = new Map(); // domain -> certificate details
let pinningKeys = new Map(); // domain -> pin hashes
let certificateHistory = [];

/**
 * Initialize SSL/TLS service
 */
export const initializeSSLService = (config = {}) => {
  try {
    Object.assign(SSL_CONFIG, config);

    // Start renewal monitoring
    startCertificateRenewalMonitoring();

    logger.info('[SSLService] SSL/TLS service initialized', {
      autoRenewalEnabled: SSL_CONFIG.autoRenewalEnabled,
      hstsEnabled: SSL_CONFIG.hstsEnabled,
      certificatePinningEnabled: SSL_CONFIG.certificatePinningEnabled,
      tlsVersions: SSL_CONFIG.tlsVersions,
    });

    return { success: true };
  } catch (err) {
    logger.error('[SSLService] Exception initializing SSL service', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Install certificate for domain
 */
export const installCertificate = async (domain, certificateData) => {
  try {
    const cert = {
      domain,
      certificatePem: certificateData.certificate,
      privateKeyPem: certificateData.privateKey,
      chainPem: certificateData.chain,
      issuer: certificateData.issuer || 'Let\'s Encrypt',
      issuedAt: new Date(),
      expiresAt: certificateData.expiryDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'active',
      version: certificateData.version || '1.0',
      fingerprint: generateCertificateFingerprint(certificateData.certificate),
    };

    certificates.set(domain, cert);
    certificateHistory.push({
      ...cert,
      action: 'installed',
      timestamp: new Date(),
    });

    logger.info('[SSLService] Certificate installed', {
      domain,
      issuer: cert.issuer,
      expiresAt: cert.expiresAt.toISOString(),
    });

    return { success: true, domain, certificate: cert };
  } catch (err) {
    logger.error('[SSLService] Exception installing certificate', {
      domain,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Generate certificate fingerprint
 */
const generateCertificateFingerprint = (certificatePem) => {
  try {
    // In production, use crypto library to generate SHA256 fingerprint
    // For simulation, generate a deterministic hash
    const hash = certificatePem
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `sha256/${Buffer.from(hash.toString()).toString('base64')}`;
  } catch (err) {
    logger.error('[SSLService] Exception generating fingerprint', { error: err.message });
    return 'sha256/default-fingerprint';
  }
};

/**
 * Add certificate pin for domain
 */
export const addCertificatePin = (domain, publicKeyPin) => {
  try {
    if (!pinningKeys.has(domain)) {
      pinningKeys.set(domain, []);
    }

    pinningKeys.get(domain).push({
      pin: publicKeyPin,
      addedAt: new Date(),
      status: 'active',
    });

    logger.info('[SSLService] Certificate pin added', { domain });

    return { success: true, domain };
  } catch (err) {
    logger.error('[SSLService] Exception adding certificate pin', {
      domain,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Verify certificate pin
 */
export const verifyCertificatePin = (domain, publicKeyPin) => {
  try {
    const pins = pinningKeys.get(domain);

    if (!pins || pins.length === 0) {
      logger.warn('[SSLService] No certificate pins configured', { domain });
      return { success: true, pinned: false }; // Not pinned is not a failure
    }

    const isPinned = pins.some((p) => p.pin === publicKeyPin && p.status === 'active');

    if (!isPinned) {
      logger.warn('[SSLService] Certificate pin verification FAILED', {
        domain,
        expectedPins: pins.length,
      });
      return { success: false, pinned: false, error: 'Certificate pin mismatch' };
    }

    logger.info('[SSLService] Certificate pin verified', { domain });
    return { success: true, pinned: true };
  } catch (err) {
    logger.error('[SSLService] Exception verifying certificate pin', {
      domain,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Start certificate renewal monitoring
 */
const startCertificateRenewalMonitoring = () => {
  setInterval(() => {
    try {
      const now = new Date();

      for (const [domain, cert] of certificates.entries()) {
        const daysUntilExpiry = (cert.expiresAt - now) / (1000 * 60 * 60 * 24);

        if (daysUntilExpiry <= SSL_CONFIG.renewalDaysBeforeExpiry && cert.status === 'active') {
          if (SSL_CONFIG.autoRenewalEnabled) {
            renewCertificate(domain);
          } else {
            logger.warn('[SSLService] Certificate renewal needed', {
              domain,
              daysUntilExpiry: daysUntilExpiry.toFixed(2),
            });
          }
        }

        if (daysUntilExpiry <= 0) {
          cert.status = 'expired';
          logger.error('[SSLService] Certificate EXPIRED', { domain });
        }
      }
    } catch (err) {
      logger.error('[SSLService] Exception in renewal monitoring', {
        error: err.message,
      });
    }
  }, 24 * 60 * 60 * 1000); // Check daily
};

/**
 * Renew certificate
 */
const renewCertificate = async (domain) => {
  try {
    logger.info('[SSLService] Starting certificate renewal', { domain });

    // In production, this would call Let's Encrypt ACME API
    const renewedCert = {
      domain,
      certificatePem: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
      privateKeyPem: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
      chainPem: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
      issuer: 'Let\'s Encrypt',
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'active',
      version: '2.0',
      fingerprint: generateCertificateFingerprint('renewed-cert'),
    };

    certificates.set(domain, renewedCert);
    certificateHistory.push({
      ...renewedCert,
      action: 'renewed',
      timestamp: new Date(),
    });

    logger.info('[SSLService] Certificate renewed successfully', {
      domain,
      expiresAt: renewedCert.expiresAt.toISOString(),
    });

    return { success: true, domain, certificate: renewedCert };
  } catch (err) {
    logger.error('[SSLService] Exception renewing certificate', {
      domain,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get HSTS header
 */
export const getHSTSHeader = () => {
  try {
    if (!SSL_CONFIG.hstsEnabled) {
      return { success: true, header: null };
    }

    let header = `max-age=${SSL_CONFIG.hstsMaxAge}`;

    if (SSL_CONFIG.hstsIncludeSubdomains) {
      header += '; includeSubDomains';
    }

    if (SSL_CONFIG.hstsPreload) {
      header += '; preload';
    }

    return {
      success: true,
      header,
      headerName: 'Strict-Transport-Security',
    };
  } catch (err) {
    logger.error('[SSLService] Exception getting HSTS header', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get certificate details
 */
export const getCertificateDetails = (domain) => {
  try {
    const cert = certificates.get(domain);

    if (!cert) {
      return { success: false, error: 'Certificate not found' };
    }

    const now = new Date();
    const daysUntilExpiry = (cert.expiresAt - now) / (1000 * 60 * 60 * 24);

    return {
      success: true,
      domain,
      issuer: cert.issuer,
      issuedAt: cert.issuedAt.toISOString(),
      expiresAt: cert.expiresAt.toISOString(),
      daysUntilExpiry: daysUntilExpiry.toFixed(2),
      status: cert.status,
      fingerprint: cert.fingerprint,
      tlsVersions: SSL_CONFIG.tlsVersions,
      cipherSuites: SSL_CONFIG.cipherSuites.length,
    };
  } catch (err) {
    logger.error('[SSLService] Exception getting certificate details', {
      domain,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Get SSL/TLS security status
 */
export const getSSLStatus = () => {
  try {
    const totalCertificates = certificates.size;
    const activeCertificates = Array.from(certificates.values()).filter(
      (c) => c.status === 'active'
    ).length;
    const expiringCertificates = Array.from(certificates.values())
      .filter((c) => {
        const daysUntilExpiry = (c.expiresAt - new Date()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry <= SSL_CONFIG.renewalDaysBeforeExpiry;
      })
      .map((c) => ({
        domain: c.domain,
        daysUntilExpiry: (
          (c.expiresAt - new Date()) /
          (1000 * 60 * 60 * 24)
        ).toFixed(2),
      }));

    return {
      success: true,
      totalCertificates,
      activeCertificates,
      expiringCertificates,
      hstsEnabled: SSL_CONFIG.hstsEnabled,
      certificatePinningEnabled: SSL_CONFIG.certificatePinningEnabled,
      autoRenewalEnabled: SSL_CONFIG.autoRenewalEnabled,
      tlsVersions: SSL_CONFIG.tlsVersions,
      cipherSuitesConfigured: SSL_CONFIG.cipherSuites.length,
      certificateHistory: certificateHistory.slice(-10), // Last 10 events
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[SSLService] Exception getting SSL status', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Validate TLS version
 */
export const validateTLSVersion = (version) => {
  try {
    const isValid = SSL_CONFIG.tlsVersions.includes(version);

    if (!isValid) {
      logger.warn('[SSLService] Invalid TLS version attempted', {
        version,
        allowedVersions: SSL_CONFIG.tlsVersions,
      });
      return { success: false, valid: false };
    }

    return { success: true, valid: true };
  } catch (err) {
    logger.error('[SSLService] Exception validating TLS version', {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
};

export default {
  initializeSSLService,
  installCertificate,
  addCertificatePin,
  verifyCertificatePin,
  getCertificateDetails,
  getHSTSHeader,
  getSSLStatus,
  validateTLSVersion,
};
