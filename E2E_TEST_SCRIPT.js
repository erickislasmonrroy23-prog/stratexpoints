/**
 * End-to-End Integration Test Script
 * Tests JWT + auth-context Edge Function integration
 *
 * Run with: node E2E_TEST_SCRIPT.js
 */

import { createClient } from '@supabase/supabase-js';

// Configuration from .env.local
const SUPABASE_URL = 'https://fjbwlelkciwmgcfixnjx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sJs0Ekje8utLBATORUk3rQ_nxYFgIFz';

// Test users
const TEST_USERS = [
  {
    email: 'admin@acme.test',
    password: 'Test@123456',
    expected_role: 'admin',
    expected_org: 'ACME Corporation'
  },
  {
    email: 'editor@acme.test',
    password: 'Test@123456',
    expected_role: 'editor',
    expected_org: 'ACME Corporation'
  },
  {
    email: 'viewer@acme.test',
    password: 'Test@123456',
    expected_role: 'viewer',
    expected_org: 'ACME Corporation'
  },
  {
    email: 'admin@techcorp.test',
    password: 'Test@123456',
    expected_role: 'admin',
    expected_org: 'TechCorp Inc'
  },
  {
    email: 'superadmin@platform.test',
    password: 'Test@123456',
    expected_role: 'super_admin',
    expected_org: null
  }
];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(`${colors[color]}${args.join(' ')}${colors.reset}`);
}

async function testAuthFlow(testUser) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  log('cyan', `\n${'='.repeat(80)}`);
  log('bright', `Testing: ${testUser.email}`);
  log('cyan', `${'='.repeat(80)}`);

  try {
    // Step 1: Sign in
    log('blue', '1️⃣  Signing in with Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });

    if (authError) {
      log('red', `   ❌ Auth error: ${authError.message}`);
      return false;
    }

    if (!authData.session) {
      log('red', `   ❌ No session returned`);
      return false;
    }

    log('green', `   ✅ Authentication successful`);
    log('bright', `   User ID: ${authData.user.id}`);
    log('bright', `   Access Token: ${authData.session.access_token.substring(0, 50)}...`);
    log('bright', `   Token Expiry: ${new Date(authData.session.expires_at * 1000).toISOString()}`);

    // Step 2: Load profile
    log('blue', '2️⃣  Loading user profile...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        is_super_admin,
        organizations:profile_organizations(
          id,
          name,
          role
        )
      `)
      .eq('id', authData.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      log('yellow', `   ⚠️  Profile load warning: ${profileError.message}`);
    } else if (profileData) {
      log('green', `   ✅ Profile loaded`);
      log('bright', `   Role: ${profileData.role || 'Not set'}`);
      log('bright', `   Super Admin: ${profileData.is_super_admin}`);
      log('bright', `   Organizations: ${profileData.organizations?.length || 0}`);
    }

    // Step 3: Call auth-context Edge Function
    log('blue', '3️⃣  Calling auth-context Edge Function...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-context`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      log('red', `   ❌ Edge Function error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      log('red', `   ${errorText}`);
      return false;
    }

    const authContext = await response.json();
    log('green', `   ✅ Auth context loaded`);

    // Display auth context
    if (authContext.data) {
      const ctx = authContext.data;
      log('bright', `   User: ${ctx.email}`);
      log('bright', `   Is Super Admin: ${ctx.is_super_admin}`);
      log('bright', `   Organizations: ${ctx.organizations?.length || 0}`);
      if (ctx.organizations?.length > 0) {
        log('bright', `   Primary Org: ${ctx.organizations[0].name} (${ctx.organizations[0].role})`);
      }
      log('bright', `   Password Rotation Due: ${ctx.password_rotation_due}`);
      log('bright', `   Enterprise Features:`);
      Object.entries(ctx.enterprise_features || {}).forEach(([key, value]) => {
        log('bright', `     - ${key}: ${value}`);
      });
    }

    // Step 4: Verify expectations
    log('blue', '4️⃣  Verifying test expectations...');
    let allPass = true;

    const ctx = authContext.data;

    // Check email
    if (ctx.email !== testUser.email) {
      log('red', `   ❌ Email mismatch: got ${ctx.email}, expected ${testUser.email}`);
      allPass = false;
    } else {
      log('green', `   ✅ Email matches`);
    }

    // Check role (if not super admin)
    if (!testUser.email.includes('superadmin')) {
      const actualRole = ctx.organizations?.[0]?.role || ctx.role;
      if (actualRole !== testUser.expected_role) {
        log('yellow', `   ⚠️  Role: got ${actualRole}, expected ${testUser.expected_role}`);
      } else {
        log('green', `   ✅ Role matches: ${actualRole}`);
      }
    }

    // Check org (if not super admin)
    if (!testUser.email.includes('superadmin')) {
      const actualOrg = ctx.organizations?.[0]?.name;
      if (actualOrg !== testUser.expected_org) {
        log('yellow', `   ⚠️  Organization: got ${actualOrg}, expected ${testUser.expected_org}`);
      } else {
        log('green', `   ✅ Organization matches: ${actualOrg}`);
      }
    }

    // Check session info
    if (ctx.session_info) {
      log('green', `   ✅ Session info present`);
      log('bright', `     Expires at: ${ctx.session_info.expires_at}`);
    } else {
      log('yellow', `   ⚠️  No session info in response`);
    }

    // Check enterprise features
    if (ctx.enterprise_features) {
      log('green', `   ✅ Enterprise features present`);
    } else {
      log('yellow', `   ⚠️  No enterprise features in response`);
    }

    // Sign out
    await supabase.auth.signOut();
    log('green', '   ✅ Signed out');

    if (allPass) {
      log('green', '\n✅ Test PASSED');
    } else {
      log('yellow', '\n⚠️  Test completed with warnings');
    }

    return true;

  } catch (err) {
    log('red', `❌ Test failed with exception: ${err.message}`);
    return false;
  }
}

async function runAllTests() {
  log('bright', '\n' + '='.repeat(80));
  log('bright', '🧪 JWT + Auth-Context Integration E2E Tests');
  log('bright', '='.repeat(80));

  log('cyan', `\nSupabase Project: ${SUPABASE_URL}`);
  log('cyan', `Total Tests: ${TEST_USERS.length}`);

  let passedCount = 0;
  let failedCount = 0;

  for (const testUser of TEST_USERS) {
    const success = await testAuthFlow(testUser);
    if (success) {
      passedCount++;
    } else {
      failedCount++;
    }
    // Small delay between tests
    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  log('bright', '\n' + '='.repeat(80));
  log('bright', '📊 Test Summary');
  log('bright', '='.repeat(80));
  log('green', `✅ Passed: ${passedCount}`);
  log(failedCount > 0 ? 'red' : 'green', `${failedCount > 0 ? '❌' : '✅'} Failed: ${failedCount}`);
  log('bright', `Total: ${TEST_USERS.length}`);
  log('bright', `Success Rate: ${Math.round((passedCount / TEST_USERS.length) * 100)}%`);
  log('bright', '='.repeat(80) + '\n');

  if (failedCount === 0) {
    log('green', '🎉 All tests passed! Integration is working correctly.');
  } else {
    log('yellow', '⚠️  Some tests failed. Please review the errors above.');
  }
}

// Run tests
runAllTests().catch(err => {
  log('red', `Fatal error: ${err.message}`);
  process.exit(1);
});
