import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '../db';
import { requireAuth } from './auth';
import { requirePlatformPermission } from '../middleware/rbac';
import { PlatformRole } from '../db/schema/users';

const router = Router();

/**
 * Invite a user to the platform (Owner/Superadmin only)
 */
router.post('/invitations', requireAuth, requirePlatformPermission('staff:manage'), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const inviterPlatformRole = req.user!.platformRole;
    
    const { email, role } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const inviteRole = (role as PlatformRole) || 'admin';

    // Validate role and hierarchy
    const validRoles: PlatformRole[] = ['superadmin', 'admin', 'moderator', 'support'];
    
    if (!validRoles.includes(inviteRole)) {
         return res.status(400).json({ error: 'Invalid platform role' });
    }

    // Owner can invite anyone. Superadmin can invite admins/moderators/support.
    if (inviterPlatformRole === 'superadmin' && inviteRole === 'superadmin') {
         return res.status(403).json({ error: 'Superadmins cannot invite other Superadmins. Only the Owner can.' });
    }
    
    // Check if user exists already
    const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.email, normalizedEmail)
    });
    
    if (existingUser) {
        // Only error if trying to overwrite a role, or logic to upgrade? 
        // For now, let's say if they have a platform role already, we stop?
        if (existingUser.platformRole !== 'user') {
             return res.status(400).json({ error: 'User already has a platform role: ' + existingUser.platformRole });
        }
        // If they are just a user, we can upgrade them via invite? 
        // Or just let them login and auto-upgrade.
    }

    // Check for existing pending invitation
    const existingInvitation = await db.query.platformInvitations.findFirst({
      where: and(
        eq(schema.platformInvitations.email, normalizedEmail),
        eq(schema.platformInvitations.acceptedAt, null as any),
      ),
    });

    if (existingInvitation && existingInvitation.expiresAt > new Date()) {
      return res.status(400).json({ error: 'Invitation already pending for this email' });
    }

    // Create invitation
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invitation] = await db.insert(schema.platformInvitations).values({
      email: normalizedEmail,
      role: inviteRole,
      token,
      invitedBy: userId,
      expiresAt,
    }).returning();

    // TODO: Send invitation email
    console.log('[Admin] Created platform invitation:', invitation.id, 'for:', normalizedEmail, 'Role:', inviteRole);

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
    console.error('[Admin] Invite error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

export default router;
