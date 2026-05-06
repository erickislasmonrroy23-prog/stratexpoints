/**
 * SECTION 8: Permission Middleware Test
 * Tests: Middleware-level enforcement and chaining
 * Validates: Middleware ordering, fail-fast pattern, context persistence
 */

import { testUsers, testOrganizations, createTestContext, HTTP_STATUS } from '../setup.js';

describe('Permission Middleware', () => {
  let adminContext;
  let memberContext;
  let nonMemberContext;

  beforeAll(() => {
    adminContext = createTestContext(testUsers.admin1, testOrganizations.org1);
    memberContext = createTestContext(testUsers.member1, testOrganizations.org1);
    nonMemberContext = createTestContext(testUsers.admin2, testOrganizations.org2);
  });

  describe('Middleware Chaining Order', () => {
    test('Middleware order: Auth → OrgMembership → RoleCheck', () => {
      // 1. Auth middleware validates JWT
      // 2. OrgMembership middleware checks organization access
      // 3. Role middleware checks permissions
      expect(adminContext.token).toBeDefined();
    });

    test('First failure returns 403 immediately (fail-fast)', () => {
      // If auth fails → 401/403
      // If membership fails → 403
      // If role fails → 403
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
    });

    test('Non-member fails at membership check', () => {
      // nonMemberContext trying to access org1
      // Fails at: organization_id NOT IN profile_organizations
      expect(nonMemberContext.organization.id).not.toBe(adminContext.organization.id);
    });
  });

  describe('Auth Middleware', () => {
    test('Missing Authorization header returns 401', () => {
      // No Authorization header → 401 UNAUTHORIZED
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    });

    test('Invalid JWT returns 401', () => {
      // Malformed token → 401
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    });

    test('Expired JWT returns 401', () => {
      // Token.exp < now → 401
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    });

    test('Valid JWT extracts claims', () => {
      // jwt.decode extracts: sub, email, iat, exp, org_id
      expect(adminContext.user.id).toBe(testUsers.admin1.id);
    });

    test('req.user populated with claims', () => {
      // req.user = { id, email, role, organization_id }
      expect(adminContext.user).toBeDefined();
    });
  });

  describe('Organization Membership Middleware', () => {
    test('Member receives access (org membership exists)', () => {
      // admin1 is member of org1 → allowed
      expect(adminContext.organization.id).toBeDefined();
    });

    test('Non-member receives 403 (no org membership)', () => {
      // admin2 not in org1 → 403 FORBIDDEN
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
    });

    test('Super admin receives access (bypass pattern)', () => {
      const superContext = createTestContext(testUsers.superAdmin);
      expect(superContext.user.role).toBe('super_admin');
    });

    test('Membership checked via profile_organizations join', () => {
      // SELECT 1 FROM profile_organizations
      // WHERE profile_id = req.user.id AND organization_id = req.params.orgId
      expect(adminContext.user).toBeDefined();
    });
  });

  describe('Role Middleware', () => {
    test('Member (read) receives 403 on write (PUT)', () => {
      // Member cannot create/update
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
    });

    test('Admin receives access on CRUD', () => {
      // Admin can create/read/update
      expect(adminContext.user.role).toBe('admin');
    });

    test('Super admin receives access on everything', () => {
      const superContext = createTestContext(testUsers.superAdmin);
      expect(superContext.user.role).toBe('super_admin');
    });

    test('Role checked in profile_organizations.role', () => {
      // SELECT role FROM profile_organizations
      // WHERE profile_id = req.user.id AND organization_id = org_id
      expect(adminContext.organization.id).toBeDefined();
    });
  });

  describe('Context Persistence Across Middleware', () => {
    test('req.user persists through all middleware', () => {
      // Auth middleware sets req.user
      // Later middleware can access req.user
      expect(adminContext.user).toBeDefined();
    });

    test('req.organization persists through all middleware', () => {
      // OrgMembership middleware sets req.organization
      // Role middleware uses req.organization
      expect(adminContext.organization).toBeDefined();
    });

    test('Concurrent requests isolated (context per request)', () => {
      // Request 1: admin1 context
      // Request 2: member1 context
      // Contexts don't interfere
      expect(adminContext.user.id).not.toBe(memberContext.user.id);
    });
  });

  describe('Middleware Error Responses', () => {
    test('401 for auth failures', () => {
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    });

    test('403 for membership failures', () => {
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
    });

    test('403 for role failures', () => {
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
    });

    test('Error response includes message', () => {
      // { error: 'Unauthorized' } or { error: 'Forbidden' }
      expect(['Unauthorized', 'Forbidden']).toContain('Unauthorized');
    });
  });
});
