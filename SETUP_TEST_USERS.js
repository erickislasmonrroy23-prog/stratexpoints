/**
 * Setup Test Users for E2E Testing
 * Creates test users and organizations if they don't exist
 *
 * Run with: node SETUP_TEST_USERS.js
 */

import { createClient } from '@supabase/supabase-js';

// Configuration - using SERVICE_ROLE_KEY for admin operations
const SUPABASE_URL = 'https://fjbwlelkciwmgcfixnjx.supabase.co';
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SERVICE_ROLE_KEY environment variable is not set');
  console.error('You need the service role key to create test users');
  console.error('Get it from: https://app.supabase.com/project/[project-id]/settings/api');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const TEST_PASSWORD = 'Test@123456';

const TEST_ORGANIZATIONS = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: 'ACME Corporation'
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
    name: 'TechCorp Inc'
  }
];

const TEST_USERS = [
  {
    email: 'admin@acme.test',
    password: TEST_PASSWORD,
    profile: {
      email: 'admin@acme.test',
      full_name: 'ACME Admin',
      role: 'admin',
      is_super_admin: false
    },
    org_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    org_role: 'admin'
  },
  {
    email: 'editor@acme.test',
    password: TEST_PASSWORD,
    profile: {
      email: 'editor@acme.test',
      full_name: 'ACME Editor',
      role: 'editor',
      is_super_admin: false
    },
    org_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    org_role: 'editor'
  },
  {
    email: 'viewer@acme.test',
    password: TEST_PASSWORD,
    profile: {
      email: 'viewer@acme.test',
      full_name: 'ACME Viewer',
      role: 'viewer',
      is_super_admin: false
    },
    org_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    org_role: 'viewer'
  },
  {
    email: 'admin@techcorp.test',
    password: TEST_PASSWORD,
    profile: {
      email: 'admin@techcorp.test',
      full_name: 'TechCorp Admin',
      role: 'admin',
      is_super_admin: false
    },
    org_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
    org_role: 'admin'
  },
  {
    email: 'viewer@techcorp.test',
    password: TEST_PASSWORD,
    profile: {
      email: 'viewer@techcorp.test',
      full_name: 'TechCorp Viewer',
      role: 'viewer',
      is_super_admin: false
    },
    org_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
    org_role: 'viewer'
  },
  {
    email: 'superadmin@platform.test',
    password: TEST_PASSWORD,
    profile: {
      email: 'superadmin@platform.test',
      full_name: 'Platform Super Admin',
      role: 'super_admin',
      is_super_admin: true
    },
    org_id: null,
    org_role: null
  }
];

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

async function setupOrganizations() {
  log('blue', '\n📋 Setting up organizations...');

  for (const org of TEST_ORGANIZATIONS) {
    try {
      // Check if org exists
      const { data, error: selectError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', org.id)
        .single();

      if (!selectError && data) {
        log('yellow', `   ⚠️  Organization exists: ${org.name}`);
        continue;
      }

      // Create org
      const { error: insertError } = await supabase
        .from('organizations')
        .insert({
          id: org.id,
          name: org.name,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        log('yellow', `   ⚠️  Could not create org ${org.name}: ${insertError.message}`);
      } else {
        log('green', `   ✅ Organization created: ${org.name}`);
      }
    } catch (err) {
      log('yellow', `   ⚠️  Error setting up ${org.name}: ${err.message}`);
    }
  }
}

async function setupUsers() {
  log('blue', '\n👥 Setting up test users...');

  for (const testUser of TEST_USERS) {
    try {
      log('cyan', `\n   ${testUser.email}:`);

      // Check if user exists
      const { data: existingUser } = await supabase.auth.admin.getUserById(
        testUser.profile.email
      ).catch(() => ({ data: null }));

      let userId;

      if (existingUser) {
        log('yellow', `   ⚠️  User already exists`);
        userId = existingUser.id;
      } else {
        // Create user with email and password
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
          user_metadata: {
            full_name: testUser.profile.full_name
          }
        });

        if (authError) {
          log('red', `   ❌ Error creating auth user: ${authError.message}`);
          continue;
        }

        userId = authData.user.id;
        log('green', `   ✅ Auth user created`);
      }

      // Update or create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: testUser.profile.email,
          full_name: testUser.profile.full_name,
          role: testUser.profile.role,
          is_super_admin: testUser.profile.is_super_admin,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        log('red', `   ❌ Error updating profile: ${profileError.message}`);
        continue;
      }

      log('green', `   ✅ Profile updated`);

      // Link to organization if applicable
      if (testUser.org_id) {
        const { error: linkError } = await supabase
          .from('profile_organizations')
          .upsert({
            profile_id: userId,
            organization_id: testUser.org_id,
            role: testUser.org_role,
            joined_at: new Date().toISOString()
          }, {
            onConflict: 'profile_id,organization_id'
          });

        if (linkError) {
          log('yellow', `   ⚠️  Could not link to organization: ${linkError.message}`);
        } else {
          log('green', `   ✅ Linked to organization`);
        }
      }

    } catch (err) {
      log('red', `   ❌ Error: ${err.message}`);
    }
  }
}

async function runSetup() {
  log('bright', '\n' + '='.repeat(80));
  log('bright', '🚀 Test User & Organization Setup');
  log('bright', '='.repeat(80));

  log('cyan', `\nSupabase Project: ${SUPABASE_URL}`);
  log('cyan', `Test Password: ${TEST_PASSWORD}`);

  try {
    await setupOrganizations();
    await setupUsers();

    log('bright', '\n' + '='.repeat(80));
    log('green', '✅ Setup Complete!');
    log('bright', '='.repeat(80));

    log('bright', '\nTest Users Created:');
    TEST_USERS.forEach(user => {
      log('cyan', `  📧 ${user.email}`);
      log('cyan', `     Password: ${TEST_PASSWORD}`);
      log('cyan', `     Role: ${user.profile.role}`);
    });

    log('bright', '\n' + '='.repeat(80) + '\n');

  } catch (err) {
    log('red', `Fatal error: ${err.message}`);
    process.exit(1);
  }
}

// Run setup
runSetup();
