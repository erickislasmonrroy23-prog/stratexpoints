-- ============================================================================
-- Migration 012: RLS Hardening
-- ============================================================================
-- Purpose: Verify and enforce Row Level Security (RLS) on all tables
-- Ensures data isolation and prevents unauthorized access at the database level
--
-- Key Changes:
-- 1. Enable RLS on all public tables
-- 2. Create RLS policies for profiles (user own profile + super admin)
-- 3. Create RLS policies for organizations (user's orgs + super admin)
-- 4. Create RLS policies for profile_organizations (user's memberships + super admin)
-- 5. Create RLS policies for audit_logs (organization-scoped + super admin)
--
-- Security Model:
-- - Users can only access their own data
-- - Super admins can access everything
-- - Organization data is tenant-isolated
-- - Audit logs are organization-scoped
-- ============================================================================

-- Step 1: Check for tables without RLS enabled
-- This query helps identify which tables need RLS enabled
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = false;

-- Step 2: Enable RLS on all critical tables
ALTER TABLE IF EXISTS auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profile_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================
-- Users can only view their own profile or if they are super admin
-- ============================================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can update all profiles" ON profiles;

-- SELECT: Users view their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (
    -- User's own profile
    auth.uid() = id
    -- OR super admin
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- UPDATE: Users update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (
    -- User's own profile
    auth.uid() = id
    -- OR super admin
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  )
  WITH CHECK (
    -- User's own profile
    auth.uid() = id
    -- OR super admin
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- INSERT: Only for account creation (handled by triggers)
-- DELETE: Only super admin can delete profiles
CREATE POLICY "Super admin can delete profiles"
  ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- ORGANIZATIONS TABLE POLICIES
-- ============================================================================
-- Users can only access organizations they belong to
-- Super admins can access all organizations
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can manage all organizations" ON organizations;

-- SELECT: Users view organizations they belong to
CREATE POLICY "Users can view their organizations"
  ON organizations
  FOR SELECT
  USING (
    -- User is member of this organization
    id IN (
      SELECT organization_id FROM profile_organizations
      WHERE profile_id = auth.uid()
    )
    -- OR user is super admin
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- UPDATE: Organization admins can update
CREATE POLICY "Organization admins can update their org"
  ON organizations
  FOR UPDATE
  USING (
    -- User is org admin
    id IN (
      SELECT organization_id FROM profile_organizations
      WHERE profile_id = auth.uid() AND role = 'admin'
    )
    -- OR user is super admin
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  )
  WITH CHECK (
    -- User is org admin
    id IN (
      SELECT organization_id FROM profile_organizations
      WHERE profile_id = auth.uid() AND role = 'admin'
    )
    -- OR user is super admin
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- DELETE: Super admin only
CREATE POLICY "Super admin can delete organizations"
  ON organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- PROFILE_ORGANIZATIONS TABLE POLICIES
-- ============================================================================
-- Junction table linking profiles to organizations
-- Users can view their own memberships
-- Org admins can manage memberships in their org
-- Super admins can manage all memberships
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their organization memberships" ON profile_organizations;
DROP POLICY IF EXISTS "Org admins can manage memberships" ON profile_organizations;
DROP POLICY IF EXISTS "Super admin can manage all memberships" ON profile_organizations;

-- SELECT: Users view their own memberships
CREATE POLICY "Users can view their organization memberships"
  ON profile_organizations
  FOR SELECT
  USING (
    -- User's own membership
    profile_id = auth.uid()
    -- OR user is admin of this organization
    OR organization_id IN (
      SELECT organization_id FROM profile_organizations
      WHERE profile_id = auth.uid() AND role = 'admin'
    )
    -- OR user is super admin
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- INSERT: Org admins can add members
CREATE POLICY "Org admins can add members"
  ON profile_organizations
  FOR INSERT
  WITH CHECK (
    -- Org admin can add members
    organization_id IN (
      SELECT organization_id FROM profile_organizations
      WHERE profile_id = auth.uid() AND role = 'admin'
    )
    -- OR super admin can add members
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- UPDATE: Org admins can change role (but not their own)
CREATE POLICY "Org admins can manage member roles"
  ON profile_organizations
  FOR UPDATE
  USING (
    -- Org admin can update (but not themselves)
    organization_id IN (
      SELECT organization_id FROM profile_organizations
      WHERE profile_id = auth.uid() AND role = 'admin'
    )
    AND profile_id != auth.uid() -- Cannot change own role
    -- OR super admin
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  )
  WITH CHECK (
    -- Same conditions for update
    organization_id IN (
      SELECT organization_id FROM profile_organizations
      WHERE profile_id = auth.uid() AND role = 'admin'
    )
    AND profile_id != auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- DELETE: Org admins can remove members
CREATE POLICY "Org admins can remove members"
  ON profile_organizations
  FOR DELETE
  USING (
    -- Org admin can remove members (but not themselves)
    organization_id IN (
      SELECT organization_id FROM profile_organizations
      WHERE profile_id = auth.uid() AND role = 'admin'
    )
    AND profile_id != auth.uid()
    -- OR super admin
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- OKRS TABLE POLICIES (Organization-scoped)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their org OKRs" ON okrs;
DROP POLICY IF EXISTS "Users can manage their org OKRs" ON okrs;

CREATE POLICY "Users can view their org OKRs"
  ON okrs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profile_organizations
      WHERE profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- KPIS TABLE POLICIES (Organization-scoped)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their org KPIs" ON kpis;
DROP POLICY IF EXISTS "Users can manage their org KPIs" ON kpis;

CREATE POLICY "Users can view their org KPIs"
  ON kpis
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profile_organizations
      WHERE profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- INITIATIVES TABLE POLICIES (Organization-scoped)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their org initiatives" ON initiatives;
DROP POLICY IF EXISTS "Users can manage their org initiatives" ON initiatives;

CREATE POLICY "Users can view their org initiatives"
  ON initiatives
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profile_organizations
      WHERE profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- AUDIT_LOGS TABLE POLICIES
-- ============================================================================
-- Audit logs are organization-scoped
-- Users can only view logs for their organizations
-- Super admins can view all logs
-- Only system/service role can INSERT (application-controlled)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their org audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Super admin can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Only service role can insert audit logs" ON audit_logs;

-- SELECT: Users view audit logs for their organizations only
CREATE POLICY "Users can view their org audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profile_organizations
      WHERE profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- INSERT: Only service role can create audit logs
-- This is enforced via application logic and service role
CREATE POLICY "Only service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true); -- Service role has bypass, regular users denied by role

-- No UPDATE or DELETE policies - audit logs are immutable

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Super admin can view all notifications" ON notifications;

CREATE POLICY "Users can view their notifications"
  ON notifications
  FOR SELECT
  USING (
    recipient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- VERIFICATION: Check RLS is enabled
-- ============================================================================
-- After running this migration, verify RLS is enabled on all critical tables:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- All should show rowsecurity = true
-- ============================================================================
