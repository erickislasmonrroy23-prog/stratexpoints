# Frontend-Backend Integration - FASE 6 Complete ✅

**Date:** 2026-05-05  
**Status:** Frontend and Backend Connected - Ready for End-to-End Testing  
**Integration Type:** React (Frontend) + Express.js (Backend) + PostgreSQL (Database)

---

## 🎯 Integration Overview

The React frontend components created in previous FASES (6-10) are now fully connected to the Express.js backend API created in FASE 6. The integration layer uses:

- **API Client Service:** `src/services/apiClientService.js`
- **Custom Hook:** `src/hooks/useApiSecrets.js`
- **Environment:** `VITE_BACKEND_URL=http://localhost:3001`

---

## 🔌 Connection Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   REACT FRONTEND                        │
│              (SecretsManagementDashboard)               │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ (useApiSecrets hook)
                         │
                    ┌────▼─────────────────┐
                    │  API Client Service  │
                    │  (apiClientService)  │
                    └────┬──────────────────┘
                         │
                         │ HTTP requests with JWT
                         │
┌────────────────────────▼────────────────────────────────┐
│                EXPRESS.JS BACKEND                       │
│              (http://localhost:3001)                    │
│         • Authentication Middleware (JWT)               │
│         • RBAC Middleware                               │
│         • Secrets Routes                                │
│         • Error Handling                                │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ SQL queries
                         │
┌────────────────────────▼────────────────────────────────┐
│                PostgreSQL DATABASE                      │
│              (8 tables, AES-256-GCM)                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Configuration

### Frontend Environment
**File:** `.env.local`
```env
VITE_BACKEND_URL=http://localhost:3001
VITE_SUPABASE_URL=https://fjbwlelkciwmgcfixnjx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

### Backend Environment
**File:** `backend/.env.local`
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stratexpoints
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=dev-super-secret-jwt-key-change-in-production
ENCRYPTION_MASTER_KEY=0000000000000000000000000000000000000000000000000000000000000000
```

---

## 🔗 API Integration Points

### 1. API Client Service (`src/services/apiClientService.js`)

Provides low-level HTTP communication with backend:

```javascript
import { apiSecretsService, setAuthToken } from './apiClientService.js';

// Set JWT token after authentication
setAuthToken(jwtToken);

// Call backend endpoints
const secret = await apiSecretsService.getSecret(secretId);
const secrets = await apiSecretsService.listSecrets({ status: 'active' });
```

**Available Services:**
- `apiSecretsService` - Secrets management endpoints
- `apiHealthService` - Health check endpoints
- `apiAuthService` - Authentication token management
- `apiKeyRotationService` - Key rotation endpoints (FASE 7+)
- `apiLifecycleService` - Lifecycle endpoints (FASE 8+)

### 2. useApiSecrets Hook (`src/hooks/useApiSecrets.js`)

React hook for easy integration in components:

```javascript
import { useApiSecrets } from '../hooks/useApiSecrets.js';

function SecretsPage() {
  const {
    secrets,
    loading,
    error,
    listSecrets,
    createSecret,
    getSecretValue,
    deleteSecret,
    getSecretAuditTrail
  } = useApiSecrets();

  useEffect(() => {
    listSecrets({ status: 'active', limit: 50 });
  }, []);

  return (
    <div>
      {loading && <Spinner />}
      {error && <ErrorAlert error={error} />}
      {secrets.map(s => <SecretCard key={s.id} secret={s} />)}
    </div>
  );
}
```

**Available Methods (FASE 6):**

#### Secrets Operations
```javascript
// Create a new secret
const result = await createSecret({
  name: 'api-key-prod',
  description: 'Production API Key',
  secret_value: 'sk_live_...',
  secret_type: 'api_key',
  tags: { env: 'production' },
  expires_at: '2026-12-31T23:59:59Z'
});

// List secrets with filters
const results = await listSecrets({
  status: 'active',
  page: 1,
  limit: 50,
  search: 'api',
  sort: 'created_at',
  order: 'DESC'
});

// Get secret metadata (without decrypted value)
const secret = await getSecret(secretId);

// Get decrypted secret value (requires admin/editor role)
const decrypted = await getSecretValue(secretId);

// Update secret
const updated = await updateSecret(secretId, {
  description: 'Updated description',
  secret_value: 'new_value',
  status: 'active'
});

// Delete or archive secret
await deleteSecret(secretId, permanent = false); // permanent: false = archive

// Archive secret (soft delete)
await archiveSecret(secretId);

// Get audit trail for secret
const audit = await getSecretAuditTrail(secretId, {
  limit: 100,
  offset: 0
});
```

#### State Management
```javascript
const { loading, error, secrets, clearError } = useApiSecrets();

// Hook returns loading and error states for UI feedback
if (loading) return <Spinner />;
if (error) return <ErrorAlert error={error} onDismiss={clearError} />;
```

---

## 🚀 Starting the Stack

### Terminal 1: Start the Backend
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:3001
```

### Terminal 2: Start the Frontend
```bash
npm run dev
# Frontend runs on http://localhost:5173
```

### Verify Connection
Both servers should start without errors:

**Backend Output:**
```
╔════════════════════════════════════════╗
║  StratexPoints Backend - FASE 6        ║
║  Secrets Management API                ║
╠════════════════════════════════════════╣
║  Server running on: http://localhost:3001
║  Database: localhost:5432/stratexpoints
╚════════════════════════════════════════╝
```

**Frontend Output:**
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

---

## 🧪 End-to-End Testing

### 1. Create a Secret from UI
1. Navigate to http://localhost:5173
2. Go to Secrets Management Dashboard
3. Click "Create Secret"
4. Fill in:
   - Name: `test-api-key`
   - Description: `Test API Key`
   - Value: `sk_test_abc123xyz`
   - Type: `api_key`
5. Click "Create"

**Expected:**
- Secret created in database (encrypted)
- Audit log entry created
- Success message displayed

### 2. List Secrets
1. View Secrets Management Dashboard
2. Secrets should load automatically

**Expected:**
- Your newly created secret appears in the list
- Status: "active"
- Metadata visible (no decrypted value)

### 3. View Decrypted Value
1. Click on a secret to view details
2. Click "View Value" or "Decrypt"

**Expected:**
- Decrypted value displayed
- Audit log shows "read" action
- Value is shown only to authorized users

### 4. Update Secret
1. Click "Edit" on a secret
2. Change description
3. Save

**Expected:**
- Secret updated in database
- Audit log shows "update" action

### 5. View Audit Trail
1. Click secret → "Audit Trail"

**Expected:**
- All operations logged (create, read, update)
- Timestamps, user IDs, IP addresses visible
- Immutable audit log

### 6. Archive/Delete Secret
1. Click secret → "Delete"
2. Confirm deletion
3. Choose "Archive" (soft delete)

**Expected:**
- Secret marked as archived
- Still visible in database (not deleted)
- Audit log shows "archive" action

---

## 🔐 Authentication Flow

### JWT Token Management

```javascript
// 1. User authenticates with Supabase/auth provider
// 2. Receive JWT token
// 3. Store in state and API client
// 4. All API requests include Bearer token

import { setAuthToken } from './services/apiClientService.js';

// After successful authentication
const jwtToken = user.session.access_token;
setAuthToken(jwtToken);

// Token automatically included in all requests
// Authorization: Bearer <jwtToken>
```

### Token Validation

The backend verifies:
- ✅ Token signature (JWT_SECRET)
- ✅ Token expiry (24 hours)
- ✅ Organization ID (org_id in payload)
- ✅ User role (admin/editor/viewer)

---

## 🛡️ Security Features Active

### Encryption
- ✅ AES-256-GCM encryption for all secrets
- ✅ Encryption key versioning support
- ✅ IV (initialization vector) randomization per secret

### Authentication
- ✅ JWT-based stateless authentication
- ✅ 24-hour access token expiry
- ✅ 7-day refresh token expiry
- ✅ Bearer token validation on all requests

### Authorization (RBAC)
- ✅ Admin: Full CRUD + audit trail access
- ✅ Editor: Create, read, update (no delete)
- ✅ Viewer: Read-only access

### Audit Logging
- ✅ All operations logged with timestamp
- ✅ User ID and IP address captured
- ✅ Change history tracked
- ✅ Immutable append-only logs

---

## 📊 API Response Format

All API responses follow a consistent JSON structure:

### Success (2xx)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "api-key-prod",
    "status": "active",
    "created_at": "2026-05-05T10:00:00Z"
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### Error (4xx/5xx)
```json
{
  "success": false,
  "error": "Invalid request",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "name",
    "message": "Name is required"
  }
}
```

---

## 🐛 Common Issues & Solutions

### Issue: "Backend not available"
**Cause:** Express server not running  
**Solution:** 
```bash
cd backend
npm run dev
```

### Issue: "CORS error"
**Cause:** Frontend and backend ports mismatch  
**Solution:** Verify `VITE_BACKEND_URL=http://localhost:3001` in `.env.local`

### Issue: "JWT token invalid"
**Cause:** Token expired or different JWT_SECRET  
**Solution:** 
- Refresh authentication
- Verify JWT_SECRET matches backend
- Check token format: `Bearer <token>`

### Issue: "Encryption error"
**Cause:** Invalid ENCRYPTION_MASTER_KEY  
**Solution:** 
- Key must be 256 bits (64 hex characters)
- Reset to test key in development: `00000...000` (64 zeros)

### Issue: "Database connection failed"
**Cause:** PostgreSQL not running  
**Solution:**
```bash
# Verify PostgreSQL is running
psql -h localhost -U postgres -d stratexpoints
```

---

## 📈 Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend connects to backend
- [ ] Create secret from UI
- [ ] Secret appears in list
- [ ] View decrypted value
- [ ] Update secret metadata
- [ ] View audit trail
- [ ] Archive/delete secret
- [ ] Error handling works
- [ ] Loading states display correctly

---

## 🎯 Next Steps

### Immediate (Now)
- [ ] Start backend: `npm run dev` (in backend dir)
- [ ] Start frontend: `npm run dev` (in root dir)
- [ ] Run end-to-end tests above

### Short-term (FASE 7)
- [ ] Implement Key Rotation Management Backend
- [ ] Add rotation policy endpoints
- [ ] Create key rotation scheduling

### Medium-term (FASES 8-10)
- [ ] Implement Compliance & Audit Trail endpoints
- [ ] Add production hardening
- [ ] Add advanced features (multi-key, backup, KMS)

---

## 📞 Support

### Debugging
- Frontend errors: Check browser console (F12)
- Backend errors: Check terminal output
- API errors: Check network tab (DevTools)
- Database: Use `psql` CLI for direct queries

### Documentation
- Backend: `backend/README.md`
- Backend API: `backend/FASE_6_BACKEND_COMPLETE.md`
- Frontend: See component files in `src/components/`

### Logs
- Backend: `logs/backend.log`
- Frontend: Browser DevTools Console
- Database: PostgreSQL server logs

---

**Status:** ✅ Frontend-Backend Integration Complete  
**Next Phase:** End-to-End Testing & FASE 7  
**Version:** 1.0.0  
**Last Updated:** 2026-05-05 12:30 UTC
