/**
 * Test FASE 7 Key Rotation Endpoints
 * Tests all rotation API endpoints with JWT authentication
 */

import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:3001/api/keys';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ORG_ID = '00000000-0000-0000-0000-000000000001';
const TEST_SECRET_ID = '06ce3f85-16da-496d-abb4-971a0eb01938';
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
  const adminToken = generateToken('70b81ede-bc05-4bf1-b6b1-6e6bd0e1cb2b', ORG_ID, 'admin');
  const editorToken = generateToken('editor-user-id', ORG_ID, 'editor');
  const viewerToken = generateToken('viewer-user-id', ORG_ID, 'viewer');

  const results = [];

  // Test 1: GET /scheduled (viewer should have access)
  console.log('\n🧪 Test 1: GET /scheduled - View scheduled rotations');
  try {
    const response = await axios.get(`${BASE_URL}/scheduled`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    results.push({ test: 'GET /scheduled', status: '✓ PASS', code: response.status });
    console.log('✓ PASS - Status 200, Retrieved scheduled rotations');
  } catch (err) {
    results.push({ test: 'GET /scheduled', status: '✗ FAIL', error: err.response?.status });
    console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
  }

  // Test 2: GET /:secretId/policy (viewer should have access)
  console.log('\n🧪 Test 2: GET /:secretId/policy - Get rotation policy');
  try {
    const response = await axios.get(`${BASE_URL}/${TEST_SECRET_ID}/policy`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    results.push({ test: 'GET /:secretId/policy', status: '✓ PASS', code: response.status });
    console.log('✓ PASS - Status 200, Retrieved rotation policy');
    console.log(`  Policy: ${JSON.stringify(response.data.data, null, 2)}`);
  } catch (err) {
    results.push({ test: 'GET /:secretId/policy', status: '✗ FAIL', error: err.response?.status });
    console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
  }

  // Test 3: POST /:secretId/policy (viewer should be denied, admin should succeed)
  console.log('\n🧪 Test 3: POST /:secretId/policy - RBAC enforcement (viewer denied)');
  try {
    const response = await axios.post(`${BASE_URL}/${TEST_SECRET_ID}/policy`, { enabled: true }, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    results.push({ test: 'POST /:secretId/policy (viewer)', status: '✗ FAIL', code: response.status });
    console.log('✗ FAIL - Viewer was allowed to update policy (should be denied)');
  } catch (err) {
    if (err.response?.status === 403) {
      results.push({ test: 'POST /:secretId/policy (viewer)', status: '✓ PASS', code: 403 });
      console.log('✓ PASS - Status 403, Viewer correctly denied');
    } else {
      results.push({ test: 'POST /:secretId/policy (viewer)', status: '✗ FAIL', error: err.response?.status });
      console.log(`✗ FAIL - Unexpected status ${err.response?.status}`);
    }
  }

  // Test 4: POST /:secretId/policy (admin should succeed)
  console.log('\n🧪 Test 4: POST /:secretId/policy - Update with admin role');
  try {
    const response = await axios.post(
      `${BASE_URL}/${TEST_SECRET_ID}/policy`,
      { enabled: true, rotation_interval_days: 30 },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    results.push({ test: 'POST /:secretId/policy (admin)', status: '✓ PASS', code: response.status });
    console.log('✓ PASS - Status 200, Policy updated successfully');
  } catch (err) {
    results.push({ test: 'POST /:secretId/policy (admin)', status: '✗ FAIL', error: err.response?.status });
    console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
  }

  // Test 5: GET /:secretId/preview (viewer should have access)
  console.log('\n🧪 Test 5: GET /:secretId/preview - Preview rotation');
  try {
    const response = await axios.get(`${BASE_URL}/${TEST_SECRET_ID}/preview`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    results.push({ test: 'GET /:secretId/preview', status: '✓ PASS', code: response.status });
    console.log('✓ PASS - Status 200, Retrieved rotation preview');
    console.log(`  Preview: ${JSON.stringify(response.data.data, null, 2)}`);
  } catch (err) {
    results.push({ test: 'GET /:secretId/preview', status: '✗ FAIL', error: err.response?.status });
    console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
  }

  // Test 6: POST /:secretId/rotate (admin should succeed, trigger rotation)
  console.log('\n🧪 Test 6: POST /:secretId/rotate - Trigger immediate rotation');
  try {
    const response = await axios.post(
      `${BASE_URL}/${TEST_SECRET_ID}/rotate`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    results.push({ test: 'POST /:secretId/rotate', status: '✓ PASS', code: response.status });
    console.log('✓ PASS - Status 200, Key rotation completed');
    console.log(`  Result: ${JSON.stringify(response.data.data, null, 2)}`);
  } catch (err) {
    results.push({ test: 'POST /:secretId/rotate', status: '✗ FAIL', error: err.response?.status });
    console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
  }

  // Test 7: GET /:secretId/history (viewer should have access)
  console.log('\n🧪 Test 7: GET /:secretId/history - Get rotation history');
  try {
    const response = await axios.get(`${BASE_URL}/${TEST_SECRET_ID}/history`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    results.push({ test: 'GET /:secretId/history', status: '✓ PASS', code: response.status });
    console.log('✓ PASS - Status 200, Retrieved rotation history');
    console.log(`  History entries: ${response.data.data.length}`);
    if (response.data.data.length > 0) {
      console.log(`  Latest: ${JSON.stringify(response.data.data[0], null, 2)}`);
    }
  } catch (err) {
    results.push({ test: 'GET /:secretId/history', status: '✗ FAIL', error: err.response?.status });
    console.log(`✗ FAIL - Status ${err.response?.status}, Error: ${err.response?.data?.error}`);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  results.forEach((r) => {
    const emoji = r.status.includes('PASS') ? '✓' : '✗';
    console.log(`${emoji} ${r.test}: ${r.status}`);
  });

  const passed = results.filter((r) => r.status.includes('PASS')).length;
  const total = results.length;
  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED! FASE 7 rotation endpoints are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run tests
testEndpoints().catch(console.error);
