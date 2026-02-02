import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { eq, and, ilike } from 'drizzle-orm';
import { db, schema } from '../db';
import { requireAuth } from './auth';
import { 
  requireSchoolPermission, 
  requirePlatformPermission,
  loadSchool,
  getSchoolMembership,
} from '../middleware/rbac';
import { SchoolRole, NewSchool, NewSchoolMembership, NewSchoolInvitation } from '../db/schema/schools';

const router = Router();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + randomBytes(4).toString('hex');
}

// ============================================================================
// School CRUD Routes
// ============================================================================

/**
 * Create a new school
 * The creator becomes the principal
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, type, address, city, country, website, phone, settings } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'School name is required (min 2 characters)' });
    }

    // Check if user is already a principal of another school
    const existingSchool = await db.query.schoolMemberships.findFirst({
      where: and(
        eq(schema.schoolMemberships.userId, userId),
        eq(schema.schoolMemberships.role, 'principal')
      ),
    });

    if (existingSchool) {
      return res.status(400).json({ error: 'You are already a Principal of a school. You can only create one school.' });
    }

    const slug = generateSlug(name.trim());

    // Create school with creator as principal
    const [school] = await db.insert(schema.schools).values({
      name: name.trim(),
      type: type || 'school',
      slug,
      address,
      city,
      country,
      website,
      phone,
      principalId: userId,
      settings: settings || undefined,
    }).returning();

    // Add creator as principal member
    await db.insert(schema.schoolMemberships).values({
      userId,
      schoolId: school.id,
      role: 'principal',
      status: 'active',
    });

    console.log('[Schools] Created school:', school.id, 'by user:', userId);

    res.status(201).json({
      message: 'School created successfully',
      school,
    });

  } catch (error) {
    console.error('[Schools] Create error:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

/**
 * List schools the user is a member of
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { search } = req.query;

    // Get user's memberships
    const memberships = await db.query.schoolMemberships.findMany({
      where: eq(schema.schoolMemberships.userId, userId),
      with: {
        // Note: This requires relations set up in drizzle schema
      },
    });

    // Get school IDs
    const schoolIds = memberships.map(m => m.schoolId);
    
    if (schoolIds.length === 0) {
      return res.json({ schools: [] });
    }

    // Fetch schools
    let schools = await db.query.schools.findMany({
      where: (schools, { inArray }) => inArray(schools.id, schoolIds),
    });

    // Filter by search if provided
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      schools = schools.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.city?.toLowerCase().includes(searchLower)
      );
    }

    // Combine with membership info
    const schoolsWithRole = schools.map(school => {
      const membership = memberships.find(m => m.schoolId === school.id);
      return {
        ...school,
        myRole: membership?.role,
        myStatus: membership?.status,
      };
    });

    res.json({ schools: schoolsWithRole });

  } catch (error) {
    console.error('[Schools] List error:', error);
    res.status(500).json({ error: 'Failed to list schools' });
  }
});

/**
 * Get school details
 */
router.get('/:id', requireAuth, loadSchool(), requireSchoolPermission('school:read'), async (req: Request, res: Response) => {
  try {
    const school = req.school!;
    const membership = req.membership!;

    // Get basic stats
    const [memberCount] = await db
      .select({ count: schema.schoolMemberships.id })
      .from(schema.schoolMemberships)
      .where(and(
        eq(schema.schoolMemberships.schoolId, school.id),
        eq(schema.schoolMemberships.status, 'active')
      ));

    const [departmentCount] = await db
      .select({ count: schema.departments.id })
      .from(schema.departments)
      .where(eq(schema.departments.schoolId, school.id));

    const [classCount] = await db
      .select({ count: schema.classes.id })
      .from(schema.classes)
      .where(eq(schema.classes.schoolId, school.id));

    // Get recent activity
    const recentMembers = await db.query.schoolMemberships.findMany({
      where: eq(schema.schoolMemberships.schoolId, school.id),
      orderBy: (memberships, { desc }) => [desc(memberships.enrolledAt)],
      limit: 5,
      with: {
        user: true,
      },
    });

    const recentClasses = await db.query.classes.findMany({
      where: eq(schema.classes.schoolId, school.id),
      orderBy: (classes, { desc }) => [desc(classes.createdAt)],
      limit: 5,
      with: {
        teacher: true
      }
    });

    const recentDepartments = await db.query.departments.findMany({
      where: eq(schema.departments.schoolId, school.id),
      orderBy: (departments, { desc }) => [desc(departments.createdAt)],
      limit: 5,
    });

    // Combine and sort
    const activities = [
      ...recentMembers.map(m => ({ type: 'member_joined', data: m, date: m.enrolledAt })),
      ...recentClasses.map(c => ({ type: 'class_created', data: c, date: c.createdAt })),
      ...recentDepartments.map(d => ({ type: 'department_created', data: d, date: d.createdAt })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

    res.json({
      school,
      myRole: membership.role,
      stats: {
        members: memberCount?.count || 0,
        departments: departmentCount?.count || 0,
        classes: classCount?.count || 0,
      },
      recentActivity: activities
    });

  } catch (error) {
    console.error('[Schools] Get error:', error);
    res.status(500).json({ error: 'Failed to get school' });
  }
});

/**
 * Update school
 */
router.patch('/:id', requireAuth, loadSchool(), requireSchoolPermission('school:update'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.id;
    const { name, type, address, city, country, website, phone, logoUrl, settings } = req.body;

    const updates: Partial<NewSchool> = {};
    
    if (name) updates.name = name.trim();
    if (type) updates.type = type;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (country !== undefined) updates.country = country;
    if (website !== undefined) updates.website = website;
    if (phone !== undefined) updates.phone = phone;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (settings) updates.settings = settings;
    
    updates.updatedAt = new Date();

    const [updated] = await db.update(schema.schools)
      .set(updates)
      .where(eq(schema.schools.id, schoolId))
      .returning();

    res.json({ 
      message: 'School updated',
      school: updated,
    });

  } catch (error) {
    console.error('[Schools] Update error:', error);
    res.status(500).json({ error: 'Failed to update school' });
  }
});

/**
 * Delete school (principal only)
 */
router.delete('/:id', requireAuth, loadSchool(), requireSchoolPermission('school:delete'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.id;

    // Delete school (cascade will remove memberships, departments, classes, etc.)
    await db.delete(schema.schools).where(eq(schema.schools.id, schoolId));

    console.log('[Schools] Deleted school:', schoolId);
    res.json({ message: 'School deleted' });

  } catch (error) {
    console.error('[Schools] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete school' });
  }
});

// ============================================================================
// Staff Management Routes
// ============================================================================

/**
 * List school staff/members
 */
router.get('/:id/members', requireAuth, loadSchool(), requireSchoolPermission('school:read'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.id;
    const { role, status } = req.query;

    let query = db.query.schoolMemberships.findMany({
      where: eq(schema.schoolMemberships.schoolId, schoolId),
    });

    let memberships = await query;

    // Filter by role if specified
    if (role && typeof role === 'string') {
      memberships = memberships.filter(m => m.role === role);
    }

    // Filter by status if specified
    if (status && typeof status === 'string') {
      memberships = memberships.filter(m => m.status === status);
    }

    // Get user details for each membership
    const userIds = memberships.map(m => m.userId);
    const users = await db.query.users.findMany({
      where: (users, { inArray }) => inArray(users.id, userIds),
    });

    const membersWithDetails = memberships.map(m => {
      const user = users.find(u => u.id === m.userId);
      return {
        ...m,
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        } : null,
      };
    });

    res.json({ members: membersWithDetails });

  } catch (error) {
    console.error('[Schools] List members error:', error);
    res.status(500).json({ error: 'Failed to list members' });
  }
});

/**
 * Invite a user to the school
 */
router.post('/:id/invitations', requireAuth, loadSchool(), requireSchoolPermission('staff:invite'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.id;
    const userId = req.userId!;
    const { email, role, departmentId, message } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const inviteRole = (role as SchoolRole) || 'student';

    // Validate role
    const validRoles: SchoolRole[] = ['vice_principal', 'dept_head', 'teacher', 'teaching_assistant', 'student'];
    if (!validRoles.includes(inviteRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // --- HIERARCHY ENFORCEMENT ---
    const inviterMembership = req.membership!; // Guaranteed by requireSchoolPermission
    // If inviter is platform admin, they act as principal
    const inviterRole = req.user && ['owner', 'superadmin', 'admin'].includes(req.user.platformRole) 
        ? 'principal' 
        : inviterMembership.role;

    if (inviterRole !== 'principal' && inviterRole !== 'vice_principal') {
        if (inviterRole === 'dept_head') {
            // Dept Head can only invite Teachers/TAs to THEIR department
            if (!['teacher', 'teaching_assistant'].includes(inviteRole)) {
                return res.status(403).json({ error: 'Department Heads can only invite Teachers and Teaching Assistants.' });
            }
            // Enforce department match
            if (!inviterMembership.departmentId) {
                 // Should not happen for a valid dept head, but safety check
                 return res.status(403).json({ error: 'You are not assigned to a department.' });
            }
            if (departmentId && departmentId !== inviterMembership.departmentId) {
                return res.status(403).json({ error: 'You can only invite to your own department.' });
            }
            // Force department ID
            req.body.departmentId = inviterMembership.departmentId; 
        } else if (inviterRole === 'teacher') {
            // Teacher can only invite Students
            if (inviteRole !== 'student') {
                return res.status(403).json({ error: 'Teachers can only invite Students.' });
            }
        } else {
            // Students/TAs (if they somehow got permission, though RBAC blocks them)
            return res.status(403).json({ error: 'You do not have permission to invite this role.' });
        }
    }

    // Check if user is already a member
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail),
    });

    if (existingUser) {
      const existingMembership = await getSchoolMembership(existingUser.id, schoolId);
      if (existingMembership) {
        return res.status(400).json({ error: 'User is already a member of this school' });
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await db.query.schoolInvitations.findFirst({
      where: and(
        eq(schema.schoolInvitations.schoolId, schoolId),
        eq(schema.schoolInvitations.email, normalizedEmail),
        eq(schema.schoolInvitations.acceptedAt, null as any),
      ),
    });

    if (existingInvitation && existingInvitation.expiresAt > new Date()) {
      return res.status(400).json({ error: 'Invitation already pending for this email' });
    }

    // Create invitation
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Use the enforced/validated departmentId
    const finalDepartmentId = (inviterRole === 'dept_head') ? inviterMembership.departmentId : departmentId;

    const [invitation] = await db.insert(schema.schoolInvitations).values({
      schoolId,
      email: normalizedEmail,
      role: inviteRole,
      departmentId: finalDepartmentId || null,
      token,
      invitedBy: userId,
      message: message || null,
      expiresAt,
    }).returning();

    // TODO: Send invitation email
    console.log('[Schools] Created invitation:', invitation.id, 'for:', normalizedEmail);

    res.status(201).json({
      message: 'Invitation sent',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });

  } catch (error) {
    console.error('[Schools] Invite error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

/**
 * Accept an invitation
 */
router.post('/invitations/:token/accept', requireAuth, async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const userId = req.userId!;

    // Find invitation
    const invitation = await db.query.schoolInvitations.findFirst({
      where: eq(schema.schoolInvitations.token, token),
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.acceptedAt) {
      return res.status(400).json({ error: 'Invitation already accepted' });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Get user email to verify
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user || user.email !== invitation.email) {
      return res.status(403).json({ 
        error: 'This invitation was sent to a different email address',
        expectedEmail: invitation.email,
      });
    }

    // Check if already a member
    const existingMembership = await getSchoolMembership(userId, invitation.schoolId);
    if (existingMembership) {
      return res.status(400).json({ error: 'Already a member of this school' });
    }

    // Create membership
    await db.insert(schema.schoolMemberships).values({
      userId,
      schoolId: invitation.schoolId,
      role: invitation.role,
      departmentId: invitation.departmentId,
      status: 'active',
    });

    // Mark invitation as accepted
    await db.update(schema.schoolInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(schema.schoolInvitations.id, invitation.id));

    console.log('[Schools] User', userId, 'accepted invitation to school', invitation.schoolId);

    res.json({ 
      message: 'Invitation accepted',
      schoolId: invitation.schoolId,
      role: invitation.role,
    });

  } catch (error) {
    console.error('[Schools] Accept invitation error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

/**
 * Update member role
 */
router.patch('/:id/members/:userId', requireAuth, loadSchool(), requireSchoolPermission('staff:update_role'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.id;
    const targetUserId = req.params.userId;
    const { role, status, departmentId } = req.body;

    // Can't change principal role this way
    const school = req.school!;
    if (targetUserId === school.principalId && role && role !== 'principal') {
      return res.status(400).json({ 
        error: 'Cannot demote principal. Transfer ownership first.' 
      });
    }

    const updates: Partial<NewSchoolMembership> = {};
    if (role) updates.role = role;
    if (status) updates.status = status;
    if (departmentId !== undefined) updates.departmentId = departmentId;
    updates.updatedAt = new Date();

    const [updated] = await db.update(schema.schoolMemberships)
      .set(updates)
      .where(and(
        eq(schema.schoolMemberships.schoolId, schoolId),
        eq(schema.schoolMemberships.userId, targetUserId),
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ 
      message: 'Member updated',
      membership: updated,
    });

  } catch (error) {
    console.error('[Schools] Update member error:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

/**
 * Remove member from school
 */
router.delete('/:id/members/:userId', requireAuth, loadSchool(), requireSchoolPermission('staff:remove'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.id;
    const targetUserId = req.params.userId;

    // Can't remove principal
    const school = req.school!;
    if (targetUserId === school.principalId) {
      return res.status(400).json({ error: 'Cannot remove principal from school' });
    }

    await db.delete(schema.schoolMemberships)
      .where(and(
        eq(schema.schoolMemberships.schoolId, schoolId),
        eq(schema.schoolMemberships.userId, targetUserId),
      ));

    res.json({ message: 'Member removed' });

  } catch (error) {
    console.error('[Schools] Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;
