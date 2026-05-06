# FASE 6: Secrets Management System

**Status:** ✅ Frontend Integration Complete  
**Date:** 2026-05-05  
**Components:** SecretsManagementDashboard, useApiSecrets Hook, API Client Service

---

## Overview

FASE 6 introduces a comprehensive **Secrets Management** system integrated with the FASE 3-5 Express backend. This phase provides a complete UI for managing encrypted secrets, rotation policies, and compliance audit trails.

### Key Features

- **🔐 Encrypted Secrets Vault** - AES-256-CBC/GCM encryption for all secrets
- **📋 Comprehensive CRUD** - Create, read, update, delete, and archive secrets
- **🔄 Key Rotation** - Automatic and manual key rotation with policy management
- **📊 Audit Trails** - Complete audit logging for compliance and forensics
- **🏷️ Tagging System** - Organize secrets with flexible tagging and search
- **⏰ Expiration Tracking** - Monitor secrets approaching expiration
- **📈 Statistics Dashboard** - View metrics on active/archived/expiring secrets

---

## Architecture

### Component Structure

```
src/components/SecretsManagement/
├── SecretsManagementDashboard.jsx  (Main dashboard component)
├── SecretsManagementDashboard.css  (Comprehensive styling)
└── index.js                         (Module exports)
```

### Integration Points

1. **useApiSecrets Hook** - High-level API abstraction
   - Location: `src/hooks/useApiSecrets.js`
   - Provides: createSecret, updateSecret, listSecrets, deleteSecret, etc.

2. **apiClientService** - Core API client with authentication
   - Location: `src/services/apiClientService.js`
   - Features: Token management, request wrapping, error handling

3. **useApiAuth Hook** - Backend authentication management
   - Location: `src/hooks/useApiAuth.js`
   - Maintains: Token lifecycle, backend connectivity status

4. **Backend FASE 5 Express API**
   - Base URL: `http://localhost:3001` (dev) or `process.env.VITE_BACKEND_URL`
   - Endpoints:
     - `POST /api/secrets/create` - Create new secret
     - `GET /api/secrets/:id` - Get secret details
     - `GET /api/secrets/list` - List all secrets
     - `PUT /api/secrets/:id` - Update secret
     - `DELETE /api/secrets/:id` - Delete secret
     - `POST /api/secrets/:id/archive` - Archive secret
     - `POST /api/keys/rotate` - Rotate encryption keys

---

## Usage Guide

### Accessing Secrets Management

1. **Via Command Palette** (Cmd+K or Ctrl+K):
   - Search for "Secrets Management"
   - Click to navigate

2. **Via Module Menu**:
   - Icon: 🔐
   - Label: "Secrets Management — FASE 6 Vault + Encryption"

### Creating a Secret

```javascript
// Inside any component with useApiSecrets hook
const { createSecret, loading, error } = useApiSecrets();

const handleCreate = async () => {
  const result = await createSecret({
    name: "database_password",
    value: "super_secret_value",
    description: "Production database password",
    encryptionLevel: "AES-256-CBC",
    tags: ["database", "production"],
    expiryDate: "2026-12-31T23:59:59Z"
  });
};
```

### Listing Secrets

```javascript
const { listSecrets, loading } = useApiSecrets();

useEffect(() => {
  const loadSecrets = async () => {
    const secrets = await listSecrets();
    setSecrets(secrets);
  };
  loadSecrets();
}, []);
```

### Updating a Secret

```javascript
const { updateSecret } = useApiSecrets();

await updateSecret(secretId, {
  name: "new_name",
  description: "Updated description",
  value: "new_secret_value"
});
```

### Archive & Delete

```javascript
const { archiveSecret, deleteSecret } = useApiSecrets();

// Archive (soft delete, recoverable)
await archiveSecret(secretId);

// Delete (permanent, cannot be recovered)
await deleteSecret(secretId);
```

---

## UI Components

### SecretsManagementDashboard

Main dashboard component with multiple sections:

#### Header Section
- Dashboard title and description
- "Create New Secret" button
- Backend connection status indicator

#### Controls Section
- **Search Box**: Full-text search across name, description, tags
- **Filter Buttons**: All, Active, Archived, Expired status filters

#### Secrets Table
- Columns: Name, Description, Status, Encryption, Created, Modified, Actions
- Inline actions: View details, Edit, Archive, Delete
- Status badges with color coding
- Responsive mobile layout with card view

#### Modals

**SecretModal** - Create/Edit Secret
- Form fields: Name, Value, Description, Tags, Encryption Level, Expiration
- Tag management with Add/Remove
- Form validation before submission
- Loading states during submission

**SecretDetailsModal** - View Secret Details
- Three tabs: Details, Audit Trail, Rotation Policy
- Read-only view of all secret metadata
- Tab-based organization for related information

#### Statistics Dashboard
- Total Secrets count
- Active secrets count
- Archived secrets count
- Expiring Soon (within 30 days) count

---

## Styling & Theming

### Color Scheme (CSS Variables)

```css
--primary: #3b82f6                    /* Primary blue */
--primary-dark: #1e40af               /* Darker blue for hover */
--primary-light: #dbeafe              /* Light blue for accents */
--success: #10b981                    /* Green for success states */
--warning: #f59e0b                    /* Amber for warnings */
--danger: #ef4444                     /* Red for delete actions */
--bg: #ffffff                         /* Main background */
--bg-secondary: #f9fafb               /* Secondary background */
--border: #e5e7eb                     /* Border color */
--text-primary: #111827               /* Primary text */
--text-secondary: #6b7280             /* Secondary text */
```

### Responsive Design

- **Desktop** (1200px+): Full table view with all columns
- **Tablet** (768px-1200px): Adjusted spacing, horizontal scroll for table
- **Mobile** (<768px): Card-based view, stacked form fields

### Animation & Interactions

- Smooth transitions on all interactive elements (0.2s)
- Modal slide-up animation on open
- Hover states on buttons and table rows
- Loading spinner during async operations
- Error banner animations

---

## Error Handling

### Built-in Error Management

```javascript
const { error, clearError, loading } = useApiSecrets();

// Errors are automatically captured and displayed
// Use clearError() to dismiss error banner
// Check error state to show appropriate UI

{error && (
  <div className="error-banner">
    {error}
    <button onClick={clearError}>✕</button>
  </div>
)}
```

### Common Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | JWT token expired | User should re-authenticate |
| 403 Forbidden | User lacks permission | Check RBAC configuration |
| 409 Conflict | Secret name already exists | Use unique name |
| 500 Server Error | Backend error | Check backend logs |

---

## Security Best Practices

### Encryption

- All secrets are encrypted with AES-256-CBC by default
- AES-256-GCM available for authenticated encryption
- Encryption happens on backend before storage
- Keys are rotated according to policy (FASE 7)

### Access Control

- Supabase JWT authentication required
- RBAC (Role-Based Access Control) enforced backend
- Audit trail logs all access and modifications
- Sensitive values are never logged or displayed in clear

### Storage

- Secrets stored in PostgreSQL with encrypted_value column
- Encryption keys managed by backend key management system
- No secrets stored in localStorage or browser memory
- Frontend stores only authentication tokens (securely)

---

## Integration with FASE 5 Backend

### Authentication Flow

```
User Login (Supabase)
    ↓
JWT Token Generated
    ↓
useApiAuth Hook Captures Token
    ↓
Token Stored in localStorage + State
    ↓
API Requests Include Authorization Header
    ↓
Backend Validates JWT
    ↓
Request Processed with User Context
```

### API Request Format

All requests to backend include:
```javascript
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Response Format

Backend returns:
```json
{
  "success": true,
  "data": {
    "id": "secret_uuid",
    "name": "secret_name",
    "encryptedValue": "cipher_text",
    "status": "active",
    "createdAt": "2026-05-05T10:00:00Z"
  }
}
```

---

## Remaining Phases

### FASE 7: Key Rotation Management Interface
- Visual policy management UI
- Rotation schedule configuration
- Manual rotation triggers
- Rotation history and preview

### FASE 8: Compliance & Audit Trail Visualization
- Audit trail timeline view
- Compliance report generation
- Export to PDF/CSV formats
- Access log filtering and search

### FASE 9: Production Hardening
- HTTPS/TLS configuration
- Rate limiting on sensitive endpoints
- DDoS protection
- Log aggregation and monitoring
- Automated backup and recovery

### FASE 10: Advanced Features
- Multi-key management
- Backup and restore operations
- Hierarchical secret organization
- Integration with cloud KMS (AWS KMS, Azure Key Vault)

---

## Development Notes

### Running Locally

1. **Ensure backend is running**:
   ```bash
   cd backend
   npm install
   npm run dev
   # Should run on http://localhost:3001
   ```

2. **Check .env.local configuration**:
   ```
   VITE_BACKEND_URL=http://localhost:3001
   VITE_SUPABASE_URL=https://fjbwlelkciwmgcfixnjx.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```

3. **Run frontend**:
   ```bash
   npm run dev
   # Should run on http://localhost:5173
   ```

4. **Test Secrets Management**:
   - Log in with valid Supabase credentials
   - Navigate to Secrets Management (Cmd+K → Search)
   - Create a test secret
   - Verify backend logs show encryption

### Debugging

Enable detailed logging:
```javascript
// In development, logs appear in browser console
logger.log("message", { context });
logger.error("error", errorObject);

// Backend logs available in terminal running backend server
```

### Testing Checklist

- [ ] Create secret successfully
- [ ] View secret in list with search
- [ ] Filter by status (Active/Archived/Expired)
- [ ] Edit secret and verify changes
- [ ] Archive secret (status changes to archived)
- [ ] Delete secret (removed from list)
- [ ] Tag system works (add/remove tags)
- [ ] Expiration date tracking
- [ ] Error handling (try invalid data)
- [ ] Responsive design (test mobile view)

---

## API Documentation

### Secrets Endpoints

All endpoints require valid JWT token in Authorization header.

#### Create Secret
```
POST /api/secrets/create
Content-Type: application/json

{
  "name": "string",
  "value": "string",
  "description": "string (optional)",
  "encryptionLevel": "AES-256-CBC | AES-256-GCM",
  "expiryDate": "ISO 8601 date (optional)",
  "tags": ["string"]
}

Response: 201 Created
{
  "id": "uuid",
  "name": "string",
  "status": "active",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

#### Get Secret
```
GET /api/secrets/:id

Response: 200 OK
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "status": "active|archived|expired",
  "encryptionLevel": "AES-256-CBC",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601",
  "tags": ["string"]
}
```

#### List Secrets
```
GET /api/secrets/list

Response: 200 OK
{
  "data": [
    { /* secret objects */ }
  ],
  "total": 42
}
```

#### Update Secret
```
PUT /api/secrets/:id
Content-Type: application/json

{
  "name": "string (optional)",
  "value": "string (optional)",
  "description": "string (optional)",
  "tags": ["string (optional)"]
}

Response: 200 OK
{ /* updated secret object */ }
```

#### Delete Secret
```
DELETE /api/secrets/:id

Response: 204 No Content
```

#### Archive Secret
```
POST /api/secrets/:id/archive

Response: 200 OK
{
  "id": "uuid",
  "status": "archived"
}
```

---

## Resources

- **Frontend Code**: `/src/components/SecretsManagement/`
- **Hooks**: `/src/hooks/useApiSecrets.js`, `/src/hooks/useApiAuth.js`
- **API Service**: `/src/services/apiClientService.js`
- **Backend**: Express API on port 3001
- **Database**: PostgreSQL via Supabase

---

## Support & Documentation

For issues or questions:

1. Check browser console for detailed error messages
2. Review backend logs for server-side errors
3. Verify JWT token is valid (check localStorage)
4. Ensure backend is running and accessible
5. Check network tab in DevTools for failed requests

---

**FASE 6 Complete ✅**
**Next: FASE 7 - Key Rotation Management Interface**
