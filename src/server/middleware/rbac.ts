import { Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '../db';
import { SchoolRole, SchoolMembership } from '../db/schema/schools';
import { PlatformRole } from '../db/schema/users';

// ============================================================================
// Permission Definitions
// ============================================================================

/**
 * School-level permissions mapped to roles that have them
 */
export const SCHOOL_PERMISSIONS = {
  // School management
  'school:read': ['principal', 'vice_principal', 'dept_head', 'teacher', 'teaching_assistant', 'student'],
  'school:update': ['principal', 'vice_principal'],
  'school:delete': ['principal'],
  'school:billing': ['principal'],
  
  // Staff management
  'staff:invite': ['principal', 'vice_principal'],
  'staff:remove': ['principal', 'vice_principal'],
  'staff:update_role': ['principal'],
  
  // Student management
  'students:enroll': ['principal', 'vice_principal', 'dept_head'],
  'students:view': ['principal', 'vice_principal', 'dept_head', 'teacher', 'teaching_assistant'],
  'students:update': ['principal', 'vice_principal'],
  
  // Department management
  'departments:create': ['principal', 'vice_principal'],
  'departments:manage': ['principal', 'vice_principal', 'dept_head'],
  'departments:delete': ['principal', 'vice_principal'],
  
  // Class/Course management
  'classes:create': ['principal', 'vice_principal', 'dept_head', 'teacher'],
  'classes:edit': ['principal', 'vice_principal', 'dept_head', 'teacher'],
  'classes:delete': ['principal', 'vice_principal', 'dept_head'],
  'classes:assign_teacher': ['principal', 'vice_principal', 'dept_head'],
  'classes:enroll_students': ['principal', 'vice_principal', 'dept_head', 'teacher'],
  
  // Content management
  'lessons:create': ['principal', 'vice_principal', 'dept_head', 'teacher'],
  'lessons:edit': ['principal', 'vice_principal', 'dept_head', 'teacher', 'teaching_assistant'],
  'lessons:publish': ['principal', 'vice_principal', 'dept_head', 'teacher'],
  'lessons:delete': ['principal', 'vice_principal', 'dept_head', 'teacher'],
  
  // Meetings
  'meetings:create': ['principal', 'vice_principal', 'dept_head', 'teacher'],
  'meetings:manage': ['principal', 'vice_principal', 'dept_head'],
  'meetings:attend': ['principal', 'vice_principal', 'dept_head', 'teacher', 'teaching_assistant', 'student'],
  
  // Quizzes & Grading
  'quizzes:create': ['principal', 'vice_principal', 'dept_head', 'teacher'],
  'quizzes:grade': ['principal', 'vice_principal', 'dept_head', 'teacher', 'teaching_assistant'],
  'quizzes:take': ['student'],
  'quizzes:view_results': ['principal', 'vice_principal', 'dept_head', 'teacher', 'teaching_assistant'],
  
  // Analytics & Reports
  'analytics:view_own': ['student', 'teaching_assistant', 'teacher', 'dept_head', 'vice_principal', 'principal'],
  'analytics:view_class': ['teacher', 'teaching_assistant', 'dept_head', 'vice_principal', 'principal'],
  'analytics:view_department': ['dept_head', 'vice_principal', 'principal'],
  'analytics:view_school': ['vice_principal', 'principal'],
  'analytics:export': ['vice_principal', 'principal'],
} as const;

export type SchoolPermission = keyof typeof SCHOOL_PERMISSIONS;

/**
 * Platform-level permissions mapped to roles
 */
export const PLATFORM_PERMISSIONS = {
  // User management
  'users:view_all': ['owner', 'superadmin', 'admin', 'support'],
  'users:edit': ['owner', 'superadmin', 'admin'],
  'users:delete': ['owner', 'superadmin'],
  'users:change_role': ['owner', 'superadmin'],
  
  // School management (platform level)
  'schools:view_all': ['owner', 'superadmin', 'admin', 'support'],
  'schools:edit_any': ['owner', 'superadmin', 'admin'],
  'schools:delete_any': ['owner', 'superadmin'],
  'schools:impersonate': ['owner', 'superadmin'],
  
  // Content moderation
  'content:moderate': ['owner', 'superadmin', 'admin', 'moderator'],
  'content:delete_any': ['owner', 'superadmin', 'admin', 'moderator'],
  
  // System configuration
  'system:configure': ['owner', 'superadmin'],
  'system:feature_flags': ['owner', 'superadmin'],
  'system:view_logs': ['owner', 'superadmin', 'admin'],
  
  // Billing
  'billing:manage': ['owner'],
  'billing:view': ['owner', 'superadmin'],
  
  // Staff management
  'staff:manage': ['owner'],
  'staff:view': ['owner', 'superadmin', 'admin'],
} as const;

export type PlatformPermission = keyof typeof PLATFORM_PERMISSIONS;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a user's membership in a school
 */
export async function getSchoolMembership(
  userId: string, 
  schoolId: string
): Promise<SchoolMembership | null> {
  const membership = await db.query.schoolMemberships.findFirst({
    where: and(
      eq(schema.schoolMemberships.userId, userId),
      eq(schema.schoolMemberships.schoolId, schoolId),
      eq(schema.schoolMemberships.status, 'active')
    ),
  });
  return membership || null;
}

/**
 * Check if a role has a specific school permission
 */
export function hasSchoolPermission(role: SchoolRole, permission: SchoolPermission): boolean {
  const allowedRoles = SCHOOL_PERMISSIONS[permission];
  return allowedRoles.includes(role);
}

/**
 * Check if a platform role has a specific platform permission
 */
export function hasPlatformPermission(role: PlatformRole, permission: PlatformPermission): boolean {
  const allowedRoles = PLATFORM_PERMISSIONS[permission];
  return (allowedRoles as readonly string[]).includes(role);
}

/**
 * Get the hierarchy level of a school role (higher = more permissions)
 */
export function getSchoolRoleLevel(role: SchoolRole): number {
  const levels: Record<SchoolRole, number> = {
    principal: 6,
    vice_principal: 5,
    dept_head: 4,
    teacher: 3,
    teaching_assistant: 2,
    student: 1,
  };
  return levels[role];
}

/**
 * Get the hierarchy level of a platform role
 */
export function getPlatformRoleLevel(role: PlatformRole): number {
  const levels: Record<PlatformRole, number> = {
    owner: 6,
    superadmin: 5,
    admin: 4,
    support: 3,
    moderator: 2,
    user: 1,
  };
  return levels[role];
}

// ============================================================================
// Middleware
// ============================================================================

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      user?: {
        id: string;
        email: string;
        platformRole: PlatformRole;
      };
      membership?: SchoolMembership;
      school?: typeof schema.schools.$inferSelect;
    }
  }
}

/**
 * Middleware to require a specific school permission
 * Must be used after authMiddleware and after schoolId is available in params
 */
export function requireSchoolPermission(permission: SchoolPermission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      const schoolId = req.params.schoolId || req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!schoolId) {
        return res.status(400).json({ error: 'School ID required' });
      }
      
      // Check if user is platform admin (they have access to all schools)
      if (req.user && getPlatformRoleLevel(req.user.platformRole) >= getPlatformRoleLevel('admin')) {
        return next();
      }
      
      // Get user's membership in this school
      const membership = await getSchoolMembership(userId, schoolId);
      
      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this school' });
      }
      
      // Check permission
      if (!hasSchoolPermission(membership.role as SchoolRole, permission)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permission,
          yourRole: membership.role,
        });
      }
      
      // Attach membership to request for downstream use
      req.membership = membership;
      next();
    } catch (error) {
      console.error('[RBAC] Error checking school permission:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware to require a specific platform role
 */
export function requirePlatformRole(...roles: PlatformRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get user from database
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Check role
      if (!roles.includes(user.platformRole as PlatformRole)) {
        return res.status(403).json({ 
          error: 'Insufficient platform permissions',
          required: roles,
          yourRole: user.platformRole,
        });
      }
      
      // Attach user to request
      req.user = {
        id: user.id,
        email: user.email,
        platformRole: user.platformRole as PlatformRole,
      };
      
      next();
    } catch (error) {
      console.error('[RBAC] Error checking platform role:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware to require a specific platform permission
 */
export function requirePlatformPermission(permission: PlatformPermission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get user from database
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Check permission
      if (!hasPlatformPermission(user.platformRole as PlatformRole, permission)) {
        return res.status(403).json({ 
          error: 'Insufficient platform permissions',
          required: permission,
          yourRole: user.platformRole,
        });
      }
      
      // Attach user to request
      req.user = {
        id: user.id,
        email: user.email,
        platformRole: user.platformRole as PlatformRole,
      };
      
      next();
    } catch (error) {
      console.error('[RBAC] Error checking platform permission:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware to load and attach school to request
 */
export function loadSchool() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.params.schoolId || req.params.id;
      
      if (!schoolId) {
        return res.status(400).json({ error: 'School ID required' });
      }
      
      const school = await db.query.schools.findFirst({
        where: eq(schema.schools.id, schoolId),
      });
      
      if (!school) {
        return res.status(404).json({ error: 'School not found' });
      }
      
      req.school = school;
      next();
    } catch (error) {
      console.error('[RBAC] Error loading school:', error);
      res.status(500).json({ error: 'Failed to load school' });
    }
  };
}
