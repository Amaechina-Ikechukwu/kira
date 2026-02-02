import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  hasSchoolPermission, 
  hasPlatformPermission,
  getSchoolRoleLevel,
  getPlatformRoleLevel,
  SCHOOL_PERMISSIONS,
  PLATFORM_PERMISSIONS,
} from './rbac';
import type { SchoolRole } from '../db/schema/schools';
import type { PlatformRole } from '../db/schema/users';

describe('RBAC Middleware', () => {
  describe('hasSchoolPermission', () => {
    it('should grant principal all school permissions', () => {
      const permissions = Object.keys(SCHOOL_PERMISSIONS) as (keyof typeof SCHOOL_PERMISSIONS)[];
      
      permissions.forEach(permission => {
        // Principal should have all permissions except quizzes:take (student only)
        if (permission !== 'quizzes:take') {
          expect(hasSchoolPermission('principal', permission)).toBe(true);
        }
      });
    });

    it('should restrict student to basic permissions', () => {
      expect(hasSchoolPermission('student', 'school:read')).toBe(true);
      expect(hasSchoolPermission('student', 'quizzes:take')).toBe(true);
      expect(hasSchoolPermission('student', 'analytics:view_own')).toBe(true);
      expect(hasSchoolPermission('student', 'meetings:attend')).toBe(true);
      
      // Students should NOT have these permissions
      expect(hasSchoolPermission('student', 'school:update')).toBe(false);
      expect(hasSchoolPermission('student', 'staff:invite')).toBe(false);
      expect(hasSchoolPermission('student', 'classes:create')).toBe(false);
      expect(hasSchoolPermission('student', 'lessons:create')).toBe(false);
    });

    it('should allow teachers to create content', () => {
      expect(hasSchoolPermission('teacher', 'lessons:create')).toBe(true);
      expect(hasSchoolPermission('teacher', 'lessons:edit')).toBe(true);
      expect(hasSchoolPermission('teacher', 'quizzes:create')).toBe(true);
      expect(hasSchoolPermission('teacher', 'classes:create')).toBe(true);
      expect(hasSchoolPermission('teacher', 'meetings:create')).toBe(true);
    });

    it('should restrict teaching assistants appropriately', () => {
      expect(hasSchoolPermission('teaching_assistant', 'lessons:edit')).toBe(true);
      expect(hasSchoolPermission('teaching_assistant', 'quizzes:grade')).toBe(true);
      
      // TAs should NOT be able to create
      expect(hasSchoolPermission('teaching_assistant', 'lessons:create')).toBe(false);
      expect(hasSchoolPermission('teaching_assistant', 'quizzes:create')).toBe(false);
    });

    it('should give dept_head department management powers', () => {
      expect(hasSchoolPermission('dept_head', 'departments:manage')).toBe(true);
      expect(hasSchoolPermission('dept_head', 'classes:create')).toBe(true);
      expect(hasSchoolPermission('dept_head', 'analytics:view_department')).toBe(true);
      
      // dept_head should NOT have school-wide powers
      expect(hasSchoolPermission('dept_head', 'school:update')).toBe(false);
      expect(hasSchoolPermission('dept_head', 'staff:invite')).toBe(false);
    });
  });

  describe('hasPlatformPermission', () => {
    it('should grant owner all platform permissions', () => {
      const permissions = Object.keys(PLATFORM_PERMISSIONS) as (keyof typeof PLATFORM_PERMISSIONS)[];
      
      permissions.forEach(permission => {
        expect(hasPlatformPermission('owner', permission)).toBe(true);
      });
    });

    it('should restrict regular users from all platform permissions', () => {
      const permissions = Object.keys(PLATFORM_PERMISSIONS) as (keyof typeof PLATFORM_PERMISSIONS)[];
      
      permissions.forEach(permission => {
        expect(hasPlatformPermission('user', permission)).toBe(false);
      });
    });

    it('should allow moderators to moderate content', () => {
      expect(hasPlatformPermission('moderator', 'content:moderate')).toBe(true);
      expect(hasPlatformPermission('moderator', 'content:delete_any')).toBe(true);
      
      // Moderators should NOT have system access
      expect(hasPlatformPermission('moderator', 'system:configure')).toBe(false);
      expect(hasPlatformPermission('moderator', 'billing:manage')).toBe(false);
    });

    it('should give support staff read access', () => {
      expect(hasPlatformPermission('support', 'users:view_all')).toBe(true);
      expect(hasPlatformPermission('support', 'schools:view_all')).toBe(true);
      
      // Support should NOT have edit access
      expect(hasPlatformPermission('support', 'users:edit')).toBe(false);
      expect(hasPlatformPermission('support', 'schools:edit_any')).toBe(false);
    });

    it('should only allow owner to manage billing', () => {
      expect(hasPlatformPermission('owner', 'billing:manage')).toBe(true);
      expect(hasPlatformPermission('superadmin', 'billing:manage')).toBe(false);
      expect(hasPlatformPermission('admin', 'billing:manage')).toBe(false);
    });
  });

  describe('getSchoolRoleLevel', () => {
    it('should return correct hierarchy levels', () => {
      expect(getSchoolRoleLevel('principal')).toBe(6);
      expect(getSchoolRoleLevel('vice_principal')).toBe(5);
      expect(getSchoolRoleLevel('dept_head')).toBe(4);
      expect(getSchoolRoleLevel('teacher')).toBe(3);
      expect(getSchoolRoleLevel('teaching_assistant')).toBe(2);
      expect(getSchoolRoleLevel('student')).toBe(1);
    });

    it('should maintain correct ordering', () => {
      const roles: SchoolRole[] = ['principal', 'vice_principal', 'dept_head', 'teacher', 'teaching_assistant', 'student'];
      
      for (let i = 0; i < roles.length - 1; i++) {
        expect(getSchoolRoleLevel(roles[i])).toBeGreaterThan(getSchoolRoleLevel(roles[i + 1]));
      }
    });
  });

  describe('getPlatformRoleLevel', () => {
    it('should return correct hierarchy levels', () => {
      expect(getPlatformRoleLevel('owner')).toBe(6);
      expect(getPlatformRoleLevel('superadmin')).toBe(5);
      expect(getPlatformRoleLevel('admin')).toBe(4);
      expect(getPlatformRoleLevel('support')).toBe(3);
      expect(getPlatformRoleLevel('moderator')).toBe(2);
      expect(getPlatformRoleLevel('user')).toBe(1);
    });

    it('should maintain correct ordering', () => {
      const roles: PlatformRole[] = ['owner', 'superadmin', 'admin', 'support', 'moderator', 'user'];
      
      for (let i = 0; i < roles.length - 1; i++) {
        expect(getPlatformRoleLevel(roles[i])).toBeGreaterThan(getPlatformRoleLevel(roles[i + 1]));
      }
    });
  });
});
