# React Hooks & API Integration Specification

**Status:** 🔵 SPECIFICATION COMPLETE - Ready for Implementation  
**Date:** 2026-05-05

This document specifies all React hooks and API integrations needed for FASES 6-10.

---

## Overview

The architecture uses custom React hooks as the primary interface between frontend components and backend APIs. Each hook encapsulates API calls, state management, error handling, and loading states.

---

## FASE 6: Secrets Management

### Hook: `useApiSecrets()`

**Location:** `/src/hooks/useApiSecrets.js`

```javascript
// Usage
const {
  // State
  secrets,           // Secret[]
  loading,           // boolean
  error,             // Error | null
  stats,             // { total: number, active: number, archived: number, expired: number }
  
  // CRUD Operations
  fetchSecrets,      // (filters?) => Promise<void>
  createSecret,      // (data) => Promise<Secret>
  updateSecret,      // (id, data) => Promise<Secret>
  deleteSecret,      // (id) => Promise<void>
  archiveSecret,     // (id) => Promise<void>
  unarchiveSecret,   // (id) => Promise<void>
  
  // Search & Filter
  searchSecrets,     // (query) => Promise<Secret[]>
  filterByTag,       // (tag) => Promise<Secret[]>
  filterByStatus,    // (status) => Promise<Secret[]>
  
  // Audit
  getAuditTrail,     // (secretId) => Promise<AuditEvent[]>
  exportSecret,      // (id, format) => Promise<Blob>
  
  // Error Handling
  clearError         // () => void
} = useApiSecrets();
```

**API Endpoints Required:**
- GET `/api/v1/secrets`
- GET `/api/v1/secrets/:id`
- POST `/api/v1/secrets`
- PUT `/api/v1/secrets/:id`
- DELETE `/api/v1/secrets/:id`
- POST `/api/v1/secrets/:id/archive`
- POST `/api/v1/secrets/:id/unarchive`
- GET `/api/v1/secrets/:id/audit`
- GET `/api/v1/secrets/stats`

---

## FASE 7: Key Rotation

### Hook: `useApiKeyRotation()`

**Location:** `/src/hooks/useApiKeyRotation.js`

```javascript
const {
  // Policies
  policies,          // RotationPolicy[]
  policiesLoading,   // boolean
  
  // Create/Update/Delete
  createPolicy,      // (data) => Promise<RotationPolicy>
  updatePolicy,      // (id, data) => Promise<RotationPolicy>
  deletePolicy,      // (id) => Promise<void>
  togglePolicy,      // (id, enabled) => Promise<RotationPolicy>
  
  // History
  history,           // RotationHistory[]
  historyLoading,    // boolean
  totalRotations,    // number
  fetchHistory,      // (filters?) => Promise<void>
  
  // Manual Operations
  triggerRotation,   // (keyId, reason) => Promise<RotationId>
  triggerBatchRotation, // (keyIds[], reason) => Promise<BatchId>
  
  // Schedule Management
  upcomingRotations, // UpcomingRotation[]
  getNextRotation,   // (keyId) => Date
  
  // Analytics
  analytics,         // RotationAnalytics
  analyticsLoading,  // boolean
  
  // Error Handling
  error,             // Error | null
  clearError         // () => void
} = useApiKeyRotation();
```

**API Endpoints Required:**
- GET `/api/v1/keys/rotation/policies`
- POST `/api/v1/keys/rotation/policies`
- PUT `/api/v1/keys/rotation/policies/:policyId`
- DELETE `/api/v1/keys/rotation/policies/:policyId`
- GET `/api/v1/keys/rotation/history`
- POST `/api/v1/keys/:keyId/rotate`
- POST `/api/v1/keys/rotate/batch`
- GET `/api/v1/keys/rotation/analytics`

---

## FASE 8: Compliance & Audit Trail

### Hook: `useApiCompliance()`

**Location:** `/src/hooks/useApiCompliance.js`

```javascript
const {
  // Audit Events
  events,            // AuditEvent[]
  eventsLoading,     // boolean
  totalEvents,       // number
  fetchEvents,       // (filters?) => Promise<void>
  
  // Event Details
  getEventDetails,   // (eventId) => Promise<AuditEventDetail>
  getRelatedEvents,  // (eventId) => Promise<AuditEvent[]>
  
  // Search
  searchEvents,      // (query, filters?) => Promise<AuditEvent[]>
  
  // Reports
  generateReport,    // (config) => Promise<Report>
  reportProgress,    // number (0-100)
  downloadReport,    // (reportId, format) => Promise<Blob>
  scheduledReports,  // ScheduledReport[]
  createScheduledReport, // (config) => Promise<ScheduledReport>
  
  // Compliance Status
  complianceStatus,  // ComplianceStatus
  statusLoading,     // boolean
  
  // Error Handling
  error,             // Error | null
  clearError         // () => void
} = useApiCompliance();
```

**API Endpoints Required:**
- GET `/api/v1/audit/events`
- GET `/api/v1/audit/events/:eventId`
- POST `/api/v1/audit/search`
- POST `/api/v1/compliance/reports/generate`
- POST `/api/v1/compliance/reports/:reportId/download`
- GET `/api/v1/compliance/status`
- POST `/api/v1/compliance/reports/schedule`

---

## FASE 9: Production Hardening

### Hook: `useApiHardening()`

**Location:** `/src/hooks/useApiHardening.js`

```javascript
const {
  // Infrastructure Status
  infrastructureStatus, // InfrastructureStatus
  statusLoading,        // boolean
  
  // Security
  securityHeaders,      // SecurityHeaders
  tlsCertificate,       // TLSCertificate
  rateLimitStatus,      // RateLimitStatus
  ddosProtection,       // DDoSStatus
  
  // Backup & Disaster Recovery
  backupStatus,         // BackupStatus
  restoreTest,          // RestoreTestResult
  
  // Monitoring
  logsStatus,           // LoggingStatus
  alertRules,           // AlertRule[]
  performanceMetrics,   // PerformanceMetrics
  
  // Configuration
  environmentStatus,    // EnvironmentStatus
  buildInfo,            // BuildInfo
  
  // Actions
  triggerHealthCheck,   // () => Promise<HealthCheckResult>
  triggerBackup,        // () => Promise<BackupId>
  runRestoreTest,       // (backupId) => Promise<RestoreTestResult>
  
  // Error Handling
  error,                // Error | null
  clearError            // () => void
} = useApiHardening();
```

**API Endpoints Required:**
- GET `/api/v1/infrastructure/status`
- GET `/api/v1/security/headers`
- GET `/api/v1/security/certificate`
- GET `/api/v1/rate-limiting/status`
- GET `/api/v1/backup/status`
- GET `/api/v1/monitoring/logs`
- GET `/api/v1/environment/status`
- GET `/api/v1/compliance/score`
- POST `/api/v1/health-check`

---

## FASE 10: Advanced Features

### Hook: `useApiAdvancedFeatures()`

**Location:** `/src/hooks/useApiAdvancedFeatures.js`

```javascript
const {
  // Multi-Key Management
  keys,                 // AdvancedKey[]
  keysLoading,          // boolean
  keyVersions,          // KeyVersion[]
  getKeyVersions,       // (keyId) => Promise<KeyVersion[]>
  
  // Backup & Restore
  backupSchedule,       // BackupScheduleConfig
  backups,              // Backup[]
  restoreBackup,        // (backupId) => Promise<RestoreResult>
  triggerBackup,        // (keyIds?) => Promise<BackupId>
  configureBackupSchedule, // (config) => Promise<void>
  
  // Hierarchy
  hierarchy,            // Folder[]
  getFolder,            // (folderId) => Promise<Folder>
  createFolder,         // (data) => Promise<Folder>
  moveSecret,           // (secretId, newParentId) => Promise<void>
  deleteFolder,         // (folderId) => Promise<void>
  
  // KMS Integration
  kmsProviders,         // KMSProvider[]
  connectKms,           // (providerConfig) => Promise<KMSProvider>
  configureKms,         // (providerId, config) => Promise<void>
  disconnectKms,        // (providerId) => Promise<void>
  
  // Sharing
  activeShares,         // SecretShare[]
  createShare,          // (config) => Promise<AccessToken>
  revokeShare,          // (shareId) => Promise<void>
  
  // Batch Operations
  executeBatch,         // (operationConfig) => Promise<BatchId>
  batchProgress,        // (batchId) => Promise<ProgressUpdate>
  
  // Error Handling
  error,                // Error | null
  clearError            // () => void
} = useApiAdvancedFeatures();
```

**API Endpoints Required:**
- GET `/api/v1/keys/multi`
- GET `/api/v1/keys/:keyId/versions`
- POST `/api/v1/backups/create`
- GET `/api/v1/backups/schedule`
- GET `/api/v1/secrets/hierarchy`
- POST `/api/v1/secrets/move`
- GET `/api/v1/kms/providers`
- POST `/api/v1/secrets/share`
- POST `/api/v1/operations/batch`
- GET `/api/v1/operations/batch/:batchId`

---

## Hook Implementation Pattern

All hooks follow this standard pattern:

```javascript
import { useState, useCallback } from 'react';
import { apiClient } from '../services/apiClientService';

export function useApiX() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/v1/endpoint', { params });
      setData(response);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/v1/endpoint', payload);
      setData(prev => [...(Array.isArray(prev) ? prev : []), response]);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { data, loading, error, fetch, create, clearError };
}
```

---

## Error Handling Strategy

All hooks implement consistent error handling:

```javascript
const error = {
  code: 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'SERVER_ERROR',
  message: string,
  statusCode: number,
  details: object
};
```

Error types and recommended user messaging:

| Error Code | HTTP Status | User Message |
|------------|------------|--------------|
| NETWORK_ERROR | Network error | "Connection failed. Please check your internet." |
| VALIDATION_ERROR | 400 | "Invalid input. Please check your data." |
| AUTH_ERROR | 401 | "Session expired. Please log in again." |
| FORBIDDEN_ERROR | 403 | "You don't have permission for this action." |
| NOT_FOUND_ERROR | 404 | "Resource not found." |
| CONFLICT_ERROR | 409 | "Resource already exists or has been modified." |
| SERVER_ERROR | 500 | "Server error. Please try again later." |

---

## Loading States

All hooks provide `loading` state for each async operation:

```javascript
const { loading, dataLoading, operationLoading } = useApiX();

// Show spinner while loading
{loading && <Spinner />}

// Show specific operation loading
{dataLoading && <div>Fetching data...</div>}
```

---

## Integration with Zustand Store

Hooks integrate with Zustand for notifications:

```javascript
import { useStore } from '../store';

const showNotification = useStore(state => state.addNotification);

// After successful operation
showNotification({
  type: 'success',
  message: 'Secret created successfully'
});
```

---

## Caching Strategy

Hooks implement caching to reduce API calls:

- **Secrets:** Cached for 5 minutes
- **Rotation Policies:** Cached for 5 minutes
- **Audit Events:** Cached for 1 minute (fresh data important)
- **Compliance Status:** Cached for 5 minutes
- **Infrastructure Status:** Cached for 2 minutes (real-time important)

Caching uses `useCallback` with dependency arrays to prevent unnecessary re-fetches.

---

## Testing Strategy

Each hook has a test file:

```
/src/hooks/__tests__/useApiSecrets.test.js
/src/hooks/__tests__/useApiKeyRotation.test.js
/src/hooks/__tests__/useApiCompliance.test.js
/src/hooks/__tests__/useApiHardening.test.js
/src/hooks/__tests__/useApiAdvancedFeatures.test.js
```

Tests cover:
- Successful API calls
- Error handling
- Caching behavior
- Loading states
- Component unmounting during async operations

---

## Implementation Priority

1. **Priority 1 (CRITICAL):** FASE 6 & 7 hooks
2. **Priority 2 (HIGH):** FASE 8 & 9 hooks
3. **Priority 3 (MEDIUM):** FASE 10 hooks

---

## Backend Requirements

For all hooks to function properly, backend must provide:

- ✅ JWT authentication on all endpoints
- ✅ Proper error responses with HTTP status codes
- ✅ CORS headers for frontend origin
- ✅ Rate limiting with appropriate limits
- ✅ Proper data validation and sanitization
- ✅ Audit logging for all operations
- ✅ Pagination for list endpoints (default 50, max 500)
- ✅ Filtering capabilities on all list endpoints

---

**Next Steps:**
1. Create hook files using above patterns
2. Implement each endpoint in Express backend
3. Create database tables and migrations
4. Write unit tests for hooks
5. Integration testing with real backend
6. Performance optimization if needed

---

**Status: 🟢 SPECIFICATION COMPLETE**

Estimated Implementation Time: 40-50 hours for all hooks + backend endpoints
