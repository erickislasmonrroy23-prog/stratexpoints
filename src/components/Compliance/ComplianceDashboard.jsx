/**
 * ComplianceDashboard - FASE 8: Compliance & Audit Trail Visualization
 * Comprehensive compliance reporting, audit trail management, and forensic analysis
 *
 * Features:
 * - Real-time audit trail visualization
 * - Compliance report generation (PDF/CSV/Excel)
 * - Access log filtering and search
 * - Detailed action history with user context
 * - Compliance statistics and metrics
 * - Timeline-based event visualization
 * - Export capabilities with multiple formats
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './ComplianceDashboard.css';
import { useApiSecrets } from '../../hooks/useApiSecrets.js';

/**
 * AuditEvent: Individual audit log entry visualization
 */
function AuditEvent({ event, expanded, onToggle }) {
  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
      success: '#10b981'
    };
    return colors[severity] || '#3b82f6';
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: '🚨',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅'
    };
    return icons[severity] || 'ℹ️';
  };

  const severityColor = getSeverityColor(event.severity);

  return (
    <div className="audit-event" style={{ borderLeftColor: severityColor }}>
      <button className="audit-event-header" onClick={onToggle}>
        <div className="audit-event-time">
          <span style={{ color: severityColor, fontSize: 16 }}>
            {getSeverityIcon(event.severity)}
          </span>
          <span className="time-badge">
            {new Date(event.timestamp).toLocaleTimeString()}
          </span>
        </div>

        <div className="audit-event-main">
          <div className="audit-action">{event.action}</div>
          <div className="audit-summary">{event.summary}</div>
        </div>

        <div className="audit-event-user">
          <div className="user-avatar">{(event.user?.name || 'U')[0].toUpperCase()}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{event.user?.email || 'Unknown'}</div>
        </div>

        <div style={{ color: 'var(--text3)', fontSize: 18, cursor: 'pointer' }}>
          {expanded ? '▼' : '▶'}
        </div>
      </button>

      {expanded && (
        <div className="audit-event-details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Status</div>
              <span className="status-badge" style={{ background: event.status === 'success' ? '#d1fae5' : '#fee2e2', color: event.status === 'success' ? '#059669' : '#dc2626' }}>
                {event.status === 'success' ? '✓ ' : '✕ '}{event.status}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>IP Address</div>
              <div style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text)' }}>{event.ipAddress}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>User Agent</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{event.userAgent || 'Unknown'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Resource</div>
              <div style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text)' }}>{event.resource}</div>
            </div>
          </div>

          {event.details && (
            <div style={{ background: 'var(--bg3)', padding: 12, borderRadius: 8, marginTop: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Additional Details</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(event.details, null, 2)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ComplianceStatistics: Real-time compliance metrics
 */
function ComplianceStatistics({ events, dateRange }) {
  const stats = useMemo(() => {
    const filteredEvents = events.filter(e => {
      const eventDate = new Date(e.timestamp);
      return eventDate >= dateRange.start && eventDate <= dateRange.end;
    });

    return {
      totalEvents: filteredEvents.length,
      successfulEvents: filteredEvents.filter(e => e.status === 'success').length,
      failedEvents: filteredEvents.filter(e => e.status === 'failed').length,
      criticalEvents: filteredEvents.filter(e => e.severity === 'critical').length,
      uniqueUsers: new Set(filteredEvents.map(e => e.user?.id)).size,
      uniqueResources: new Set(filteredEvents.map(e => e.resource)).size,
      complianceScore: Math.round((filteredEvents.filter(e => e.status === 'success').length / Math.max(filteredEvents.length, 1)) * 100)
    };
  }, [events, dateRange]);

  return (
    <div className="compliance-stats">
      <div className="stat-card">
        <div className="stat-value">{stats.totalEvents}</div>
        <div className="stat-label">Total Events</div>
      </div>
      <div className="stat-card">
        <div className="stat-value" style={{ color: '#10b981' }}>{stats.successfulEvents}</div>
        <div className="stat-label">Successful</div>
      </div>
      <div className="stat-card">
        <div className="stat-value" style={{ color: '#ef4444' }}>{stats.failedEvents}</div>
        <div className="stat-label">Failed</div>
      </div>
      <div className="stat-card">
        <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.criticalEvents}</div>
        <div className="stat-label">Critical</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.uniqueUsers}</div>
        <div className="stat-label">Users</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.uniqueResources}</div>
        <div className="stat-label">Resources</div>
      </div>
      <div className="stat-card highlight">
        <div className="stat-value">{stats.complianceScore}%</div>
        <div className="stat-label">Compliance Score</div>
      </div>
    </div>
  );
}

/**
 * AuditTrailTimeline: Chronological event visualization
 */
function AuditTrailTimeline({ events, filters, onEventSelect }) {
  const [expandedEventId, setExpandedEventId] = useState(null);

  const filteredEvents = useMemo(() => {
    return events
      .filter(e => {
        if (filters.severity && e.severity !== filters.severity) return false;
        if (filters.status && e.status !== filters.status) return false;
        if (filters.action && !e.action.toLowerCase().includes(filters.action.toLowerCase())) return false;
        if (filters.user && e.user?.email && !e.user.email.toLowerCase().includes(filters.user.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [events, filters]);

  if (filteredEvents.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>No audit events found</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your filters</div>
      </div>
    );
  }

  return (
    <div className="audit-timeline">
      {filteredEvents.map((event, index) => (
        <AuditEvent
          key={event.id || index}
          event={event}
          expanded={expandedEventId === (event.id || index)}
          onToggle={() => setExpandedEventId(expandedEventId === (event.id || index) ? null : (event.id || index))}
        />
      ))}
    </div>
  );
}

/**
 * ComplianceDashboard: Main component
 */
export function ComplianceDashboard() {
  const { loading, error, clearError } = useApiSecrets();

  // Mock audit events for demonstration
  const [auditEvents] = useState([
    {
      id: '1',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      action: 'Secret Created',
      summary: 'New database password created with AES-256-CBC encryption',
      severity: 'info',
      status: 'success',
      user: { id: '1', name: 'Alice', email: 'alice@company.com' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      resource: '/api/secrets/create',
      details: { secretName: 'database_password', encryptionLevel: 'AES-256-CBC' }
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      action: 'Secret Accessed',
      summary: 'Production database password accessed',
      severity: 'warning',
      status: 'success',
      user: { id: '2', name: 'Bob', email: 'bob@company.com' },
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      resource: '/api/secrets/get',
      details: { secretName: 'database_password', accessCount: 3 }
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      action: 'Key Rotation',
      summary: 'Encryption keys rotated successfully',
      severity: 'success',
      status: 'success',
      user: { id: '1', name: 'Alice', email: 'alice@company.com' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      resource: '/api/keys/rotate',
      details: { rotatedKeyCount: 5, duration: '2.4s' }
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      action: 'Unauthorized Access',
      summary: 'Failed attempt to access restricted secret',
      severity: 'critical',
      status: 'failed',
      user: { id: '3', name: 'Unknown', email: 'unknown@external.com' },
      ipAddress: '203.0.113.42',
      userAgent: 'curl/7.68.0',
      resource: '/api/secrets/get/admin_key',
      details: { errorCode: '403', reason: 'Insufficient permissions' }
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
      action: 'Secret Modified',
      summary: 'API key updated with new value',
      severity: 'info',
      status: 'success',
      user: { id: '2', name: 'Bob', email: 'bob@company.com' },
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      resource: '/api/secrets/update',
      details: { secretName: 'api_key', updatedFields: ['value', 'expiryDate'] }
    }
  ]);

  const [filters, setFilters] = useState({
    severity: '',
    status: '',
    action: '',
    user: ''
  });

  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  const [reportFormat, setReportFormat] = useState('pdf');
  const [showReportModal, setShowReportModal] = useState(false);

  const handleExportReport = useCallback(() => {
    // Mock export functionality
    const reportData = {
      format: reportFormat,
      generatedAt: new Date().toISOString(),
      dateRange,
      totalEvents: auditEvents.length,
      events: auditEvents
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compliance-report-${new Date().toISOString().split('T')[0]}.${reportFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowReportModal(false);
  }, [reportFormat, dateRange, auditEvents]);

  return (
    <div className="compliance-dashboard">
      {/* Header */}
      <div className="compliance-header">
        <div>
          <h1 className="compliance-title">🔍 Compliance & Audit Trail</h1>
          <p className="compliance-subtitle">Real-time audit logging, compliance reports, and forensic analysis</p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner" style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626' }}>
          <div>{error}</div>
          <button onClick={clearError} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18 }}>✕</button>
        </div>
      )}

      {/* Controls */}
      <div className="compliance-controls">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Filter by action..."
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="compliance-input"
          />
          <input
            type="text"
            placeholder="Filter by user..."
            value={filters.user}
            onChange={(e) => setFilters({ ...filters, user: e.target.value })}
            className="compliance-input"
          />
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="compliance-input"
          >
            <option value="">All Severity Levels</option>
            <option value="critical">🚨 Critical</option>
            <option value="warning">⚠️ Warning</option>
            <option value="info">ℹ️ Info</option>
            <option value="success">✅ Success</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="compliance-input"
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
          <button
            onClick={() => setShowReportModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--primary)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13
            }}
          >
            📥 Export Report
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--text2)' }}>Date Range:</label>
          <input
            type="date"
            value={dateRange.start.toISOString().split('T')[0]}
            onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value) })}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              fontSize: 13,
              color: 'var(--text)',
              background: 'var(--bg2)'
            }}
          />
          <span style={{ color: 'var(--text3)', fontSize: 13 }}>to</span>
          <input
            type="date"
            value={dateRange.end.toISOString().split('T')[0]}
            onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value) })}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              fontSize: 13,
              color: 'var(--text)',
              background: 'var(--bg2)'
            }}
          />
        </div>
      </div>

      {/* Statistics */}
      <ComplianceStatistics events={auditEvents} dateRange={dateRange} />

      {/* Audit Trail Timeline */}
      <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 16, marginTop: 0 }}>
          📋 Audit Trail Timeline
        </h2>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: 24 }}>⏳</div>
          </div>
        ) : (
          <AuditTrailTimeline events={auditEvents} filters={filters} />
        )}
      </div>

      {/* Export Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Export Compliance Report</h3>
              <button onClick={() => setShowReportModal(false)} className="modal-close">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Report Format</label>
                <select
                  value={reportFormat}
                  onChange={(e) => setReportFormat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 14,
                    color: 'var(--text)',
                    background: 'var(--bg2)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="pdf">📄 PDF Document</option>
                  <option value="csv">📊 CSV Spreadsheet</option>
                  <option value="xlsx">📋 Excel Workbook</option>
                  <option value="json">{ } JSON Data</option>
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Include Options</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
                    <span style={{ fontSize: 13 }}>Full event details</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
                    <span style={{ fontSize: 13 }}>User context and IP addresses</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
                    <span style={{ fontSize: 13 }}>Compliance metrics and summary</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowReportModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleExportReport} className="btn-primary">📥 Export Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplianceDashboard;
