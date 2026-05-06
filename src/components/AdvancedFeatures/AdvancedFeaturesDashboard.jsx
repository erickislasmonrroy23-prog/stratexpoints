/**
 * Advanced Features Dashboard
 * FASE 10: Multi-key management, backup/restore, hierarchical organization, KMS integration
 */

import React, { useState, useCallback, useMemo } from 'react';
import './AdvancedFeaturesDashboard.css';

function StatusIndicator({ status, label }) {
  const statusConfig = {
    active: { color: '#10b981', icon: '✓', display: 'Active' },
    inactive: { color: '#ef4444', icon: '✗', display: 'Inactive' },
    pending: { color: '#f59e0b', icon: '⏳', display: 'Pending' },
    configured: { color: '#3b82f6', icon: '⚙️', display: 'Configured' },
    synced: { color: '#10b981', icon: '🔄', display: 'Synced' },
    failed: { color: '#ef4444', icon: '✗', display: 'Failed' },
  };

  const config = statusConfig[status] || statusConfig.inactive;

  return (
    <div className="status-indicator" style={{ background: `${config.color}15`, color: config.color }}>
      <span className="status-dot" style={{ background: config.color }} />
      <span>{config.display}</span>
    </div>
  );
}

function ConfigCard({ title, icon, description, status, onAction, isLoading, actionLabel, children }) {
  return (
    <div className="config-card">
      <div className="config-header">
        <h3 className="config-title">
          <span className="icon">{icon}</span>
          {title}
        </h3>
        <StatusIndicator status={status} />
      </div>
      <p className="config-description">{description}</p>
      {children && <div className="config-content">{children}</div>}
      {onAction && (
        <button
          className="configure-button"
          onClick={onAction}
          disabled={isLoading}
          style={{ opacity: isLoading ? 0.6 : 1 }}
        >
          {isLoading ? '⏳ Processing...' : actionLabel || 'Configure'}
        </button>
      )}
    </div>
  );
}

export function AdvancedFeaturesDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  // Multi-Key Management State
  const [multiKeyConfig, setMultiKeyConfig] = useState({
    enabled: true,
    maxKeys: 10,
    keyRotationInterval: 90,
    primaryKey: 'key_prod_2024',
    rotationPolicy: 'automatic',
    keys: [
      { id: 'key_prod_2024', name: 'Production Key 2024', status: 'active', createdAt: '2024-01-15', expiresAt: '2025-01-15' },
      { id: 'key_prod_2023', name: 'Production Key 2023', status: 'inactive', createdAt: '2023-01-15', expiresAt: '2024-01-15' },
      { id: 'key_staging', name: 'Staging Key', status: 'active', createdAt: '2024-02-20', expiresAt: '2025-02-20' },
    ],
  });

  // Backup & Restore State
  const [backupConfig, setBackupConfig] = useState({
    enabled: true,
    autoBackup: true,
    schedule: 'daily',
    time: '02:00',
    backupDestination: 's3://xtratia-backups-advanced',
    retentionPolicy: 30,
    encryptionEnabled: true,
    compressionEnabled: true,
    backups: [
      { id: 'backup_20240505', date: '2024-05-05 02:00:00', size: '2.5 GB', status: 'completed', verified: true },
      { id: 'backup_20240504', date: '2024-05-04 02:00:00', size: '2.4 GB', status: 'completed', verified: true },
      { id: 'backup_20240503', date: '2024-05-03 02:00:00', size: '2.3 GB', status: 'completed', verified: true },
    ],
  });

  // Hierarchical Organization State
  const [hierarchyConfig, setHierarchyConfig] = useState({
    enabled: true,
    rootOrganization: 'Xtratia Enterprise',
    organizationStructure: [
      {
        id: 'org_root',
        name: 'Xtratia Enterprise',
        level: 0,
        secretCount: 156,
        users: 24,
        status: 'active',
        children: [
          {
            id: 'org_finance',
            name: 'Finance Department',
            level: 1,
            secretCount: 45,
            users: 8,
            status: 'active',
            children: [
              { id: 'org_payroll', name: 'Payroll', level: 2, secretCount: 15, users: 3, status: 'active' },
              { id: 'org_accounting', name: 'Accounting', level: 2, secretCount: 30, users: 5, status: 'active' },
            ],
          },
          {
            id: 'org_engineering',
            name: 'Engineering Department',
            level: 1,
            secretCount: 89,
            users: 14,
            status: 'active',
            children: [
              { id: 'org_backend', name: 'Backend Team', level: 2, secretCount: 45, users: 7, status: 'active' },
              { id: 'org_frontend', name: 'Frontend Team', level: 2, secretCount: 28, users: 5, status: 'active' },
              { id: 'org_devops', name: 'DevOps', level: 2, secretCount: 16, users: 2, status: 'active' },
            ],
          },
          {
            id: 'org_security',
            name: 'Security Department',
            level: 1,
            secretCount: 22,
            users: 2,
            status: 'active',
          },
        ],
      },
    ],
  });

  // KMS Integration State
  const [kmsConfig, setKmsConfig] = useState({
    enabled: true,
    provider: 'aws-kms',
    region: 'us-east-1',
    masterKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
    dataKeyGeneration: 'automatic',
    encryptionAlgorithm: 'AES-256-GCM',
    kmsStatus: 'connected',
    metricsEnabled: true,
    auditLoggingEnabled: true,
    integrations: [
      { service: 'AWS KMS', status: 'connected', lastSync: '2024-05-05 10:30:00', keyCount: 5 },
      { service: 'HashiCorp Vault', status: 'connected', lastSync: '2024-05-05 10:25:00', keyCount: 8 },
      { service: 'Azure Key Vault', status: 'pending', lastSync: '2024-05-04 15:00:00', keyCount: 0 },
    ],
  });

  // Advanced Encryption State
  const [encryptionConfig, setEncryptionConfig] = useState({
    enabled: true,
    algorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
    iterations: 100000,
    masterEncryptionEnabled: true,
    fieldbLevelEncryption: true,
    encryptedFields: 45,
    encryptionKeyRotation: 180,
  });

  // Calculate metrics
  const totalSecrets = useMemo(() => {
    const countSecrets = (org) => {
      return org.secretCount + (org.children ? org.children.reduce((sum, child) => sum + countSecrets(child), 0) : 0);
    };
    return countSecrets(hierarchyConfig.organizationStructure[0]);
  }, [hierarchyConfig]);

  const activeKeys = useMemo(() => {
    return multiKeyConfig.keys.filter((k) => k.status === 'active').length;
  }, [multiKeyConfig]);

  const encryptionScore = useMemo(() => {
    let score = 0;
    if (multiKeyConfig.enabled) score += 20;
    if (kmsConfig.enabled) score += 20;
    if (encryptionConfig.enabled) score += 20;
    if (backupConfig.encryptionEnabled) score += 20;
    if (backupConfig.enabled) score += 20;
    return score;
  }, [multiKeyConfig, kmsConfig, encryptionConfig, backupConfig]);

  const handleKeyRotation = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Simulated key rotation
      const newKey = {
        id: `key_prod_${new Date().getFullYear()}`,
        name: `Production Key ${new Date().getFullYear()}`,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };
      setMultiKeyConfig((prev) => ({
        ...prev,
        keys: [newKey, ...prev.keys.slice(0, -1)],
      }));
    }, 1500);
  }, []);

  const handleBackupNow = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const newBackup = {
        id: `backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
        date: new Date().toISOString().replace('T', ' ').slice(0, 19),
        size: '2.6 GB',
        status: 'completed',
        verified: true,
      };
      setBackupConfig((prev) => ({
        ...prev,
        backups: [newBackup, ...prev.backups.slice(0, -1)],
      }));
    }, 2000);
  }, []);

  const handleSyncKMS = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setKmsConfig((prev) => ({
        ...prev,
        kmsStatus: 'connected',
        integrations: prev.integrations.map((i) => ({
          ...i,
          lastSync: new Date().toISOString().replace('T', ' ').slice(0, 19),
        })),
      }));
    }, 1500);
  }, []);

  return (
    <div className="advanced-features-dashboard">
      {/* Header */}
      <div className="hardening-header">
        <div>
          <h1>🚀 Advanced Features</h1>
          <p>Multi-key management, backup strategies, hierarchical organization, and KMS integration</p>
        </div>
        <div className="header-actions">
          <button className="action-button primary" onClick={handleBackupNow}>
            💾 Backup Now
          </button>
          <button className="action-button">📊 View Metrics</button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Secrets</div>
          <div className="metric-value success">{totalSecrets}</div>
          <div className="metric-detail">Across all organizations</div>
          <div className="metric-bar">
            <div className="metric-bar-fill" style={{ width: `${(totalSecrets / 200) * 100}%` }} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Active Keys</div>
          <div className="metric-value success">{activeKeys}</div>
          <div className="metric-detail">Ready for use</div>
          <div className="metric-bar">
            <div className="metric-bar-fill" style={{ width: `${(activeKeys / multiKeyConfig.maxKeys) * 100}%` }} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Backup Coverage</div>
          <div className="metric-value success">{backupConfig.backups.length}</div>
          <div className="metric-detail">Recent backups available</div>
          <div className="metric-bar">
            <div className="metric-bar-fill" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Encryption Score</div>
          <div className="metric-value success">{encryptionScore}%</div>
          <div className="metric-detail">Security implementation level</div>
          <div className="metric-bar">
            <div className="metric-bar-fill" style={{ width: `${encryptionScore}%` }} />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          📋 Overview
        </button>
        <button className={`tab-button ${activeTab === 'multikey' ? 'active' : ''}`} onClick={() => setActiveTab('multikey')}>
          🔑 Multi-Key Management
        </button>
        <button className={`tab-button ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>
          💾 Backup & Restore
        </button>
        <button className={`tab-button ${activeTab === 'hierarchy' ? 'active' : ''}`} onClick={() => setActiveTab('hierarchy')}>
          🏢 Hierarchical Organization
        </button>
        <button className={`tab-button ${activeTab === 'kms' ? 'active' : ''}`} onClick={() => setActiveTab('kms')}>
          🔐 KMS Integration
        </button>
        <button className={`tab-button ${activeTab === 'encryption' ? 'active' : ''}`} onClick={() => setActiveTab('encryption')}>
          🛡️ Advanced Encryption
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="config-section">
            <h2 className="section-title">📋 System Overview</h2>
            <div className="config-grid">
              <ConfigCard title="Multi-Key Management" icon="🔑" description="Manage multiple encryption keys with automatic rotation and version tracking" status={multiKeyConfig.enabled ? 'active' : 'inactive'} actionLabel="Manage Keys">
                <div className="form-label">Active Keys: {activeKeys}/{multiKeyConfig.maxKeys}</div>
                <div style={{ marginTop: 12 }}>
                  {multiKeyConfig.keys.slice(0, 3).map((key) => (
                    <div key={key.id} style={{ padding: '8px', background: 'var(--bg)', borderRadius: '6px', marginBottom: '8px', fontSize: '13px' }}>
                      <strong>{key.name}</strong> — <span style={{ color: 'var(--text-secondary)' }}>{key.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </ConfigCard>

              <ConfigCard title="Backup & Restore" icon="💾" description="Automated backup scheduling with encryption and verification" status={backupConfig.enabled ? 'active' : 'inactive'} actionLabel="View Backups">
                <div className="form-label">Last Backup</div>
                <div style={{ marginTop: 8, padding: '8px', background: 'var(--bg)', borderRadius: '6px', fontSize: '13px' }}>
                  {backupConfig.backups[0]?.date} • {backupConfig.backups[0]?.size}
                </div>
                <div className="form-label" style={{ marginTop: 12 }}>
                  Total Backups: {backupConfig.backups.length}
                </div>
              </ConfigCard>

              <ConfigCard title="Organization Hierarchy" icon="🏢" description="Hierarchical secret organization across multiple departments" status={hierarchyConfig.enabled ? 'active' : 'inactive'} actionLabel="Edit Structure">
                <div className="form-label">Total Organizations: {hierarchyConfig.organizationStructure[0].secretCount}</div>
                <div style={{ marginTop: 8, padding: '8px', background: 'var(--bg)', borderRadius: '6px', fontSize: '13px' }}>
                  Root: {hierarchyConfig.rootOrganization}
                </div>
              </ConfigCard>

              <ConfigCard title="KMS Integration" icon="🔐" description="Cloud KMS provider integration for key management" status={kmsConfig.kmsStatus === 'connected' ? 'active' : 'pending'} actionLabel="Manage KMS">
                <div className="form-label">Provider: {kmsConfig.provider.toUpperCase()}</div>
                <div style={{ marginTop: 8, padding: '8px', background: 'var(--bg)', borderRadius: '6px', fontSize: '13px' }}>
                  Connected to {kmsConfig.integrations.filter((i) => i.status === 'connected').length} services
                </div>
              </ConfigCard>

              <ConfigCard title="Encryption Strength" icon="🛡️" description="Advanced encryption with field-level protection" status={encryptionConfig.enabled ? 'active' : 'inactive'} actionLabel="Configure">
                <div className="form-label">Algorithm: {encryptionConfig.algorithm}</div>
                <div style={{ marginTop: 8, padding: '8px', background: 'var(--bg)', borderRadius: '6px', fontSize: '13px' }}>
                  {encryptionConfig.encryptedFields} fields encrypted
                </div>
              </ConfigCard>

              <ConfigCard title="System Health" icon="💚" description="Overall security and compliance status" status="active" actionLabel="Details">
                <div className="form-label">Encryption Score: {encryptionScore}%</div>
                <div style={{ marginTop: 8, padding: '8px', background: 'var(--bg)', borderRadius: '6px', fontSize: '13px' }}>
                  All systems operational and synchronized
                </div>
              </ConfigCard>
            </div>
          </div>
        )}

        {/* Multi-Key Management Tab */}
        {activeTab === 'multikey' && (
          <div className="config-section">
            <h2 className="section-title">🔑 Multi-Key Management</h2>

            <div className="config-card">
              <div className="config-header">
                <h3 className="config-title">
                  <span className="icon">⚙️</span>Key Rotation Policy
                </h3>
              </div>

              <div className="config-form-group">
                <label className="form-label">Rotation Policy</label>
                <select className="form-select" value={multiKeyConfig.rotationPolicy} onChange={(e) => setMultiKeyConfig({ ...multiKeyConfig, rotationPolicy: e.target.value })}>
                  <option value="automatic">Automatic (Recommended)</option>
                  <option value="manual">Manual</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              <div className="config-form-group">
                <label className="form-label">Rotation Interval (Days)</label>
                <input type="number" className="form-input" value={multiKeyConfig.keyRotationInterval} onChange={(e) => setMultiKeyConfig({ ...multiKeyConfig, keyRotationInterval: parseInt(e.target.value) })} />
              </div>

              <div className="config-form-group">
                <label className="form-label">Maximum Active Keys</label>
                <input type="number" className="form-input" value={multiKeyConfig.maxKeys} onChange={(e) => setMultiKeyConfig({ ...multiKeyConfig, maxKeys: parseInt(e.target.value) })} />
              </div>

              <button className="configure-button" onClick={handleKeyRotation} disabled={isLoading}>
                {isLoading ? '⏳ Rotating...' : '🔄 Rotate Keys Now'}
              </button>
            </div>

            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Active Keys</h3>
              <table className="config-table">
                <thead>
                  <tr>
                    <th>Key Name</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {multiKeyConfig.keys.map((key) => (
                    <tr key={key.id}>
                      <td>{key.name}</td>
                      <td>
                        <span className="badge" style={{ background: key.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)', color: key.status === 'active' ? '#10b981' : '#6b7280' }}>
                          {key.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{key.createdAt}</td>
                      <td>{key.expiresAt}</td>
                      <td>
                        <button style={{ fontSize: '12px', color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Backup & Restore Tab */}
        {activeTab === 'backup' && (
          <div className="config-section">
            <h2 className="section-title">💾 Backup & Restore</h2>

            <div className="config-card">
              <div className="config-header">
                <h3 className="config-title">
                  <span className="icon">📅</span>Backup Schedule
                </h3>
              </div>

              <div className="config-form-group">
                <label className="form-label">Automatic Backup</label>
                <div className="form-checkbox-group">
                  <input type="checkbox" className="form-input" checked={backupConfig.autoBackup} onChange={(e) => setBackupConfig({ ...backupConfig, autoBackup: e.target.checked })} />
                  <span>Enable automatic daily backups</span>
                </div>
              </div>

              <div className="config-form-group">
                <label className="form-label">Backup Time (24h format)</label>
                <input type="time" className="form-input" value={backupConfig.time} onChange={(e) => setBackupConfig({ ...backupConfig, time: e.target.value })} />
              </div>

              <div className="config-form-group">
                <label className="form-label">Retention Policy (Days)</label>
                <input type="number" className="form-input" value={backupConfig.retentionPolicy} onChange={(e) => setBackupConfig({ ...backupConfig, retentionPolicy: parseInt(e.target.value) })} />
              </div>

              <div className="config-form-group">
                <label className="form-label">Encryption</label>
                <div className="form-checkbox-group">
                  <input type="checkbox" className="form-input" checked={backupConfig.encryptionEnabled} onChange={(e) => setBackupConfig({ ...backupConfig, encryptionEnabled: e.target.checked })} />
                  <span>Encrypt backups with AES-256</span>
                </div>
              </div>

              <button className="configure-button primary" onClick={handleBackupNow} disabled={isLoading}>
                {isLoading ? '⏳ Creating backup...' : '💾 Backup Now'}
              </button>
            </div>

            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Recent Backups</h3>
              <table className="config-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th>Verified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backupConfig.backups.map((backup) => (
                    <tr key={backup.id}>
                      <td>{backup.date}</td>
                      <td>{backup.size}</td>
                      <td>
                        <span className="badge success">{backup.status.toUpperCase()}</span>
                      </td>
                      <td>{backup.verified ? '✓' : '✗'}</td>
                      <td>
                        <button style={{ fontSize: '12px', color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer', marginRight: '12px' }}>
                          Restore
                        </button>
                        <button style={{ fontSize: '12px', color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer' }}>
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Hierarchical Organization Tab */}
        {activeTab === 'hierarchy' && (
          <div className="config-section">
            <h2 className="section-title">🏢 Hierarchical Organization</h2>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                {hierarchyConfig.organizationStructure.map((org) => (
                  <div key={org.id}>
                    <div style={{ fontWeight: '600', color: 'var(--success)', marginBottom: '12px' }}>
                      📦 {org.name} ({org.secretCount} secrets)
                    </div>
                    {org.children && org.children.map((dept) => (
                      <div key={dept.id} style={{ marginLeft: '24px', marginBottom: '12px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--info)' }}>
                          📁 {dept.name} ({dept.secretCount} secrets)
                        </div>
                        {dept.children && dept.children.map((team) => (
                          <div key={team.id} style={{ marginLeft: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            📄 {team.name}: {team.secretCount} secrets
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <button className="configure-button" style={{ marginTop: '24px' }}>
              ✏️ Edit Organization Structure
            </button>
          </div>
        )}

        {/* KMS Integration Tab */}
        {activeTab === 'kms' && (
          <div className="config-section">
            <h2 className="section-title">🔐 KMS Integration</h2>

            <div className="config-card">
              <div className="config-header">
                <h3 className="config-title">
                  <span className="icon">⚙️</span>KMS Configuration
                </h3>
              </div>

              <div className="config-form-group">
                <label className="form-label">Provider</label>
                <select className="form-select" value={kmsConfig.provider} onChange={(e) => setKmsConfig({ ...kmsConfig, provider: e.target.value })}>
                  <option value="aws-kms">AWS KMS</option>
                  <option value="azure-key-vault">Azure Key Vault</option>
                  <option value="gcp-kms">Google Cloud KMS</option>
                  <option value="hashicorp-vault">HashiCorp Vault</option>
                </select>
              </div>

              <div className="config-form-group">
                <label className="form-label">Region</label>
                <input type="text" className="form-input" value={kmsConfig.region} onChange={(e) => setKmsConfig({ ...kmsConfig, region: e.target.value })} />
              </div>

              <div className="config-form-group">
                <label className="form-label">Master Key ID</label>
                <input type="text" className="form-input" value={kmsConfig.masterKeyId} onChange={(e) => setKmsConfig({ ...kmsConfig, masterKeyId: e.target.value })} />
              </div>

              <div className="config-form-group">
                <label className="form-label">Encryption Algorithm</label>
                <select className="form-select" value={kmsConfig.encryptionAlgorithm}>
                  <option value="AES-256-GCM">AES-256-GCM (Recommended)</option>
                  <option value="AES-256-CBC">AES-256-CBC</option>
                  <option value="ChaCha20-Poly1305">ChaCha20-Poly1305</option>
                </select>
              </div>

              <button className="configure-button primary" onClick={handleSyncKMS} disabled={isLoading}>
                {isLoading ? '⏳ Syncing...' : '🔄 Sync with KMS'}
              </button>
            </div>

            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Connected Services</h3>
              {kmsConfig.integrations.map((integration) => (
                <div key={integration.service} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>{integration.service}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Keys: {integration.keyCount}</div>
                    </div>
                    <span className={`badge ${integration.status === 'connected' ? 'success' : 'warning'}`}>{integration.status.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>Last sync: {integration.lastSync}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Encryption Tab */}
        {activeTab === 'encryption' && (
          <div className="config-section">
            <h2 className="section-title">🛡️ Advanced Encryption</h2>

            <div className="config-grid">
              <ConfigCard title="Encryption Algorithm" icon="🔒" description="Primary encryption method for all secrets" status="active">
                <div className="form-label">Current Algorithm</div>
                <div style={{ marginTop: 8, padding: '8px', background: 'var(--bg)', borderRadius: '6px', fontWeight: '600' }}>
                  {encryptionConfig.algorithm}
                </div>
              </ConfigCard>

              <ConfigCard title="Key Derivation" icon="🗝️" description="Method for deriving encryption keys from passwords" status="active">
                <div className="form-label">Derivation Function</div>
                <div style={{ marginTop: 8, padding: '8px', background: 'var(--bg)', borderRadius: '6px', fontWeight: '600' }}>
                  {encryptionConfig.keyDerivation}
                </div>
                <div className="form-label" style={{ marginTop: 12 }}>Iterations: {encryptionConfig.iterations.toLocaleString()}</div>
              </ConfigCard>

              <ConfigCard title="Field-Level Encryption" icon="📊" description="Individual field encryption for granular control" status={encryptionConfig.fieldbLevelEncryption ? 'active' : 'inactive'}>
                <div className="form-label">Encrypted Fields</div>
                <div style={{ marginTop: 8, padding: '8px', background: 'var(--bg)', borderRadius: '6px', fontWeight: '600' }}>
                  {encryptionConfig.encryptedFields} fields
                </div>
              </ConfigCard>

              <ConfigCard title="Key Rotation" icon="🔄" description="Automatic encryption key rotation schedule" status="active">
                <div className="form-label">Rotation Interval</div>
                <div style={{ marginTop: 8, padding: '8px', background: 'var(--bg)', borderRadius: '6px', fontWeight: '600' }}>
                  Every {encryptionConfig.encryptionKeyRotation} days
                </div>
              </ConfigCard>
            </div>

            <div className="readiness-checklist">
              <h3 className="checklist-title">🔐 Encryption Security Checklist</h3>
              <div className="checklist-items">
                <div className="checklist-item completed">
                  <div className="checklist-checkbox">✓</div>
                  <span>Master encryption enabled</span>
                </div>
                <div className="checklist-item completed">
                  <div className="checklist-checkbox">✓</div>
                  <span>AES-256-GCM active</span>
                </div>
                <div className="checklist-item completed">
                  <div className="checklist-checkbox">✓</div>
                  <span>PBKDF2 key derivation</span>
                </div>
                <div className="checklist-item completed">
                  <div className="checklist-checkbox">✓</div>
                  <span>Field-level encryption</span>
                </div>
                <div className="checklist-item completed">
                  <div className="checklist-checkbox">✓</div>
                  <span>Automated key rotation</span>
                </div>
                <div className="checklist-item completed">
                  <div className="checklist-checkbox">✓</div>
                  <span>KMS integration active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
