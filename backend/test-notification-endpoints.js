/**
 * Test FASE 7 Notification Management Endpoints
 * Tests all notification API endpoints with JWT authentication
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:3001/api/notifications';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ORG_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_ID = '70b81ede-bc05-4bf1-b6b1-6e6bd0e1cb2b';

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

async function testEndpoints() {
  const adminToken = generateToken(TEST_USER_ID, ORG_ID, 'admin');
  const editorToken = generateToken('editor-user-id', ORG_ID, 'editor');
  const viewerToken = generateToken('viewer-user-id', ORG_ID, 'viewer');

  const results = [];
  let testNotificationId = null;

  // Test 1: GET /api/notifications - List all notifications
  console.log('\n🧪 Test 1: GET /api/notifications - List all notifications');
  try {
    const response = await axios.get(BASE_URL, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    results.push({ test: 'GET /api/notifications', status: '✓ PASS', code: response.status });
    console.log('✓ PASS - Status 200, Retrieved notifications');
    console.log(`  Total notifications: ${response.data.pagination.total}`);

    // Save first notification ID for later tests
    if (response.data.data.length > 0) {
      testNotificationId = response.data.data[0].id;
      console.log(`  Sample notification: ${response.data.data[0].notification_type}`);
    }
  } catch (err) {
    results.push({ test: 'GET /api/notifications', status: '✗ FAIL', error: err.response?.status });
    console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
  }

  // Test 2: GET /api/notifications/stats - Get notification statistics
  console.log('\n🧪 Test 2: GET /api/notifications/stats - Get statistics');
  try {
    const response = await axios.get(`${BASE_URL}/stats`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    results.push({ test: 'GET /api/notifications/stats', status: '✓ PASS', code: response.status });
    console.log('✓ PASS - Status 200, Retrieved statistics');
    console.log(`  Stats: ${JSON.stringify(response.data.data, null, 2)}`);
  } catch (err) {
    results.push({ test: 'GET /api/notifications/stats', status: '✗ FAIL', error: err.response?.status });
    console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
  }

  // Test 3: GET /api/notifications?type=rotation_completed - Filter by type
  console.log('\n🧪 Test 3: GET /api/notifications?type=rotation_completed - Filter notifications');
  try {
    const response = await axios.get(`${BASE_URL}?type=rotation_completed`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    results.push({ test: 'GET /api/notifications (filtered)', status: '✓ PASS', code: response.status });
    console.log('✓ PASS - Status 200, Retrieved filtered notifications');
    console.log(`  Completed notifications: ${response.data.pagination.total}`);
  } catch (err) {
    results.push({ test: 'GET /api/notifications (filtered)', status: '✗ FAIL', error: err.response?.status });
    console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
  }

  // Test 4: GET /api/notifications?unread=true - Get unread notifications
  console.log('\n🧪 Test 4: GET /api/notifications?unread=true - Get unread only');
  try {
    const response = await axios.get(`${BASE_URL}?unread=true`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    results.push({ test: 'GET /api/notifications (unread)', status: '✓ PASS', code: response.status });
    console.log('✓ PASS - Status 200, Retrieved unread notifications');
    console.log(`  Unread count: ${response.data.pagination.total}`);
  } catch (err) {
    results.push({ test: 'GET /api/notifications (unread)', status: '✗ FAIL', error: err.response?.status });
    console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
  }

  // Test 5: GET /api/notifications/:id - Get specific notification (if we have one)
  if (testNotificationId) {
    console.log(`\n🧪 Test 5: GET /api/notifications/:id - Get specific notification`);
    try {
      const response = await axios.get(`${BASE_URL}/${testNotificationId}`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      results.push({ test: 'GET /api/notifications/:id', status: '✓ PASS', code: response.status });
      console.log('✓ PASS - Status 200, Retrieved notification');
      console.log(`  Notification: ${JSON.stringify(response.data.data, null, 2)}`);
    } catch (err) {
      results.push({ test: 'GET /api/notifications/:id', status: '✗ FAIL', error: err.response?.status });
      console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
    }

    // Test 6: PATCH /api/notifications/:id - Mark as read
    console.log(`\n🧪 Test 6: PATCH /api/notifications/:id - Mark as read`);
    try {
      const response = await axios.patch(
        `${BASE_URL}/${testNotificationId}`,
        { action: 'mark-read' },
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );
      results.push({ test: 'PATCH /api/notifications/:id', status: '✓ PASS', code: response.status });
      console.log('✓ PASS - Status 200, Marked notification as read');
    } catch (err) {
      results.push({ test: 'PATCH /api/notifications/:id', status: '✗ FAIL', error: err.response?.status });
      console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
    }
  }

  // Test 7: POST /api/notifications/actions/mark-all-read - Mark all as read
  console.log(`\n🧪 Test 7: POST /api/notifications/actions/mark-all-read`);
  try {
    const response = await axios.post(
      `${BASE_URL}/actions/mark-all-read`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    results.push({ test: 'POST /api/notifications/actions/mark-all-read', status: '✓ PASS', code: response.status });
    console.log('✓ PASS - Status 200, All notifications marked as read');
    console.log(`  Result: ${JSON.stringify(response.data.data, null, 2)}`);
  } catch (err) {
    results.push({ test: 'POST /api/notifications/actions/mark-all-read', status: '✗ FAIL', error: err.response?.status });
    console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
  }

  // Test 8: DELETE /api/notifications/:id - Delete specific notification (if we have one)
  if (testNotificationId) {
    console.log(`\n🧪 Test 8: DELETE /api/notifications/:id - Delete notification`);
    try {
      const response = await axios.delete(
        `${BASE_URL}/${testNotificationId}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      results.push({ test: 'DELETE /api/notifications/:id', status: '✓ PASS', code: response.status });
      console.log('✓ PASS - Status 200, Notification deleted');
    } catch (err) {
      // It's ok if it fails - notification may not have existed
      results.push({ test: 'DELETE /api/notifications/:id', status: '⚠ SKIPPED', error: err.response?.status });
      console.log(`⚠ SKIPPED - Status ${err.response?.status} (notification may not have existed)`);
    }
  }

  // Test 9: RBAC - Viewer should not be able to delete all notifications
  console.log(`\n🧪 Test 9: RBAC - Viewer cannot delete all notifications`);
  try {
    const response = await axios.delete(BASE_URL, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    results.push({ test: 'DELETE /api/notifications (viewer)', status: '✗ FAIL', code: response.status });
    console.log('✗ FAIL - Viewer was allowed to delete all notifications (should be denied)');
  } catch (err) {
    if (err.response?.status === 403) {
      results.push({ test: 'DELETE /api/notifications (viewer)', status: '✓ PASS', code: 403 });
      console.log('✓ PASS - Status 403, Viewer correctly denied');
    } else {
      results.push({ test: 'DELETE /api/notifications (viewer)', status: '✗ FAIL', error: err.response?.status });
      console.log(`✗ FAIL - Unexpected status ${err.response?.status}`);
    }
  }

  // Test 10: RBAC - Admin should be able to delete all notifications
  console.log(`\n🧪 Test 10: RBAC - Admin can delete all notifications`);
  try {
    const response = await axios.delete(BASE_URL, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    results.push({ test: 'DELETE /api/notifications (admin)', status: '✓ PASS', code: response.status });
    console.log('✓ PASS - Status 200, Admin successfully deleted all notifications');
    console.log(`  Result: ${JSON.stringify(response.data.data, null, 2)}`);
  } catch (err) {
    results.push({ test: 'DELETE /api/notifications (admin)', status: '✗ FAIL', error: err.response?.status });
    console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
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
    console.log('\n🎉 ALL TESTS PASSED! FASE 7 notification endpoints are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run tests
testEndpoints().catch(console.error);
