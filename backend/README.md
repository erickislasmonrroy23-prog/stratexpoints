# StratexPoints Backend - FASE 6

Express.js backend for StratexPoints secrets management system.

## 📋 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create .env.local from example
cp .env.example .env.local

# Update database credentials in .env.local
```

### Database Setup

```bash
# Option 1: Automatic initialization (on first run)
npm run dev
# The server will automatically create tables on startup

# Option 2: Manual migration
npm run migrate
```

### Running the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Server will be available at http://localhost:3001
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── index.js                 # Express app entry point
│   ├── middleware/
│   │   ├── auth.js              # JWT and RBAC middleware
│   │   └── errorHandler.js      # Global error handling
│   ├── routes/
│   │   └── secretsRoutes.js     # Secrets API endpoints
│   ├── services/
│   │   └── secretsService.js    # Business logic
│   ├── utils/
│   │   ├── database.js          # PostgreSQL connection pool
│   │   └── encryption.js        # AES-256-GCM encryption
│   └── models/
│       └── (models coming in FASE 7+)
├── migrations/
│   └── 001_create_schema.sql    # Database schema
├── config/
│   └── (configuration files)
├── package.json
├── .env.example                 # Environment variables template
└── .env.local                   # Local development config
```

## 🔐 API Endpoints (FASE 6)

### Secrets Management

#### Create Secret
```
POST /api/secrets
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "api-key-prod",
  "description": "Production API key",
  "secret_value": "sk_live_...",
  "secret_type": "api_key",
  "tags": {"env": "production", "service": "auth"},
  "expires_at": "2026-12-31T23:59:59Z"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "api-key-prod",
    "description": "Production API key",
    "secret_type": "api_key",
    "status": "active",
    "created_at": "2026-05-05T10:00:00Z"
  }
}
```

#### List Secrets
```
GET /api/secrets?status=active&page=1&limit=50&search=api&sort=created_at&order=DESC
Authorization: Bearer <JWT_TOKEN>

Response: 200 OK
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### Get Secret Details
```
GET /api/secrets/:secretId
Authorization: Bearer <JWT_TOKEN>

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "api-key-prod",
    "description": "Production API key",
    "secret_type": "api_key",
    "status": "active",
    "tags": {"env": "production"},
    "expires_at": "2026-12-31T23:59:59Z",
    "created_at": "2026-05-05T10:00:00Z",
    "auditTrail": [...]
  }
}
```

#### Get Secret Value (Decrypted)
```
GET /api/secrets/:secretId/value
Authorization: Bearer <JWT_TOKEN>

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "api-key-prod",
    "value": "sk_live_...",
    "type": "api_key"
  }
}
```

#### Update Secret
```
PUT /api/secrets/:secretId
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "description": "Updated description",
  "secret_value": "sk_live_new",
  "status": "active"
}

Response: 200 OK
{
  "success": true,
  "data": {...},
  "message": "Secret updated successfully"
}
```

#### Delete Secret (Archive or Permanent)
```
DELETE /api/secrets/:secretId?permanent=false
Authorization: Bearer <JWT_TOKEN>

Response: 200 OK
{
  "success": true,
  "message": "Secret archived"
}
```

#### Get Audit Trail
```
GET /api/secrets/:secretId/audit?limit=100&offset=0
Authorization: Bearer <JWT_TOKEN>
(Requires admin role)

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "action": "create|read|update|delete",
      "changes": {...},
      "timestamp": "2026-05-05T10:00:00Z",
      "ip_address": "192.168.1.1",
      "status": "success"
    }
  ]
}
```

## 🔒 Authentication

All endpoints (except `/health`) require JWT authentication:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### JWT Payload

```json
{
  "userId": "uuid",
  "organizationId": "uuid",
  "role": "admin|editor|viewer",
  "type": "access",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Role-Based Access Control

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| admin | ✓ | ✓ | ✓ | ✓ |
| editor | ✓ | ✓ | ✓ | - |
| viewer | - | ✓ | - | - |

## 🔐 Encryption

All secrets are encrypted using **AES-256-GCM** before storage:

- **Algorithm:** AES-256-GCM
- **Key Source:** `ENCRYPTION_MASTER_KEY` environment variable (256-bit hex)
- **IV:** Generated randomly per encryption
- **Authentication Tag:** GCM mode provides authenticity verification

### Encryption Storage Format

```json
{
  "encryptedData": "hex-encoded-ciphertext",
  "iv": "hex-encoded-initialization-vector",
  "authTag": "hex-encoded-authentication-tag"
}
```

## 📊 Database Schema

### Organizations Table
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'viewer',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Secrets Table
```sql
CREATE TABLE secrets (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  encryption_key_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  secret_value TEXT NOT NULL, -- Encrypted JSON
  secret_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  tags JSONB,
  expires_at TIMESTAMP,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

## 🛡️ Security Features

- ✅ JWT-based authentication
- ✅ Role-based access control (RBAC)
- ✅ AES-256-GCM encryption for secrets
- ✅ Audit logging for all operations
- ✅ SQL injection prevention (parameterized queries)
- ✅ Input validation (Joi schemas)
- ✅ CORS configuration
- ✅ Rate limiting (configurable)
- ✅ Secure headers (HSTS, CSP, etc.)

## 📝 Logging

Logs are written to both console and file:

```
logs/backend.log
```

Log levels: `debug`, `info`, `warn`, `error`

Configure with `LOG_LEVEL` environment variable.

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📦 Dependencies

- **express** - Web framework
- **pg** - PostgreSQL driver
- **jsonwebtoken** - JWT authentication
- **bcryptjs** - Password hashing
- **uuid** - UUID generation
- **winston** - Logging
- **joi** - Input validation
- **cors** - CORS middleware
- **dotenv** - Environment variable management

## 🚀 Deployment

### Environment Variables

Before deploying, set the following environment variables:

```bash
NODE_ENV=production
PORT=3001
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=stratexpoints
JWT_SECRET=your-super-secure-jwt-secret
ENCRYPTION_MASTER_KEY=your-256-bit-hex-key
FRONTEND_URL=https://your-frontend.com
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src ./src
COPY migrations ./migrations
EXPOSE 3001
CMD ["npm", "start"]
```

## 🐛 Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` in `.env.local`
- Test connection: `psql -h localhost -U postgres -d stratexpoints`

### Encryption Error
- Ensure `ENCRYPTION_MASTER_KEY` is 256 bits (32 bytes in hex = 64 characters)
- Verify the key is valid hex format

### JWT Token Error
- Check JWT token is properly formatted in Authorization header
- Verify `JWT_SECRET` matches between frontend and backend
- Ensure token hasn't expired

## 📚 Next Phases

- **FASE 7:** Key Rotation Management
- **FASE 8:** Compliance & Audit Trail Visualization
- **FASE 9:** Production Hardening
- **FASE 10:** Advanced Features (Multi-key, Backup, KMS)

## 📧 Support

For issues or questions about the backend, check:
- `PROGRESS_STATUS.md` - Project status
- `FASE_6_SECRETS_MANAGEMENT.md` - Implementation guide
- `API_HOOKS_SPECIFICATION.md` - API hook documentation

---

**Version:** 1.0.0  
**Status:** FASE 6 - Secrets Management  
**Last Updated:** 2026-05-05
