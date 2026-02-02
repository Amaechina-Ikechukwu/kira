import { Router } from 'express';
import { db } from '../db';
import { schoolInvitations, schools, users, schoolMemberships, classes, classEnrollments } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const router = Router();

// POST /api/schools/:id/invite
router.post('/:id/invite', async (req, res) => {
  try {
    const schoolId = req.params.id;
    const { email, role, metadata } = req.body;
    
    // In a real app, get user from session/auth middleware
    // const userId = req.user.id;
    // For now, we'll fetch the first user who is a principal
    const mockPrincipal = await db.query.users.findFirst({
        where: eq(users.platformRole, 'user') // Just grabbing a user for now
    });
    
    if (!mockPrincipal) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const invitedBy = mockPrincipal.id;

    // Check if school exists
    const school = await db.query.schools.findFirst({
      where: eq(schools.id, schoolId),
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Create invitation
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    await db.insert(schoolInvitations).values({
      schoolId,
      email,
      role: role || 'teacher',
      token,
      invitedBy,
      expiresAt,
      metadata, 
    });

    // Mock Email Sending
    console.log(`
      ----------------------------------------
      [MOCK EMAIL SERVICE]
      To: ${email}
      Subject: You've been invited to join ${school.name}
      Link: http://localhost:3000/invite/${token}
      ----------------------------------------
    `);

    res.json({ success: true, message: 'Invitation sent' });
  } catch (error) {
    console.error('Failed to send invitation:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// GET /api/schools/:id/teachers
router.get('/:id/teachers', async (req, res) => {
    try {
        const schoolId = req.params.id;
        // In real implementation, this would join with schoolMemberships
        // For now, return mock data or empty list if no memberships exist
        res.json({ teachers: [] });
    } catch (error) {
         res.status(500).json({ error: 'Failed to fetch teachers' });
    }
});


// GET /api/schools/invite/verify/:token
// Note: Changed path to avoid collision or clarity issues, but keeping it under /api/schools based on index.ts mounting
// GET /api/schools/invite/verify/:token
// Note: Changed path to avoid collision or clarity issues, but keeping it under /api/schools based on index.ts mounting
router.get('/invite/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        // Check if token exists and is valid
        const invitation = await db.query.schoolInvitations.findFirst({
            where: and(eq(schoolInvitations.token, token), isNull(schoolInvitations.acceptedAt)),
        });

        if (!invitation) {
            return res.status(404).json({ valid: false, error: 'Invalid or expired invitation' });
        }

        if (new Date() > invitation.expiresAt) {
            return res.status(400).json({ valid: false, error: 'Invitation has expired' });
        }

        // Fetch School details manually since relation might not be set up
        const school = await db.query.schools.findFirst({
            where: eq(schools.id, invitation.schoolId)
        });

        if (!school) {
             return res.status(404).json({ valid: false, error: 'School not found' });
        }

        res.json({ 
            valid: true, 
            email: invitation.email, 
            role: invitation.role, 
            schoolName: school.name,
            hasCustomDomain: !!school.customDomain,
            metadata: invitation.metadata
        });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// POST /api/schools/invite/accept
router.post('/invite/accept', async (req, res) => {
    try {
        const { token, name, password, subject } = req.body;
        
        // 1. Validate Token
        const invitation = await db.query.schoolInvitations.findFirst({
            where: and(eq(schoolInvitations.token, token), sql`${schoolInvitations.acceptedAt} IS NULL`),
        });

        if (!invitation) {
            return res.status(400).json({ error: 'Invalid invitation' });
        }

        // 2. Create User (Simplified - in real app, hash password)
        const [newUser] = await db.insert(users).values({
            email: invitation.email,
            name: name,
            platformRole: 'user', // Default
        }).returning();

        // 3. Create School Membership
        await db.insert(schoolMemberships).values({
            userId: newUser.id,
            schoolId: invitation.schoolId,
            role: invitation.role as any,
            status: 'active'
        });

        // 4. Handle Teacher Onboarding (Create Class)
        if (invitation.role === 'teacher' && subject) {
            await db.insert(classes).values({
                schoolId: invitation.schoolId,
                teacherId: newUser.id,
                name: subject, // "Algebra II"
                description: `Default class for ${subject}`,
            });
        }

        // 5. Handle Student Onboarding (Auto-enroll)
        // Check metadata for assignedTeacherId
        const metadata = invitation.metadata as any;
        if (invitation.role === 'student' && metadata?.assignedTeacherId) {
             // Find a class by this teacher
             const teacherClass = await db.query.classes.findFirst({
                 where: eq(classes.teacherId, metadata.assignedTeacherId)
             });

             if (teacherClass) {
                 await db.insert(classEnrollments).values({
                     studentId: newUser.id,
                     classId: teacherClass.id,
                     status: 'enrolled'
                 });
             }
        }

        // 6. Mark Invitation Accepted
        await db.update(schoolInvitations)
            .set({ acceptedAt: new Date() })
            .where(eq(schoolInvitations.id, invitation.id));

        res.json({ success: true, userId: newUser.id });

    } catch (error) {
        console.error('Accept error:', error);
        res.status(500).json({ error: 'Failed to accept invitation' });
    }
});

export default router;
