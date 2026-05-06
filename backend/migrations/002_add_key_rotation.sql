-- FASE 7: Key Rotation Management
-- Migration 002: Add key rotation tables and schema

-- ============================================================================
-- 1. CREATE key_rotation_policies TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS key_rotation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  secret_id UUID NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,

  -- Policy Configuration
  enabled BOOLEAN DEFAULT FALSE,
  rotation_frequency VARCHAR(50) DEFAULT 'monthly',
  rotation_interval_days INTEGER DEFAULT 30,
  auto_rotate BOOLEAN DEFAULT FALSE,
  notification_days_before INTEGER DEFAULT 7,
  max_versions_to_keep INTEGER DEFAULT 5,

  -- Tracking
  last_rotated_at TIMESTAMP,
  next_rotation_at TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(secret_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_rotation_policies_org_id ON key_rotation_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_rotation_policies_secret_id ON key_rotation_policies(secret_id);
CREATE INDEX IF NOT EXISTS idx_rotation_policies_next_rotation ON key_rotation_policies(next_rotation_at) WHERE enabled = true;

-- ============================================================================
-- 2. CREATE key_rotation_history TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS key_rotation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  secret_id UUID NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,
  encryption_key_id UUID NOT NULL REFERENCES encryption_keys(id),

  -- Rotation Details
  old_key_id UUID REFERENCES encryption_keys(id),
  new_key_id UUID REFERENCES encryption_keys(id),
  rotation_type VARCHAR(50) DEFAULT 'manual', -- manual, scheduled, emergency
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, failed, rolled_back

  -- Tracking
  rotated_by VARCHAR(255),
  completed_at TIMESTAMP,
  rotation_duration_seconds INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (secret_id) REFERENCES secrets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rotation_history_org_id ON key_rotation_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_rotation_history_secret_id ON key_rotation_history(secret_id);
CREATE INDEX IF NOT EXISTS idx_rotation_history_status ON key_rotation_history(status);
CREATE INDEX IF NOT EXISTS idx_rotation_history_created_at ON key_rotation_history(created_at DESC);

-- ============================================================================
-- 3. CREATE rotation_schedules TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rotation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  secret_id UUID NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES key_rotation_policies(id) ON DELETE CASCADE,

  -- Scheduling
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, failed, cancelled

  -- Retry Logic
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMP,
  next_retry_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rotation_schedules_org_id ON rotation_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_rotation_schedules_scheduled_for ON rotation_schedules(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_rotation_schedules_status ON rotation_schedules(status);

-- ============================================================================
-- 4. CREATE rotation_notifications TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rotation_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id VARCHAR(255),
  secret_id UUID NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,

  -- Notification Details
  notification_type VARCHAR(50), -- rotation_scheduled, rotation_completed, rotation_failed
  message TEXT,
  read_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rotation_notifications_org_id ON rotation_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_rotation_notifications_user_id ON rotation_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_rotation_notifications_read_at ON rotation_notifications(read_at);

-- ============================================================================
-- 5. ALTER encryption_keys TABLE - Add rotation tracking columns
-- ============================================================================
ALTER TABLE encryption_keys
ADD COLUMN IF NOT EXISTS key_size INTEGER DEFAULT 256,
ADD COLUMN IF NOT EXISTS rotation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_rotation_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_rotated_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_rotated_version BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_key_id UUID REFERENCES encryption_keys(id);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_parent_id ON encryption_keys(parent_key_id);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_is_rotated ON encryption_keys(is_rotated_version);

-- ============================================================================
-- 6. ALTER secrets TABLE - Add rotation fields
-- ============================================================================
ALTER TABLE secrets
ADD COLUMN IF NOT EXISTS rotation_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_rotated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS next_rotation_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_secrets_rotation_enabled ON secrets(rotation_enabled);
CREATE INDEX IF NOT EXISTS idx_secrets_next_rotation_at ON secrets(next_rotation_at);

-- ============================================================================
-- 7. Create trigger to update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to key_rotation_policies if it doesn't exist
DROP TRIGGER IF EXISTS update_rotation_policies_updated_at ON key_rotation_policies;
CREATE TRIGGER update_rotation_policies_updated_at
BEFORE UPDATE ON key_rotation_policies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to rotation_schedules if it doesn't exist
DROP TRIGGER IF EXISTS update_rotation_schedules_updated_at ON rotation_schedules;
CREATE TRIGGER update_rotation_schedules_updated_at
BEFORE UPDATE ON rotation_schedules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. Insert audit log entries for FASE 7 schema initialization
-- ============================================================================
-- Insert audit log entries for FASE 7 schema initialization
-- (Disabled - audit log table may not exist yet)
-- INSERT INTO audit_logs (
--   organization_id, user_id, action, resource_type, resource_id, status, created_at
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000', 'system-user', 'schema_migration',
--   'database', '002_key_rotation', 'success', CURRENT_TIMESTAMP
-- );
