/**
 * Test Setup & Fixtures for PHASE 3.6 Integration Tests
 * Centralized test data and utilities imported by all test sections
 */

/**
 * Test users with different roles and memberships
 */
export const testUsers = {
  admin1: {
    id: 'user-admin-1',
    email: 'admin1@test.example.com',
    name: 'Admin User 1',
    role: 'admin',
  },
  admin2: {
    id: 'user-admin-2',
    email: 'admin2@test.example.com',
    name: 'Admin User 2',
    role: 'admin',
  },
  member1: {
    id: 'user-member-1',
    email: 'member1@test.example.com',
    name: 'Member User 1',
    role: 'member',
  },
  member2: {
    id: 'user-member-2',
    email: 'member2@test.example.com',
    name: 'Member User 2',
    role: 'member',
  },
  superAdmin: {
    id: 'user-super-admin',
    email: 'superadmin@test.example.com',
    name: 'Super Admin',
    role: 'super_admin',
  },
};

/**
 * Test organizations for multi-tenant isolation
 */
export const testOrganizations = {
  org1: {
    id: 'org-1',
    name: 'Organization 1',
    slug: 'org-1',
    tier: 'free',
    created_at: new Date().toISOString(),
  },
  org2: {
    id: 'org-2',
    name: 'Organization 2',
    slug: 'org-2',
    tier: 'enterprise',
    created_at: new Date().toISOString(),
  },
  org3: {
    id: 'org-3',
    name: 'Organization 3',
    slug: 'org-3',
    tier: 'free',
    created_at: new Date().toISOString(),
  },
};

/**
 * Generate a JWT token for testing
 * Uses HS256 algorithm with test secret
 */
export const generateTestToken = (userId, email, organizationId = null) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    email: email,
    iat: now,
    exp: now + 3600, // 1 hour expiry
    aud: 'authenticated',
    iss: 'supabase',
  };

  if (organizationId) {
    payload.org_id = organizationId;
  }

  // Mock JWT token (in production would use actual signing)
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = Buffer.from('mock-signature').toString('base64');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

/**
 * Create a test context with auth headers
 */
export const createTestContext = (user, organization = null) => {
  return {
    user: {
      ...user,
      organization_id: organization?.id,
    },
    organization: {
      ...organization,
      created_at: organization?.created_at || new Date().toISOString(),
    },
    token: generateTestToken(user.id, user.email, organization?.id),
    headers: generateHeaders(generateTestToken(user.id, user.email, organization?.id)),
  };
};

/**
 * Generate HTTP headers for authenticated requests
 */
export const generateHeaders = (token) => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'StratexPoints-Test/1.0',
  };
};

/**
 * Test data for OKRs
 */
export const testOKRs = {
  okr1: {
    id: 'okr-1',
    title: 'Increase market share',
    description: 'Grow market presence in Q2 2026',
    status: 'active',
  },
  okr2: {
    id: 'okr-2',
    title: 'Improve customer satisfaction',
    description: 'Raise NPS score to 70+',
    status: 'draft',
  },
};

/**
 * Test data for KPIs
 */
export const testKPIs = {
  kpi1: {
    id: 'kpi-1',
    name: 'Revenue Growth',
    value: 25000,
    unit: 'USD',
  },
  kpi2: {
    id: 'kpi-2',
    name: 'Customer Count',
    value: 150,
    unit: 'count',
  },
};

/**
 * Expected HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  FOUND: 302,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * Sleep utility for async tests
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
  testUsers,
  testOrganizations,
  testOKRs,
  testKPIs,
  generateTestToken,
  createTestContext,
  generateHeaders,
  HTTP_STATUS,
  sleep,
};
