import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '../db';
import { requireAuth } from './auth';
import { requireSchoolPermission, loadSchool, getSchoolMembership } from '../middleware/rbac';
import { NewClass, NewClassEnrollment } from '../db/schema/schools';

const router = Router();

// ============================================================================
// Class Routes
// ============================================================================

/**
 * Create a class
 */
router.post('/:schoolId/classes', requireAuth, loadSchool(), requireSchoolPermission('classes:create'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.schoolId;
    const userId = req.userId!;
    const { name, code, description, departmentId, teacherId, schedule, room, capacity } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Class name is required (min 2 characters)' });
    }

    // Use provided teacherId or default to current user
    const assignedTeacherId = teacherId || userId;

    // Validate teacher is a member of the school
    const teacherMembership = await db.query.schoolMemberships.findFirst({
      where: and(
        eq(schema.schoolMemberships.userId, assignedTeacherId),
        eq(schema.schoolMemberships.schoolId, schoolId),
        eq(schema.schoolMemberships.status, 'active'),
      ),
    });

    if (!teacherMembership) {
      return res.status(400).json({ error: 'Teacher must be a member of this school' });
    }

    // Validate department if provided
    if (departmentId) {
      const dept = await db.query.departments.findFirst({
        where: and(
          eq(schema.departments.id, departmentId),
          eq(schema.departments.schoolId, schoolId),
        ),
      });

      if (!dept) {
        return res.status(400).json({ error: 'Department not found in this school' });
      }
    }

    const [classObj] = await db.insert(schema.classes).values({
      schoolId,
      name: name.trim(),
      code: code || null,
      description: description || null,
      departmentId: departmentId || null,
      teacherId: assignedTeacherId,
      schedule: schedule || null,
      room: room || null,
      capacity: capacity || null,
    }).returning();

    console.log('[Classes] Created:', classObj.id, 'in school:', schoolId);

    res.status(201).json({
      message: 'Class created',
      class: classObj,
    });

  } catch (error) {
    console.error('[Classes] Create error:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

/**
 * List classes in a school
 */
router.get('/:schoolId/classes', requireAuth, loadSchool(), requireSchoolPermission('school:read'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.schoolId;
    const userId = req.userId!;
    const membership = req.membership!;
    const { departmentId, teacherId } = req.query;

    let classes = await db.query.classes.findMany({
      where: eq(schema.classes.schoolId, schoolId),
    });

    // Filter by department
    if (departmentId && typeof departmentId === 'string') {
      classes = classes.filter(c => c.departmentId === departmentId);
    }

    // Filter by teacher
    if (teacherId && typeof teacherId === 'string') {
      classes = classes.filter(c => c.teacherId === teacherId);
    }

    // For students, only show enrolled classes
    if (membership.role === 'student') {
      const enrollments = await db.query.classEnrollments.findMany({
        where: and(
          eq(schema.classEnrollments.studentId, userId),
          eq(schema.classEnrollments.status, 'enrolled'),
        ),
      });
      const enrolledClassIds = enrollments.map(e => e.classId);
      classes = classes.filter(c => enrolledClassIds.includes(c.id));
    }

    // Get teacher details
    const teacherIds = [...new Set(classes.map(c => c.teacherId))];
    const teachers = teacherIds.length > 0
      ? await db.query.users.findMany({
          where: (users, { inArray }) => inArray(users.id, teacherIds),
        })
      : [];

    const classesWithDetails = classes.map(cls => ({
      ...cls,
      teacher: teachers.find(t => t.id === cls.teacherId) || null,
    }));

    res.json({ classes: classesWithDetails });

  } catch (error) {
    console.error('[Classes] List error:', error);
    res.status(500).json({ error: 'Failed to list classes' });
  }
});

/**
 * Get class details
 */
router.get('/classes/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    const userId = req.userId!;

    const classObj = await db.query.classes.findFirst({
      where: eq(schema.classes.id, classId),
    });

    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check user is member of the school
    const membership = await getSchoolMembership(userId, classObj.schoolId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this school' });
    }

    // Get enrolled students count
    const enrollments = await db.query.classEnrollments.findMany({
      where: and(
        eq(schema.classEnrollments.classId, classId),
        eq(schema.classEnrollments.status, 'enrolled'),
      ),
    });

    // Get teacher details
    const teacher = await db.query.users.findFirst({
      where: eq(schema.users.id, classObj.teacherId),
    });

    res.json({
      class: classObj,
      teacher: teacher ? {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        avatarUrl: teacher.avatarUrl,
      } : null,
      stats: {
        enrolledStudents: enrollments.length,
      },
    });

  } catch (error) {
    console.error('[Classes] Get error:', error);
    res.status(500).json({ error: 'Failed to get class' });
  }
});

/**
 * Update class
 */
router.patch('/classes/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    const userId = req.userId!;
    const { name, code, description, departmentId, teacherId, schedule, room, capacity } = req.body;

    const classObj = await db.query.classes.findFirst({
      where: eq(schema.classes.id, classId),
    });

    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check permission
    const membership = await getSchoolMembership(userId, classObj.schoolId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this school' });
    }

    const canEdit = ['principal', 'vice_principal', 'dept_head'].includes(membership.role) ||
      (membership.role === 'teacher' && classObj.teacherId === userId);

    if (!canEdit) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updates: Partial<NewClass> = {};
    if (name) updates.name = name.trim();
    if (code !== undefined) updates.code = code;
    if (description !== undefined) updates.description = description;
    if (departmentId !== undefined) updates.departmentId = departmentId;
    if (teacherId) updates.teacherId = teacherId;
    if (schedule !== undefined) updates.schedule = schedule;
    if (room !== undefined) updates.room = room;
    if (capacity !== undefined) updates.capacity = capacity;
    updates.updatedAt = new Date();

    const [updated] = await db.update(schema.classes)
      .set(updates)
      .where(eq(schema.classes.id, classId))
      .returning();

    res.json({
      message: 'Class updated',
      class: updated,
    });

  } catch (error) {
    console.error('[Classes] Update error:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

/**
 * Delete class
 */
router.delete('/classes/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    const userId = req.userId!;

    const classObj = await db.query.classes.findFirst({
      where: eq(schema.classes.id, classId),
    });

    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check permission (principal, vice_principal, dept_head only)
    const membership = await getSchoolMembership(userId, classObj.schoolId);
    if (!membership || !['principal', 'vice_principal', 'dept_head'].includes(membership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await db.delete(schema.classes).where(eq(schema.classes.id, classId));

    res.json({ message: 'Class deleted' });

  } catch (error) {
    console.error('[Classes] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// ============================================================================
// Enrollment Routes
// ============================================================================

/**
 * Enroll students in a class
 */
router.post('/classes/:id/enroll', requireAuth, async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    const userId = req.userId!;
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'studentIds array is required' });
    }

    const classObj = await db.query.classes.findFirst({
      where: eq(schema.classes.id, classId),
    });

    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check permission
    const membership = await getSchoolMembership(userId, classObj.schoolId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this school' });
    }

    const canEnroll = ['principal', 'vice_principal', 'dept_head'].includes(membership.role) ||
      (membership.role === 'teacher' && classObj.teacherId === userId);

    if (!canEnroll) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Validate all students are members of the school
    const studentMemberships = await db.query.schoolMemberships.findMany({
      where: and(
        eq(schema.schoolMemberships.schoolId, classObj.schoolId),
        eq(schema.schoolMemberships.status, 'active'),
      ),
    });

    const validStudentIds = studentMemberships
      .filter(m => m.role === 'student' && studentIds.includes(m.userId))
      .map(m => m.userId);

    if (validStudentIds.length === 0) {
      return res.status(400).json({ error: 'No valid students to enroll' });
    }

    // Check for existing enrollments
    const existingEnrollments = await db.query.classEnrollments.findMany({
      where: eq(schema.classEnrollments.classId, classId),
    });
    const alreadyEnrolled = existingEnrollments.map(e => e.studentId);

    const newEnrollments = validStudentIds
      .filter(id => !alreadyEnrolled.includes(id))
      .map(studentId => ({
        studentId,
        classId,
        status: 'enrolled' as const,
      }));

    if (newEnrollments.length > 0) {
      await db.insert(schema.classEnrollments).values(newEnrollments);
    }

    res.json({
      message: 'Students enrolled',
      enrolled: newEnrollments.length,
      alreadyEnrolled: validStudentIds.length - newEnrollments.length,
    });

  } catch (error) {
    console.error('[Classes] Enroll error:', error);
    res.status(500).json({ error: 'Failed to enroll students' });
  }
});

/**
 * List enrolled students
 */
router.get('/classes/:id/students', requireAuth, async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    const userId = req.userId!;

    const classObj = await db.query.classes.findFirst({
      where: eq(schema.classes.id, classId),
    });

    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check permission
    const membership = await getSchoolMembership(userId, classObj.schoolId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this school' });
    }

    // Students can only see if they're enrolled
    if (membership.role === 'student') {
      const isEnrolled = await db.query.classEnrollments.findFirst({
        where: and(
          eq(schema.classEnrollments.classId, classId),
          eq(schema.classEnrollments.studentId, userId),
        ),
      });
      if (!isEnrolled) {
        return res.status(403).json({ error: 'Not enrolled in this class' });
      }
    }

    const enrollments = await db.query.classEnrollments.findMany({
      where: eq(schema.classEnrollments.classId, classId),
    });

    // Get student details
    const studentIds = enrollments.map(e => e.studentId);
    const students = studentIds.length > 0
      ? await db.query.users.findMany({
          where: (users, { inArray }) => inArray(users.id, studentIds),
        })
      : [];

    const enrollmentsWithDetails = enrollments.map(e => ({
      ...e,
      student: students.find(s => s.id === e.studentId) || null,
    }));

    res.json({ enrollments: enrollmentsWithDetails });

  } catch (error) {
    console.error('[Classes] List students error:', error);
    res.status(500).json({ error: 'Failed to list students' });
  }
});

/**
 * Remove student from class
 */
router.delete('/classes/:id/students/:studentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    const studentId = req.params.studentId;
    const userId = req.userId!;

    const classObj = await db.query.classes.findFirst({
      where: eq(schema.classes.id, classId),
    });

    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check permission
    const membership = await getSchoolMembership(userId, classObj.schoolId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this school' });
    }

    const canRemove = ['principal', 'vice_principal', 'dept_head'].includes(membership.role) ||
      (membership.role === 'teacher' && classObj.teacherId === userId);

    if (!canRemove) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await db.delete(schema.classEnrollments)
      .where(and(
        eq(schema.classEnrollments.classId, classId),
        eq(schema.classEnrollments.studentId, studentId),
      ));

    res.json({ message: 'Student removed from class' });

  } catch (error) {
    console.error('[Classes] Remove student error:', error);
    res.status(500).json({ error: 'Failed to remove student' });
  }
});

export default router;
