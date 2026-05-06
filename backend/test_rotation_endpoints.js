import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const API_BASE = 'http://localhost:3001/api/keys';
const ORG_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000002';

// Generate valid JWT token
function generateTestToken(role = 'admin') {
  const token = jwt.sign(
    {
      userId: TEST_USER_ID,
      organizationId: ORG_ID,
      role: role,
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  return token;
}

// Test helper function
async function testEndpoint(method, endpoint, token, body = null, description = '') {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    
    const status = response.status;
    const success = status >= 200 && status < 300;
    
    console.log(`\n${success ? '✓' : '✗'} [${status}] ${method} ${endpoint}`);
    if (description) console.log(`  Description: ${description}`);
    console.log(`  URL: ${url}`);
    if (data.error) console.log(`  Error: ${data.error}`);
    else if (data.success === false) console.log(`  Response: ${JSON.stringify(data).substring(0, 200)}`);
    else console.log(`  Response: ${JSON.stringify(data, null, 2).substring(0, 300)}`);
    
    return { status, success, data };
  } catch (error) {
    console.error(`\n✗ ERROR ${method} ${endpoint}:`, error.message);
    return { status: null, success: false, error: error.message };
  }
}

// Run tests
async function runTests() {
  console.log('========================================');
  console.log('FASE 7 Rotation Endpoints Test Suite');
  console.log('========================================');
  
  const adminToken = generateTestToken('admin');
  const editorToken = generateTestToken('editor');
  const viewerToken = generateTestToken('viewer');
  
  console.log(`\nTokens Generated:`);
  console.log(`  Admin Token: ${adminToken.substring(0, 20)}...`);
  console.log(`  Editor Token: ${editorToken.substring(0, 20)}...`);
  console.log(`  Viewer Token: ${viewerToken.substring(0, 20)}...`);
  console.log(`  Org ID: ${ORG_ID}`);
  console.log(`  User ID: ${TEST_USER_ID}`);

  // Test 1: GET /scheduled (all roles can view)
  console.log('\n\n--- TEST 1: Get Scheduled Rotations ---');
  await testEndpoint('GET', '/scheduled?limit=10&offset=0', adminToken, null, 'Admin viewing scheduled rotations');
  await testEndpoint('GET', '/scheduled?limit=10&offset=0', editorToken, null, 'Editor viewing scheduled rotations');
  await testEndpoint('GET', '/scheduled?limit=10&offset=0', viewerToken, null, 'Viewer viewing scheduled rotations');

  // Using a test secret ID
  const TEST_SECRET_ID = '00000000-0000-0000-0000-000000000100';

  // Test 2: GET /:secretId/policy (all roles can view)
  console.log('\n\n--- TEST 2: Get Rotation Policy ---');
  await testEndpoint('GET', `/${TEST_SECRET_ID}/policy`, adminToken, null, 'Admin viewing rotation policy');
  await testEndpoint('GET', `/${TEST_SECRET_ID}/policy`, viewerToken, null, 'Viewer viewing rotation policy');

  // Test 3: POST /:secretId/policy (admin/editor only)
  console.log('\n\n--- TEST 3: Update Rotation Policy ---');
  const policyUpdate = {
    enabled: true,
    rotation_frequency: 'monthly',
    rotation_interval_days: 30,
    auto_rotate: true,
  };
  await testEndpoint('POST', `/${TEST_SECRET_ID}/policy`, adminToken, policyUpdate, 'Admin updating rotation policy');
  await testEndpoint('POST', `/${TEST_SECRET_ID}/policy`, editorToken, policyUpdate, 'Editor updating rotation policy');
  await testEndpoint('POST', `/${TEST_SECRET_ID}/policy`, viewerToken, policyUpdate, 'Viewer attempting to update (should fail)');

  // Test 4: GET /:secretId/preview (all roles can view)
  console.log('\n\n--- TEST 4: Preview Rotation ---');
  await testEndpoint('GET', `/${TEST_SECRET_ID}/preview`, adminToken, null, 'Admin previewing rotation');
  await testEndpoint('GET', `/${TEST_SECRET_ID}/preview`, viewerToken, null, 'Viewer previewing rotation');

  // Test 5: POST /:secretId/rotate (admin/editor only)
  console.log('\n\n--- TEST 5: Trigger Immediate Rotation ---');
  await testEndpoint('POST', `/${TEST_SECRET_ID}/rotate`, adminToken, {}, 'Admin triggering rotation');
  await testEndpoint('POST', `/${TEST_SECRET_ID}/rotate`, editorToken, {}, 'Editor triggering rotation');
  await testEndpoint('POST', `/${TEST_SECRET_ID}/rotate`, viewerToken, {}, 'Viewer attempting rotation (should fail)');

  // Test 6: GET /:secretId/history (all roles can view)
  console.log('\n\n--- TEST 6: Get Rotation History ---');
  await testEndpoint('GET', `/${TEST_SECRET_ID}/history?limit=50&offset=0`, adminToken, null, 'Admin viewing rotation history');
  await testEndpoint('GET', `/${TEST_SECRET_ID}/history?limit=50&offset=0`, viewerToken, null, 'Viewer viewing rotation history');

  // Test 7: DELETE /:secretId/schedule/:scheduleId (admin/editor only)
  console.log('\n\n--- TEST 7: Cancel Scheduled Rotation ---');
  const TEST_SCHEDULE_ID = '00000000-0000-0000-0000-000000000200';
  await testEndpoint('DELETE', `/${TEST_SECRET_ID}/schedule/${TEST_SCHEDULE_ID}`, adminToken, {}, 'Admin cancelling scheduled rotation');
  await testEndpoint('DELETE', `/${TEST_SECRET_ID}/schedule/${TEST_SCHEDULE_ID}`, editorToken, {}, 'Editor cancelling scheduled rotation');
  await testEndpoint('DELETE', `/${TEST_SECRET_ID}/schedule/${TEST_SCHEDULE_ID}`, viewerToken, {}, 'Viewer attempting cancel (should fail)');

  console.log('\n\n========================================');
  console.log('Test Suite Complete');
  console.log('========================================\n');
}

runTests().catch(console.error);
