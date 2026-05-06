/**
 * Production Hardening Dashboard
 * FASE 9: Security hardening, rate limiting, backup, logging infrastructure
 * Provides comprehensive UI for production environment configuration
 */

import React, { useState, useCallback, useMemo } from 'react';
import './ProductionHardeningDashboard.css';
import logger from '../../utils/logger.js';

// Status indicator component
function StatusIndicator({ status, label }) {
  const statusConfig = {
    active: { color: '#10b981', icon: '✓' },
    inactive: { color: '#ef4444', icon: '✗' },
    pending: { color: '#f59e0b', icon: '⏳' },
    configured: { color: '#3b82f6', icon: '⚙️' },
  };

  const config = statusConfig[status] || statusConfig.inactive;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: config.color,
          animation: status === 'pending' ? 'pulse 2s infinite' : 'none',
        }}
      />
      <span style={{ fontSize: 13, color: config.color, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// Configuration card component
function ConfigCard({ title, icon, description, status, onConfigure, isLoading, children }) {
  return (
    <div className="config-card">
      <div className="config-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>{icon}</span>
          <div>
            <h3 className="config-title">{title}</h3>
            <p className="config-description">{description}</p>
          </div>
        </div>
        <StatusIndicator status={status} label={status.charAt(0).toUpperCase() + status.slice(1)} />
      </div>
      {children && <div className="config-content">{children}</div>}
      {onConfigure && (
        <button
          onClick={onConfigure}
          disabled={isLoading}
          className="btn btn-secondary"
          style={{ marginTop: 16 }}
        >
          {isLoading ? '⏳ Configurando...' : '⚙️ Configurar'}
        </button>
      )}
    </div>
  );
}

export function ProductionHardeningDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [tlsConfig, setTlsConfig] = useState({
    enabled: true,
    certFile: '/etc/ssl/certs/server.crt',
    keyFile: '/etc/ssl/private/server.key',
    minVersion: 'TLSv1.2',
    cipherSuite: 'HIGH:!aNULL:!MD5',
  });

  const [rateLimitConfig, setRateLimitConfig] = useState({
    enabled: true,
    windowMs: 15,
    maxRequests: 100,
    keyGenerator: 'ip',
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  });

  const [ddosConfig, setDdosConfig] = useState({
    enabled: true,
    mode: 'advanced',
    threshold: 1000,
    windowSize: 60,
    blockDuration: 3600,
    bypassToken: '',
  });

  const [loggingConfig, setLoggingConfig] = useState({
    level: 'info',
    transport: 'winston',
    elasticsearch: {
      enabled: true,
      host: 'elasticsearch-prod.example.com',
      port: 9200,
      indexPrefix: 'xtratia-logs',
    },
    retention: 30,
  });

  const [backupConfig, setBackupConfig] = useState({
    enabled: true,
    frequency: 'daily',
    time: '02:00',
    destination: 's3://xtratia-backups',
    retention: 30,
    encryption: true,
    verification: true,
  });

  const [databaseConfig, setDatabaseConfig] = useState({
    poolMin: 5,
    poolMax: 20,
    idleTimeout: 30000,
    acquireTimeout: 30000,
    replicationEnabled: true,
    readReplicas: 3,
  });

  const [environment, setEnvironment] = useState('production');
  const [envSecrets, setEnvSecrets] = useState({
    nodeEnv: 'production',
    debugMode: false,
    corsOrigin: 'https://app.example.com',
    jwtExpiration: '24h',
  });

  const [isLoading, setIsLoading] = useState({});
  const [configStates, setConfigStates] = useState({
    tls: 'active',
    rateLimit: 'active',
    ddos: 'active',
    logging: 'configured',
    backup: 'active',
    database: 'configured',
  });

  // Get overall security score
  const securityScore = useMemo(() => {
    const activeConfigs = Object.values(configStates).filter(
      (status) => status === 'active' || status === 'configured'
    ).length;
    return Math.round((activeConfigs / Object.keys(configStates).length) * 100);
  }, [configStates]);

  // Handle configuration updates
  const handleConfigUpdate = useCallback((configName, newConfig) => {
    switch (configName) {
      case 'tls':
        setTlsConfig(newConfig);
        break;
      case 'rateLimit':
        setRateLimitConfig(newConfig);
        break;
      case 'ddos':
        setDdosConfig(newConfig);
        break;
      case 'logging':
        setLoggingConfig(newConfig);
        break;
      case 'backup':
        setBackupConfig(newConfig);
        break;
      case 'database':
        setDatabaseConfig(newConfig);
        break;
      default:
        break;
    }
  }, []);

  // Simulate configuration save
  const handleConfigSave = useCallback(async (configName) => {
    setIsLoading((prev) => ({ ...prev, [configName]: true }));
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setConfigStates((prev) => ({ ...prev, [configName]: 'active' }));
      logger.log(`Configuration saved for ${configName}`);
    } catch (error) {
      logger.error(`Error saving configuration for ${configName}`, error);
    } finally {
      setIsLoading((prev) => ({ ...prev, [configName]: false }));
    }
  }, []);

  return (
    <div className="production-hardening-dashboard">
      {/* Header */}
      <div className="hardening-header">
        <div>
          <h1>🛡️ Production Hardening</h1>
          <p>FASE 9: Enterprise security, monitoring, and infrastructure configuration</p>
        </div>
        <div className="header-actions">
          <div className="security-score-display">
            <div className="score-value">{securityScore}%</div>
            <div className="score-label">Security Score</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {[
          { id: 'overview', label: '📊 Overview', icon: '📊' },
          { id: 'security', label: '🔐 Security', icon: '🔐' },
          { id: 'infrastructure', label: '⚙️ Infrastructure', icon: '⚙️' },
          { id: 'monitoring', label: '📡 Monitoring', icon: '📡' },
          { id: 'backup', label: '💾 Backup & Recovery', icon: '💾' },
          { id: 'environment', label: '🌍 Environment', icon: '🌍' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">🔒</div>
                <div className="metric-content">
                  <div className="metric-label">Active Configurations</div>
                  <div className="metric-value">
                    {Object.values(configStates).filter((s) => s === 'active' || s === 'configured')
                      .length}
                    /{Object.keys(configStates).length}
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">🎯</div>
                <div className="metric-content">
                  <div className="metric-label">Compliance Score</div>
                  <div className="metric-value">{securityScore}%</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">⚡</div>
                <div className="metric-content">
                  <div className="metric-label">Current Environment</div>
                  <div className="metric-value" style={{ textTransform: 'capitalize' }}>
                    {environment}
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">📈</div>
                <div className="metric-content">
                  <div className="metric-label">Uptime SLA</div>
                  <div className="metric-value">99.9%</div>
                </div>
              </div>
            </div>

            <div className="checklist-section">
              <h3>Production Readiness Checklist</h3>
              <div className="checklist-items">
                {[
                  { label: 'HTTPS/TLS Enabled', checked: configStates.tls === 'active' },
                  { label: 'Rate Limiting Configured', checked: configStates.rateLimit === 'active' },
                  { label: 'DDoS Protection Active', checked: configStates.ddos === 'active' },
                  { label: 'Logging Infrastructure Setup', checked: configStates.logging === 'configured' },
                  { label: 'Automated Backups Running', checked: configStates.backup === 'active' },
                  { label: 'Database Pooling Configured', checked: configStates.database === 'configured' },
                ].map((item, idx) => (
                  <div key={idx} className="checklist-item">
                    <div className="checkbox" style={{ color: item.checked ? '#10b981' : '#ef4444' }}>
                      {item.checked ? '✓' : '○'}
                    </div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="configs-grid">
            {/* TLS/HTTPS Configuration */}
            <ConfigCard
              title="HTTPS/TLS Configuration"
              icon="🔐"
              description="Enable encrypted communication with modern TLS standards"
              status={configStates.tls}
              onConfigure={() => handleConfigSave('tls')}
              isLoading={isLoading.tls}
            >
              <div className="config-form">
                <div className="form-group">
                  <label>Certificate File Path</label>
                  <input
                    type="text"
                    value={tlsConfig.certFile}
                    onChange={(e) =>
                      handleConfigUpdate('tls', { ...tlsConfig, certFile: e.target.value })
                    }
                    placeholder="/etc/ssl/certs/server.crt"
                  />
                </div>
                <div className="form-group">
                  <label>Key File Path</label>
                  <input
                    type="text"
                    value={tlsConfig.keyFile}
                    onChange={(e) =>
                      handleConfigUpdate('tls', { ...tlsConfig, keyFile: e.target.value })
                    }
                    placeholder="/etc/ssl/private/server.key"
                  />
                </div>
                <div className="form-group">
                  <label>Minimum TLS Version</label>
                  <select
                    value={tlsConfig.minVersion}
                    onChange={(e) =>
                      handleConfigUpdate('tls', { ...tlsConfig, minVersion: e.target.value })
                    }
                  >
                    <option value="TLSv1.2">TLS 1.2</option>
                    <option value="TLSv1.3">TLS 1.3 (Recommended)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={tlsConfig.enabled}
                      onChange={(e) =>
                        handleConfigUpdate('tls', { ...tlsConfig, enabled: e.target.checked })
                      }
                    />
                    Enable HTTPS Enforcement
                  </label>
                </div>
              </div>
            </ConfigCard>

            {/* Rate Limiting */}
            <ConfigCard
              title="Rate Limiting"
              icon="⏱️"
              description="Protect API endpoints from abuse and excessive requests"
              status={configStates.rateLimit}
              onConfigure={() => handleConfigSave('rateLimit')}
              isLoading={isLoading.rateLimit}
            >
              <div className="config-form">
                <div className="form-group">
                  <label>Window Duration (minutes)</label>
                  <input
                    type="number"
                    value={rateLimitConfig.windowMs}
                    onChange={(e) =>
                      handleConfigUpdate('rateLimit', { ...rateLimitConfig, windowMs: parseInt(e.target.value) })
                    }
                    min="1"
                    max="60"
                  />
                </div>
                <div className="form-group">
                  <label>Max Requests per Window</label>
                  <input
                    type="number"
                    value={rateLimitConfig.maxRequests}
                    onChange={(e) =>
                      handleConfigUpdate('rateLimit', { ...rateLimitConfig, maxRequests: parseInt(e.target.value) })
                    }
                    min="10"
                  />
                </div>
                <div className="form-group">
                  <label>Key Generator</label>
                  <select
                    value={rateLimitConfig.keyGenerator}
                    onChange={(e) =>
                      handleConfigUpdate('rateLimit', { ...rateLimitConfig, keyGenerator: e.target.value })
                    }
                  >
                    <option value="ip">IP Address</option>
                    <option value="user">User ID</option>
                    <option value="hybrid">Hybrid (IP + User)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={rateLimitConfig.enabled}
                      onChange={(e) =>
                        handleConfigUpdate('rateLimit', { ...rateLimitConfig, enabled: e.target.checked })
                      }
                    />
                    Enable Rate Limiting
                  </label>
                </div>
              </div>
            </ConfigCard>

            {/* DDoS Protection */}
            <ConfigCard
              title="DDoS Protection"
              icon="🛡️"
              description="Detect and mitigate distributed denial of service attacks"
              status={configStates.ddos}
              onConfigure={() => handleConfigSave('ddos')}
              isLoading={isLoading.ddos}
            >
              <div className="config-form">
                <div className="form-group">
                  <label>Protection Mode</label>
                  <select
                    value={ddosConfig.mode}
                    onChange={(e) =>
                      handleConfigUpdate('ddos', { ...ddosConfig, mode: e.target.value })
                    }
                  >
                    <option value="basic">Basic Detection</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced (Recommended)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Request Threshold</label>
                  <input
                    type="number"
                    value={ddosConfig.threshold}
                    onChange={(e) =>
                      handleConfigUpdate('ddos', { ...ddosConfig, threshold: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Block Duration (seconds)</label>
                  <input
                    type="number"
                    value={ddosConfig.blockDuration}
                    onChange={(e) =>
                      handleConfigUpdate('ddos', { ...ddosConfig, blockDuration: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={ddosConfig.enabled}
                      onChange={(e) =>
                        handleConfigUpdate('ddos', { ...ddosConfig, enabled: e.target.checked })
                      }
                    />
                    Enable DDoS Protection
                  </label>
                </div>
              </div>
            </ConfigCard>
          </div>
        )}

        {/* Infrastructure Tab */}
        {activeTab === 'infrastructure' && (
          <div className="configs-grid">
            {/* Database Pooling */}
            <ConfigCard
              title="Database Connection Pooling"
              icon="🔌"
              description="Optimize database performance with connection pooling"
              status={configStates.database}
              onConfigure={() => handleConfigSave('database')}
              isLoading={isLoading.database}
            >
              <div className="config-form">
                <div className="form-group">
                  <label>Minimum Pool Size</label>
                  <input
                    type="number"
                    value={databaseConfig.poolMin}
                    onChange={(e) =>
                      handleConfigUpdate('database', { ...databaseConfig, poolMin: parseInt(e.target.value) })
                    }
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Maximum Pool Size</label>
                  <input
                    type="number"
                    value={databaseConfig.poolMax}
                    onChange={(e) =>
                      handleConfigUpdate('database', { ...databaseConfig, poolMax: parseInt(e.target.value) })
                    }
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Idle Timeout (ms)</label>
                  <input
                    type="number"
                    value={databaseConfig.idleTimeout}
                    onChange={(e) =>
                      handleConfigUpdate('database', { ...databaseConfig, idleTimeout: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={databaseConfig.replicationEnabled}
                      onChange={(e) =>
                        handleConfigUpdate('database', { ...databaseConfig, replicationEnabled: e.target.checked })
                      }
                    />
                    Enable Read Replicas
                  </label>
                </div>
                {databaseConfig.replicationEnabled && (
                  <div className="form-group">
                    <label>Number of Read Replicas</label>
                    <input
                      type="number"
                      value={databaseConfig.readReplicas}
                      onChange={(e) =>
                        handleConfigUpdate('database', { ...databaseConfig, readReplicas: parseInt(e.target.value) })
                      }
                      min="1"
                      max="10"
                    />
                  </div>
                )}
              </div>
            </ConfigCard>
          </div>
        )}

        {/* Monitoring Tab */}
        {activeTab === 'monitoring' && (
          <div className="configs-grid">
            {/* Log Aggregation */}
            <ConfigCard
              title="Log Aggregation & Monitoring"
              icon="📡"
              description="Centralized logging with Elasticsearch and Winston"
              status={configStates.logging}
              onConfigure={() => handleConfigSave('logging')}
              isLoading={isLoading.logging}
            >
              <div className="config-form">
                <div className="form-group">
                  <label>Log Level</label>
                  <select
                    value={loggingConfig.level}
                    onChange={(e) =>
                      handleConfigUpdate('logging', { ...loggingConfig, level: e.target.value })
                    }
                  >
                    <option value="error">Error Only</option>
                    <option value="warn">Warning</option>
                    <option value="info">Info (Recommended)</option>
                    <option value="debug">Debug</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={loggingConfig.elasticsearch.enabled}
                      onChange={(e) =>
                        handleConfigUpdate('logging', {
                          ...loggingConfig,
                          elasticsearch: { ...loggingConfig.elasticsearch, enabled: e.target.checked },
                        })
                      }
                    />
                    Enable Elasticsearch
                  </label>
                </div>
                {loggingConfig.elasticsearch.enabled && (
                  <>
                    <div className="form-group">
                      <label>Elasticsearch Host</label>
                      <input
                        type="text"
                        value={loggingConfig.elasticsearch.host}
                        onChange={(e) =>
                          handleConfigUpdate('logging', {
                            ...loggingConfig,
                            elasticsearch: { ...loggingConfig.elasticsearch, host: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Index Prefix</label>
                      <input
                        type="text"
                        value={loggingConfig.elasticsearch.indexPrefix}
                        onChange={(e) =>
                          handleConfigUpdate('logging', {
                            ...loggingConfig,
                            elasticsearch: { ...loggingConfig.elasticsearch, indexPrefix: e.target.value },
                          })
                        }
                      />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label>Log Retention (days)</label>
                  <input
                    type="number"
                    value={loggingConfig.retention}
                    onChange={(e) =>
                      handleConfigUpdate('logging', { ...loggingConfig, retention: parseInt(e.target.value) })
                    }
                    min="7"
                    max="365"
                  />
                </div>
              </div>
            </ConfigCard>
          </div>
        )}

        {/* Backup Tab */}
        {activeTab === 'backup' && (
          <div className="configs-grid">
            {/* Automated Backups */}
            <ConfigCard
              title="Automated Backup & Recovery"
              icon="💾"
              description="Scheduled database backups with encryption and verification"
              status={configStates.backup}
              onConfigure={() => handleConfigSave('backup')}
              isLoading={isLoading.backup}
            >
              <div className="config-form">
                <div className="form-group">
                  <label>Backup Frequency</label>
                  <select
                    value={backupConfig.frequency}
                    onChange={(e) =>
                      handleConfigUpdate('backup', { ...backupConfig, frequency: e.target.value })
                    }
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily (Recommended)</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Backup Time (24-hour format)</label>
                  <input
                    type="time"
                    value={backupConfig.time}
                    onChange={(e) =>
                      handleConfigUpdate('backup', { ...backupConfig, time: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Backup Destination (S3 URI)</label>
                  <input
                    type="text"
                    value={backupConfig.destination}
                    onChange={(e) =>
                      handleConfigUpdate('backup', { ...backupConfig, destination: e.target.value })
                    }
                    placeholder="s3://bucket-name/prefix"
                  />
                </div>
                <div className="form-group">
                  <label>Retention Period (days)</label>
                  <input
                    type="number"
                    value={backupConfig.retention}
                    onChange={(e) =>
                      handleConfigUpdate('backup', { ...backupConfig, retention: parseInt(e.target.value) })
                    }
                    min="7"
                    max="365"
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={backupConfig.encryption}
                      onChange={(e) =>
                        handleConfigUpdate('backup', { ...backupConfig, encryption: e.target.checked })
                      }
                    />
                    Enable Encryption (AES-256)
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={backupConfig.verification}
                      onChange={(e) =>
                        handleConfigUpdate('backup', { ...backupConfig, verification: e.target.checked })
                      }
                    />
                    Enable Backup Verification
                  </label>
                </div>
              </div>
            </ConfigCard>
          </div>
        )}

        {/* Environment Tab */}
        {activeTab === 'environment' && (
          <div className="configs-grid">
            <div className="config-card">
              <div className="config-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>🌍</span>
                  <div>
                    <h3 className="config-title">Environment Configuration</h3>
                    <p className="config-description">
                      Manage environment-specific settings and secrets
                    </p>
                  </div>
                </div>
              </div>
              <div className="config-content">
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Active Environment
                  </label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 10,
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      fontSize: 13,
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>

                <div className="env-vars">
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      NODE_ENV
                    </label>
                    <input
                      type="text"
                      value={envSecrets.nodeEnv}
                      onChange={(e) => setEnvSecrets({ ...envSecrets, nodeEnv: e.target.value })}
                      style={{
                        width: '100%',
                        padding: 8,
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor: 'var(--bg-secondary)',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      CORS_ORIGIN
                    </label>
                    <input
                      type="text"
                      value={envSecrets.corsOrigin}
                      onChange={(e) => setEnvSecrets({ ...envSecrets, corsOrigin: e.target.value })}
                      style={{
                        width: '100%',
                        padding: 8,
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor: 'var(--bg-secondary)',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      JWT_EXPIRATION
                    </label>
                    <input
                      type="text"
                      value={envSecrets.jwtExpiration}
                      onChange={(e) => setEnvSecrets({ ...envSecrets, jwtExpiration: e.target.value })}
                      style={{
                        width: '100%',
                        padding: 8,
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor: 'var(--bg-secondary)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={envSecrets.debugMode}
                        onChange={(e) => setEnvSecrets({ ...envSecrets, debugMode: e.target.checked })}
                      />
                      Debug Mode (Development Only)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-btn">
            <span>🔄</span> Restart Services
          </button>
          <button className="action-btn">
            <span>📊</span> View Health Status
          </button>
          <button className="action-btn">
            <span>📥</span> Download Config
          </button>
          <button className="action-btn">
            <span>💾</span> Trigger Backup
          </button>
          <button className="action-btn">
            <span>📜</span> View Logs
          </button>
          <button className="action-btn">
            <span>🧪</span> Run Security Audit
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductionHardeningDashboard;
