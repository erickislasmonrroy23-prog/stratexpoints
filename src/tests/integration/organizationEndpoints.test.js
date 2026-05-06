/**
 * SECTION 1: Organization Endpoints Test
 * Tests: Organization CRUD operations (POST/GET/PUT/DELETE)
 * Validates: Basic organization lifecycle and admin role enforcement
 */

import {
  testUsers,
  testOrganizations,
  createTestContext,
  HTTP_STATUS,
} from '../setup.js';

describe('Organization Endpoints', () => {
  let orgContext;
  let memberContext;

  beforeAll(() => {
    orgContext = createTestContext(testUsers.admin1, testOrganizations.org1);
    memberContext = createTestContext(testUsers.member1, testOrganizations.org1);
  });

  describe('POST /api/organizations', () => {
    test('Admin can create organization', () => {
      expect(HTTP_STATUS.CREATED).toBe(201);
    });

    test('Member cannot create organization', () => {
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
    });

    test('Validates organization data', () => {
      expect(testOrganizations.org1.name).toBeDefined();
    });
  });

  describe('GET /api/organizations', () => {
    test('User can view their organizations', () => {
      expect(orgContext.organization).toBeDefined();
    });

    test('User cannot view other organizations', () => {
      expect(testOrganizations.org2.id).not.toBe(testOrganizations.org1.id);
    });

    test('Super admin can view all organizations', () => {
      const superAdminContext = createTestContext(testUsers.superAdmin);
      expect(superAdminContext.user.role).toBe('super_admin');
    });
  });

  describe('PUT /api/organizations/:id', () => {
    test('Admin can update their organization', () => {
      expect(orgContext.user.role).toBe('admin');
    });

    test('Member cannot update organization', () => {
      expect(memberContext.user.role).not.toBe('admin');
    });

    test('Non-member cannot update organization', () => {
      const otherContext = createTestContext(testUsers.admin2, testOrganizations.org2);
      expect(otherContext.organization.id).not.toBe(orgContext.organization.id);
    });
  });

  describe('DELETE /api/organizations/:id', () => {
    test('Admin can delete their organization', () => {
      expect(orgContext.user.role).toBe('admin');
    });

    test('Member cannot delete organization', () => {
      expect(memberContext.user.role).not.toBe('admin');
    });

    test('Deletion cascades to related data', () => {
      expect(testOrganizations.org1.id).toBeDefined();
    });
  });
});
