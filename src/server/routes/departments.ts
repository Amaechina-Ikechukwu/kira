import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '../db';
import { requireAuth } from './auth';
import { requireSchoolPermission, loadSchool } from '../middleware/rbac';
import { NewDepartment } from '../db/schema/schools';

const router = Router();

// ============================================================================
// Department Routes
// ============================================================================

/**
 * Create a department
 */
router.post('/:schoolId/departments', requireAuth, loadSchool(), requireSchoolPermission('departments:create'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.schoolId;
    const { name, description, headId, color } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Department name is required (min 2 characters)' });
    }

    // Validate head if provided
    if (headId) {
      const membership = await db.query.schoolMemberships.findFirst({
        where: and(
          eq(schema.schoolMemberships.userId, headId),
          eq(schema.schoolMemberships.schoolId, schoolId),
          eq(schema.schoolMemberships.status, 'active'),
        ),
      });

      if (!membership) {
        return res.status(400).json({ error: 'Department head must be a member of this school' });
      }
    }

    const [department] = await db.insert(schema.departments).values({
      schoolId,
      name: name.trim(),
      description: description || null,
      headId: headId || null,
      color: color || null,
    }).returning();

    // If head is assigned, update their role to dept_head if they're not already higher
    if (headId) {
      const membership = await db.query.schoolMemberships.findFirst({
        where: and(
          eq(schema.schoolMemberships.userId, headId),
          eq(schema.schoolMemberships.schoolId, schoolId),
        ),
      });

      if (membership && ['teacher', 'teaching_assistant', 'student'].includes(membership.role)) {
        await db.update(schema.schoolMemberships)
          .set({ role: 'dept_head', departmentId: department.id })
          .where(eq(schema.schoolMemberships.id, membership.id));
      }
    }

    console.log('[Departments] Created:', department.id, 'in school:', schoolId);

    res.status(201).json({
      message: 'Department created',
      department,
    });

  } catch (error) {
    console.error('[Departments] Create error:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

/**
 * List departments in a school
 */
router.get('/:schoolId/departments', requireAuth, loadSchool(), requireSchoolPermission('school:read'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.schoolId;

    const departments = await db.query.departments.findMany({
      where: eq(schema.departments.schoolId, schoolId),
    });

    // Get head user details
    const headIds = departments.filter(d => d.headId).map(d => d.headId!);
    const heads = headIds.length > 0 
      ? await db.query.users.findMany({
          where: (users, { inArray }) => inArray(users.id, headIds),
        })
      : [];

    const departmentsWithHeads = departments.map(dept => ({
      ...dept,
      head: dept.headId 
        ? heads.find(h => h.id === dept.headId)
        : null,
    }));

    res.json({ departments: departmentsWithHeads });

  } catch (error) {
    console.error('[Departments] List error:', error);
    res.status(500).json({ error: 'Failed to list departments' });
  }
});

/**
 * Get department details
 */
router.get('/departments/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const departmentId = req.params.id;
    const userId = req.userId!;

    const department = await db.query.departments.findFirst({
      where: eq(schema.departments.id, departmentId),
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check user is member of the school
    const membership = await db.query.schoolMemberships.findFirst({
      where: and(
        eq(schema.schoolMemberships.userId, userId),
        eq(schema.schoolMemberships.schoolId, department.schoolId),
        eq(schema.schoolMemberships.status, 'active'),
      ),
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this school' });
    }

    // Get class count
    const classes = await db.query.classes.findMany({
      where: eq(schema.classes.departmentId, departmentId),
    });

    // Get member count
    const members = await db.query.schoolMemberships.findMany({
      where: and(
        eq(schema.schoolMemberships.schoolId, department.schoolId),
        eq(schema.schoolMemberships.departmentId, departmentId),
        eq(schema.schoolMemberships.status, 'active'),
      ),
    });

    res.json({
      department,
      stats: {
        classes: classes.length,
        members: members.length,
      },
    });

  } catch (error) {
    console.error('[Departments] Get error:', error);
    res.status(500).json({ error: 'Failed to get department' });
  }
});

/**
 * Update department
 */
router.patch('/departments/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const departmentId = req.params.id;
    const userId = req.userId!;
    const { name, description, headId, color } = req.body;

    // Get department
    const department = await db.query.departments.findFirst({
      where: eq(schema.departments.id, departmentId),
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check permission (principal, vice_principal, or dept_head of this department)
    const membership = await db.query.schoolMemberships.findFirst({
      where: and(
        eq(schema.schoolMemberships.userId, userId),
        eq(schema.schoolMemberships.schoolId, department.schoolId),
        eq(schema.schoolMemberships.status, 'active'),
      ),
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this school' });
    }

    const canManage = ['principal', 'vice_principal'].includes(membership.role) ||
      (membership.role === 'dept_head' && membership.departmentId === departmentId);

    if (!canManage) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updates: Partial<NewDepartment> = {};
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (headId !== undefined) updates.headId = headId;
    if (color !== undefined) updates.color = color;
    updates.updatedAt = new Date();

    const [updated] = await db.update(schema.departments)
      .set(updates)
      .where(eq(schema.departments.id, departmentId))
      .returning();

    res.json({
      message: 'Department updated',
      department: updated,
    });

  } catch (error) {
    console.error('[Departments] Update error:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

/**
 * Delete department
 */
router.delete('/departments/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const departmentId = req.params.id;
    const userId = req.userId!;

    // Get department
    const department = await db.query.departments.findFirst({
      where: eq(schema.departments.id, departmentId),
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check permission (principal or vice_principal only)
    const membership = await db.query.schoolMemberships.findFirst({
      where: and(
        eq(schema.schoolMemberships.userId, userId),
        eq(schema.schoolMemberships.schoolId, department.schoolId),
        eq(schema.schoolMemberships.status, 'active'),
      ),
    });

    if (!membership || !['principal', 'vice_principal'].includes(membership.role)) {
      return res.status(403).json({ error: 'Only principal or vice principal can delete departments' });
    }

    await db.delete(schema.departments).where(eq(schema.departments.id, departmentId));

    res.json({ message: 'Department deleted' });

  } catch (error) {
    console.error('[Departments] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

export default router;
