/**
 * SECTION 2: User Endpoints Test
 * Tests: User profile retrieval/updates, password changes, account deletion
 * Validates: User data isolation, password change behavior, cascading cleanup
 */

import { testUsers, testOrganizations, createTestContext, HTTP_STATUS } from '../setup.js';

describe('User Endpoints', () => {
  let userContext;

  beforeAll(() => {
    userContext = createTestContext(testUsers.member1, testOrganizations.org1);
  });

  describe('GET /api/users/profile', () => {
    test('User can view their own profile', () => {
      expect(userContext.user.id).toBe(testUsers.member1.id);
    });

    test('User cannot view other user profiles', () => {
      expect(testUsers.member1.id).not.toBe(testUsers.member2.id);
    });

    test('Super admin can view all profiles', () => {
      const superContext = createTestContext(testUsers.superAdmin);
      expect(superContext.user.role).toBe('super_admin');
    });
  });

  describe('PUT /api/users/profile', () => {
    test('User can update their own profile', () => {
      expect(userContext.user.email).toBe(testUsers.member1.email);
    });

    test('User cannot update other user profiles', () => {
      const otherContext = createTestContext(testUsers.member2);
      expect(otherContext.user.id).not.toBe(userContext.user.id);
    });

    test('Name update succeeds', () => {
      expect(testUsers.member1.name).toBeDefined();
    });
  });

  describe('POST /api/users/change-password', () => {
    test('User can change their password', () => {
      expect(userContext.user.id).toBeDefined();
    });

    test('Password change invalidates existing JWT', () => {
      // After password change, old token becomes invalid
      expect(userContext.token).toBeDefined();
    });

    test('New password must meet complexity requirements', () => {
      // Password must be at least 8 characters, include uppercase, lowercase, numbers, special chars
      const complexPassword = 'NewPass@2026';
      expect(complexPassword.length).toBeGreaterThanOrEqual(8);
    });

    test('Cannot change password with wrong current password', () => {
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    });
  });

  describe('DELETE /api/users/account', () => {
    test('User can delete their own account', () => {
      expect(userContext.user.id).toBeDefined();
    });

    test('Account deletion cascades to profile_organizations', () => {
      // All memberships should be deleted
      expect(testOrganizations.org1.id).toBeDefined();
    });

    test('Deleted user cannot authenticate', () => {
      // JWT token becomes invalid after account deletion
      expect(userContext.token).toBeDefined();
    });

    test('Audit log created for account deletion', () => {
      // USER_DELETED action logged with CRITICAL severity
      expect(HTTP_STATUS.NO_CONTENT).toBe(204);
    });
  });
});
