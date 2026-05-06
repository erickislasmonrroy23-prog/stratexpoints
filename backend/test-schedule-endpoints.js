/**
 * Test FASE 7 Schedule Management Endpoints
 * Tests all schedule API endpoints with JWT authentication
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:3001/api/keys';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ORG_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_ID = '70b81ede-bc05-4bf1-b6b1-6e6bd0e1cb2b';
const TEST_SECRET_ID = 'test-secret-550e8400-e29b-41d4-a716-446655440000';

// Generate JWT tokens for testing
function generateToken(userId = TEST_USER_ID, orgId = ORG_ID, role = 'admin') {
  return jwt.sign(
    {
      userId,
      organizationId: orgId,
      role,
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Get future timestamp for scheduling
function getFutureTimestamp(daysFromNow = 5, hoursOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(date.getHours() + hoursOffset);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date.toISOString();
}

async function testEndpoints() {
  const adminToken = generateToken(TEST_USER_ID, ORG_ID, 'admin');
  const editorToken = generateToken('editor-user-id', ORG_ID, 'editor');
  const viewerToken = generateToken('viewer-user-id', ORG_ID, 'viewer');

  const results = [];
  let testScheduleId = null;

  // Test 1: POST /api/keys/:secretId/schedule - Schedule a rotation
  console.log('\n🧪 Test 1: POST /api/keys/:secretId/schedule - Schedule rotation');
  try {
    const scheduledFor = getFutureTimestamp(5);
    const response = await axios.post(
      `${BASE_URL}/${TEST_SECRET_ID}/schedule`,
      { scheduledFor },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    results.push({ test: 'POST /api/keys/:secretId/schedule', status: '✓ PASS', code: response.status });
    console.log('✓ PASS - Status 200, Rotation scheduled');
    console.log(`  Scheduled for: ${response.data.data.scheduled_for}`);
    console.log(`  Schedule status: ${response.data.data.status}`);

    // Save schedule ID for later tests
    if (response.data.data.id) {
      testScheduleId = response.data.data.id;
      console.log(`  Schedule ID: ${testScheduleId}`);
    }
  } catch (err) {
    results.push({ test: 'POST /api/keys/:secretId/schedule', status: '✗ FAIL', error: err.response?.status });
    console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
  }

  // Test 2: GET /api/keys/:secretId/schedules - Get all schedules for secret
  console.log('\n🧪 Test 2: GET /api/keys/:secretId/schedules - List schedules');
  try {
    const response = await axios.get(
      `${BASE_URL}/${TEST_SECRET_ID}/schedules`,
      { headers: { Authorization: `Bearer ${viewerToken}` } }
    );
    results.push({ test: 'GET /api/keys/:secretId/schedules', status: '✓ PASS', code: response.status });
    console.log('✓ PASS - Status 200, Retrieved schedules');
    console.log(`  Total schedules: ${response.data.pagination.total}`);
    if (response.data.data.length > 0) {
      console.log(`  First schedule status: ${response.data.data[0].status}`);
    }
  } catch (err) {
    results.push({ test: 'GET /api/keys/:secretId/schedules', status: '✗ FAIL', error: err.response?.status });
    console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
  }

  // Test 3: GET /api/keys/:secretId/schedule/:scheduleId - Get specific schedule
  if (testScheduleId) {
    console.log(`\n🧪 Test 3: GET /api/keys/:secretId/schedule/:scheduleId - Get schedule details`);
    try {
      const response = await axios.get(
        `${BASE_URL}/${TEST_SECRET_ID}/schedule/${testScheduleId}`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );
      results.push({ test: 'GET /api/keys/:secretId/schedule/:scheduleId', status: '✓ PASS', code: response.status });
      console.log('✓ PASS - Status 200, Retrieved schedule');
      console.log(`  Status: ${response.data.data.status}`);
      console.log(`  Scheduled for: ${response.data.data.scheduled_for}`);
    } catch (err) {
      results.push({ test: 'GET /api/keys/:secretId/schedule/:scheduleId', status: '✗ FAIL', error: err.response?.status });
      console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
    }

    // Test 4: PUT /api/keys/:secretId/schedule/:scheduleId - Update schedule
    console.log(`\n🧪 Test 4: PUT /api/keys/:secretId/schedule/:scheduleId - Update schedule`);
    try {
      const newScheduledFor = getFutureTimestamp(7);
      const response = await axios.put(
        `${BASE_URL}/${TEST_SECRET_ID}/schedule/${testScheduleId}`,
        { scheduledFor: newScheduledFor },
        { headers: { Authorization: `Bearer ${editorToken}` } }
      );
      results.push({ test: 'PUT /api/keys/:secretId/schedule/:scheduleId', status: '✓ PASS', code: response.status });
      console.log('✓ PASS - Status 200, Schedule updated');
      console.log(`  New scheduled time: ${response.data.data.scheduled_for}`);
    } catch (err) {
      results.push({ test: 'PUT /api/keys/:secretId/schedule/:scheduleId', status: '✗ FAIL', error: err.response?.status });
      console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
    }

    // Test 5: DELETE /api/keys/:secretId/schedule/:scheduleId - Cancel schedule
    console.log(`\n🧪 Test 5: DELETE /api/keys/:secretId/schedule/:scheduleId - Cancel schedule`);
    try {
      const response = await axios.delete(
        `${BASE_URL}/${TEST_SECRET_ID}/schedule/${testScheduleId}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      results.push({ test: 'DELETE /api/keys/:secretId/schedule/:scheduleId', status: '✓ PASS', code: response.status });
      console.log('✓ PASS - Status 200, Schedule cancelled');
      console.log(`  Schedule status: ${response.data.data.status}`);
    } catch (err) {
      results.push({ test: 'DELETE /api/keys/:secretId/schedule/:scheduleId', status: '✗ FAIL', error: err.response?.status });
      console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
    }
  }

  // Test 6: RBAC - Viewer cannot create schedules
  console.log(`\n🧪 Test 6: RBAC - Viewer cannot create schedules`);
  try {
    const scheduledFor = getFutureTimestamp(5);
    const response = await axios.post(
      `${BASE_URL}/${TEST_SECRET_ID}/schedule`,
      { scheduledFor },
      { headers: { Authorization: `Bearer ${viewerToken}` } }
    );
    results.push({ test: 'POST /api/keys/:secretId/schedule (viewer)', status: '✗ FAIL', code: response.status });
    console.log('✗ FAIL - Viewer was allowed to create schedule (should be denied)');
  } catch (err) {
    if (err.response?.status === 403) {
      results.push({ test: 'POST /api/keys/:secretId/schedule (viewer)', status: '✓ PASS', code: 403 });
      console.log('✓ PASS - Status 403, Viewer correctly denied');
    } else {
      results.push({ test: 'POST /api/keys/:secretId/schedule (viewer)', status: '✗ FAIL', error: err.response?.status });
      console.log(`✗ FAIL - Unexpected status ${err.response?.status}`);
    }
  }

  // Test 7: RBAC - Viewer cannot update schedules
  if (testScheduleId) {
    console.log(`\n🧪 Test 7: RBAC - Viewer cannot update schedules`);
    try {
      const newScheduledFor = getFutureTimestamp(6);
      const response = await axios.put(
        `${BASE_URL}/${TEST_SECRET_ID}/schedule/${testScheduleId}`,
        { scheduledFor: newScheduledFor },
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );
      results.push({ test: 'PUT /api/keys/:secretId/schedule/:scheduleId (viewer)', status: '✗ FAIL', code: response.status });
      console.log('✗ FAIL - Viewer was allowed to update schedule (should be denied)');
    } catch (err) {
      if (err.response?.status === 403) {
        results.push({ test: 'PUT /api/keys/:secretId/schedule/:scheduleId (viewer)', status: '✓ PASS', code: 403 });
        console.log('✓ PASS - Status 403, Viewer correctly denied');
      } else {
        results.push({ test: 'PUT /api/keys/:secretId/schedule/:scheduleId (viewer)', status: '✗ FAIL', error: err.response?.status });
        console.log(`✗ FAIL - Unexpected status ${err.response?.status}`);
      }
    }

    // Test 8: RBAC - Viewer cannot cancel schedules
    console.log(`\n🧪 Test 8: RBAC - Viewer cannot cancel schedules`);
    try {
      const response = await axios.delete(
        `${BASE_URL}/${TEST_SECRET_ID}/schedule/${testScheduleId}`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );
      results.push({ test: 'DELETE /api/keys/:secretId/schedule/:scheduleId (viewer)', status: '✗ FAIL', code: response.status });
      console.log('✗ FAIL - Viewer was allowed to cancel schedule (should be denied)');
    } catch (err) {
      if (err.response?.status === 403) {
        results.push({ test: 'DELETE /api/keys/:secretId/schedule/:scheduleId (viewer)', status: '✓ PASS', code: 403 });
        console.log('✓ PASS - Status 403, Viewer correctly denied');
      } else {
        results.push({ test: 'DELETE /api/keys/:secretId/schedule/:scheduleId (viewer)', status: '✗ FAIL', error: err.response?.status });
        console.log(`✗ FAIL - Unexpected status ${err.response?.status}`);
      }
    }
  }

  // Test 9: Validate future date requirement
  console.log(`\n🧪 Test 9: Validate - scheduledFor must be in future`);
  try {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const response = await axios.post(
      `${BASE_URL}/${TEST_SECRET_ID}/schedule`,
      { scheduledFor: pastDate.toISOString() },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    results.push({ test: 'POST /api/keys/:secretId/schedule (past date)', status: '✗ FAIL', code: response.status });
    console.log('✗ FAIL - Past date was accepted (should be rejected)');
  } catch (err) {
    if (err.response?.status === 422 || err.response?.status === 400) {
      results.push({ test: 'POST /api/keys/:secretId/schedule (past date)', status: '✓ PASS', code: err.response?.status });
      console.log(`✓ PASS - Status ${err.response?.status}, Past date correctly rejected`);
    } else {
      results.push({ test: 'POST /api/keys/:secretId/schedule (past date)', status: '✗ FAIL', error: err.response?.status });
      console.log(`✗ FAIL - Unexpected status ${err.response?.status}`);
    }
  }

  // Test 10: Validate missing required field
  console.log(`\n🧪 Test 10: Validate - scheduledFor is required`);
  try {
    const response = await axios.post(
      `${BASE_URL}/${TEST_SECRET_ID}/schedule`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    results.push({ test: 'POST /api/keys/:secretId/schedule (missing field)', status: '✗ FAIL', code: response.status });
    console.log('✗ FAIL - Missing scheduledFor was accepted (should be rejected)');
  } catch (err) {
    if (err.response?.status === 400) {
      results.push({ test: 'POST /api/keys/:secretId/schedule (missing field)', status: '✓ PASS', code: 400 });
      console.log('✓ PASS - Status 400, Missing field correctly rejected');
    } else {
      results.push({ test: 'POST /api/keys/:secretId/schedule (missing field)', status: '✗ FAIL', error: err.response?.status });
      console.log(`✗ FAIL - Unexpected status ${err.response?.status}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  results.forEach((r) => {
    const emoji = r.status.includes('PASS') ? '✓' : r.status.includes('SKIPPED') ? '⚠' : '✗';
    console.log(`${emoji} ${r.test}: ${r.status}`);
  });

  const passed = results.filter((r) => r.status.includes('PASS')).length;
  const skipped = results.filter((r) => r.status.includes('SKIPPED')).length;
  const total = results.length;
  console.log(`\nTotal: ${passed}/${total} tests passed (${skipped} skipped)`);

  if (passed === total - skipped) {
    console.log('\n🎉 ALL TESTS PASSED! FASE 7 schedule endpoints are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run tests
testEndpoints().catch(console.error);
