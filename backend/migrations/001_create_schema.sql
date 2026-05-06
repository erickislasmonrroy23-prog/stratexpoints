-- FASE 6: Secrets Management Schema
-- Created: 2026-05-05
-- Database: PostgreSQL 15+

-- ============================================================================
-- Enable Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Organizations Table (Multi-tenant support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_name ON organizations(name);

-- ============================================================================
-- Users Table (with organization relationship)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'viewer', -- 'admin', 'editor', 'viewer'
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_user_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);

-- ============================================================================
-- Encryption Keys Management Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  key_name VARCHAR(255) NOT NULL,
  algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'retired', 'compromised'
  key_hash VARCHAR(255), -- SHA-256 hash of key (not the key itself!)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rotated_at TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(organization_id, key_name)
);

CREATE INDEX IF NOT EXISTS idx_encrypt_org ON encryption_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_encrypt_status ON encryption_keys(status);

-- ============================================================================
-- Secrets Table (core secrets vault)
-- ============================================================================
CREATE TABLE IF NOT EXISTS secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  encryption_key_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  secret_value TEXT NOT NULL, -- Encrypted with AES-256-GCM
  secret_type VARCHAR(100), -- 'api_key', 'database_url', 'token', 'certificate', etc.
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived', 'expired', 'revoked'
  tags JSONB, -- {"env":"prod", "service":"auth"}
  expires_at TIMESTAMP,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (encryption_key_id) REFERENCES encryption_keys(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_secret_org ON secrets(organization_id);
CREATE INDEX IF NOT EXISTS idx_secret_status ON secrets(status);
CREATE INDEX IF NOT EXISTS idx_secret_created ON secrets(created_at);
CREATE INDEX IF NOT EXISTS idx_secret_expires ON secrets(expires_at);
CREATE INDEX IF NOT EXISTS idx_secret_tags ON secrets USING gin(tags);

-- ============================================================================
-- Audit Logs Table (immutable audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(100) NOT NULL, -- 'create', 'read', 'update', 'delete', 'archive', 'restore'
  resource_type VARCHAR(100) NOT NULL, -- 'secret', 'key', 'user', 'policy'
  resource_id UUID,
  resource_name VARCHAR(255),
  changes JSONB, -- What changed: {"old_value":"...", "new_value":"..."}
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'success', -- 'success', 'failure', 'denied'
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- ============================================================================
-- RBAC Permissions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS rbac_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  resource_type VARCHAR(100) NOT NULL, -- 'secret', 'key', 'all'
  resource_id UUID, -- NULL for all resources of that type
  permission VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete', 'share', 'admin'
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by UUID NOT NULL,
  expires_at TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_rbac_user ON rbac_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_rbac_resource ON rbac_permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_rbac_org ON rbac_permissions(organization_id);

-- ============================================================================
-- Secret Access Logs (fine-grained access tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS secret_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  secret_id UUID NOT NULL,
  user_id UUID,
  access_type VARCHAR(50), -- 'read', 'update', 'delete', 'export', 'share'
  success BOOLEAN DEFAULT TRUE,
  ip_address INET,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (secret_id) REFERENCES secrets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_access_secret ON secret_access_logs(secret_id);
CREATE INDEX IF NOT EXISTS idx_access_accessed_at ON secret_access_logs(accessed_at);
CREATE INDEX IF NOT EXISTS idx_access_org ON secret_access_logs(organization_id);

-- ============================================================================
-- Sessions Table (JWT token tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE, -- Hash of JWT token
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_revoked ON sessions(revoked_at);

-- ============================================================================
-- Insert default organization (for development/testing)
-- ============================================================================
INSERT INTO organizations (id, name, description)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'Default organization for development')
ON CONFLICT (name) DO NOTHING;
