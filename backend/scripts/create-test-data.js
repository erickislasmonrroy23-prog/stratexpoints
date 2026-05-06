/**
 * Create test data for FASE 7 rotation endpoints
 */

import pkg from 'pg';
const { Client } = pkg;
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stratexpoints',
});

async function createTestData() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Default organization ID
    const orgId = '00000000-0000-0000-0000-000000000001';
    const userId = crypto.randomUUID();
    const keyId = crypto.randomUUID();
    const secretId = crypto.randomUUID();
    const keyHash = crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');

    // 1. Create test user
    console.log('Creating test user...');
    await client.query(
      `INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (organization_id, email) DO NOTHING`,
      [
        userId,
        orgId,
        'test-rotation@example.com',
        'hash_placeholder',
        'Test',
        'Rotation',
        'admin',
        'active',
      ]
    );
    console.log(`✓ Test user created: ${userId}`);

    // 2. Create test encryption key
    console.log('Creating test encryption key...');
    await client.query(
      `INSERT INTO encryption_keys (id, organization_id, key_name, algorithm, key_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [keyId, orgId, 'test-key-rotation', 'AES-256-GCM', keyHash, 'active']
    );
    console.log(`✓ Test encryption key created: ${keyId}`);

    // 3. Create test secret
    console.log('Creating test secret...');
    await client.query(
      `INSERT INTO secrets (id, organization_id, encryption_key_id, name, description, secret_value, secret_type, status, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (organization_id, name) DO NOTHING`,
      [
        secretId,
        orgId,
        keyId,
        'test-api-key',
        'Test API key for rotation testing',
        'encrypted_secret_value_here',
        'api_key',
        'active',
        userId,
        userId,
      ]
    );
    console.log(`✓ Test secret created: ${secretId}`);

    // 4. Create test rotation policy
    console.log('Creating test rotation policy...');
    const policyResult = await client.query(
      `INSERT INTO key_rotation_policies
       (organization_id, secret_id, enabled, rotation_frequency, rotation_interval_days, auto_rotate, notification_days_before, max_versions_to_keep, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        orgId,
        secretId,
        false,
        'monthly',
        30,
        false,
        7,
        5,
        userId,
        userId,
      ]
    );
    const policyId = policyResult.rows[0].id;
    console.log(`✓ Test rotation policy created: ${policyId}`);

    console.log('\n✅ Test data created successfully!');
    console.log(`
Test Data Summary:
  Organization ID: ${orgId}
  User ID: ${userId}
  User Email: test-rotation@example.com
  Encryption Key ID: ${keyId}
  Secret ID: ${secretId}
  Rotation Policy ID: ${policyId}

Use these IDs in your API tests.
    `);

    // Print sample curl commands for testing
    console.log('\nSample curl commands for testing:');
    console.log(`
# Get rotation policy (requires valid JWT token)
curl -X GET http://localhost:3001/api/keys/${secretId}/policy \\
  -H "Authorization: Bearer <JWT_TOKEN>"

# Preview rotation
curl -X GET http://localhost:3001/api/keys/${secretId}/preview \\
  -H "Authorization: Bearer <JWT_TOKEN>"

# Get rotation history
curl -X GET http://localhost:3001/api/keys/${secretId}/history \\
  -H "Authorization: Bearer <JWT_TOKEN>"

# Trigger immediate rotation
curl -X POST http://localhost:3001/api/keys/${secretId}/rotate \\
  -H "Authorization: Bearer <JWT_TOKEN>"

# Update rotation policy
curl -X POST http://localhost:3001/api/keys/${secretId}/policy \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"enabled": true, "rotation_interval_days": 30}'
    `);

    await client.end();
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  }
}

createTestData();
