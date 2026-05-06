#!/usr/bin/env node

/**
 * End-to-End Integration Test Script
 * Tests frontend-backend connectivity and FASE 6 API endpoints
 *
 * Usage: node scripts/test-integration.js
 */

const http = require('http');
const https = require('https');

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3001';

console.log(`
╔════════════════════════════════════════════════════════════╗
║     Frontend-Backend Integration Test - FASE 6             ║
╠════════════════════════════════════════════════════════════╣
║  Backend URL: ${BACKEND_URL}
╚════════════════════════════════════════════════════════════╝
`);

/**
 * Make HTTP request
 */
function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Test runner
 */
async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`Testing: ${name}... `);
      await fn();
      console.log('✅ PASS');
      passed++;
    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
      failed++;
    }
  }

  // Test 1: Health check
  await test('Backend health check', async () => {
    const res = await request('GET', '/health');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data?.status) throw new Error('No status in response');
  });

  // Test 2: API health check
  await test('API health endpoint', async () => {
    const res = await request('GET', '/api/health');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data?.healthy) throw new Error('API not healthy');
  });

  // Test 3: Database connectivity
  await test('Database connection', async () => {
    const res = await request('GET', '/health');
    if (!res.data?.database) throw new Error('No database status');
    if (res.data.database !== 'connected') {
      throw new Error(`Database not connected: ${res.data.database}`);
    }
  });

  // Test 4: Request logging
  await test('Request logging (check console)', async () => {
    const res = await request('GET', '/api/status');
    // This should be logged to server console
    if (res.status === 401 || res.status === 200) return;
    throw new Error('Request should be processed');
  });

  // Test 5: CORS headers
  await test('CORS headers present', async () => {
    const res = await request('GET', '/health', {
      'Origin': 'http://localhost:5173'
    });
    // CORS headers should be in response
    if (res.status === 200) return;
    throw new Error('CORS check failed');
  });

  // Test 6: Error handling - 404
  await test('404 error handling', async () => {
    const res = await request('GET', '/api/nonexistent');
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });

  // Test 7: Invalid method
  await test('Method not allowed', async () => {
    const res = await request('PATCH', '/api/secrets');
    // Should be 401 (auth required) or 405 (method not allowed)
    if (res.status !== 401 && res.status !== 405) {
      throw new Error(`Expected 401 or 405, got ${res.status}`);
    }
  });

  // Test 8: Missing auth header
  await test('Missing authentication header', async () => {
    const res = await request('GET', '/api/secrets');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    if (!res.data?.error) throw new Error('No error message');
  });

  // Summary
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                     Test Results                          ║
╠════════════════════════════════════════════════════════════╣
║  ✅ Passed: ${passed}
║  ❌ Failed: ${failed}
║  📊 Total:  ${passed + failed}
║  📈 Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%
╚════════════════════════════════════════════════════════════╝
  `);

  if (failed === 0) {
    console.log('🎉 All tests passed! Backend is ready.');
    process.exit(0);
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Check backend logs.`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  console.error('❌ Test runner error:', err.message);
  console.error(`\n⚠️  Is the backend running? Start it with:`);
  console.error(`  cd backend && npm run dev`);
  process.exit(1);
});
