import { Router, Request, Response } from 'express';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import { db, schema } from '../db';
import { requireAuth } from './auth';
import { requireSchoolPermission, loadSchool, getSchoolMembership } from '../middleware/rbac';
import { 
  createCalendarMeeting, 
  updateCalendarMeeting, 
  cancelCalendarMeeting,
  addAttendeesToMeeting,
  hasCalendarAccess,
} from '../services/google-calendar';
import { 
  NewMeeting, 
  NewMeetingParticipant,
  MeetingSettings,
  MeetingType,
} from '../db/schema/meetings';
import { sendMeetingInviteEmail, sendMeetingSummaryEmail } from '../services/email';

const router = Router();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user has access to a meeting
 */
async function canAccessMeeting(userId: string, meetingId: string): Promise<{
  canAccess: boolean;
  isHost: boolean;
  role?: string;
}> {
  const meeting = await db.query.meetings.findFirst({
    where: eq(schema.meetings.id, meetingId),
  });

  if (!meeting) {
    return { canAccess: false, isHost: false };
  }

  // Host always has access
  if (meeting.hostId === userId) {
    return { canAccess: true, isHost: true, role: 'host' };
  }

  // Check if user is a participant
  const participant = await db.query.meetingParticipants.findFirst({
    where: and(
      eq(schema.meetingParticipants.meetingId, meetingId),
      eq(schema.meetingParticipants.userId, userId)
    ),
  });

  if (participant) {
    return { canAccess: true, isHost: false, role: participant.role };
  }

  // Check if user is a member of the school
  const membership = await getSchoolMembership(userId, meeting.schoolId);
  if (membership) {
    // Teachers and above can see all meetings
    if (['principal', 'vice_principal', 'dept_head', 'teacher'].includes(membership.role)) {
      return { canAccess: true, isHost: false, role: membership.role };
    }
  }

  return { canAccess: false, isHost: false };
}

// ============================================================================
// Meeting CRUD Routes
// ============================================================================

/**
 * Create a new meeting
 */
router.post('/:schoolId/meetings', requireAuth, loadSchool(), requireSchoolPermission('meetings:create'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.schoolId as string;
    const userId = req.userId!;
    const { 
      title, 
      description, 
      type,
      classId,
      scheduledStart, 
      scheduledEnd, 
      timezone,
      settings,
      attendeeIds,
      recurrenceRule,
      createGoogleMeet,
    } = req.body;

    // Validate required fields
    if (!title || !scheduledStart || !scheduledEnd) {
      return res.status(400).json({ error: 'Title, scheduledStart, and scheduledEnd are required' });
    }

    const startTime = new Date(scheduledStart);
    const endTime = new Date(scheduledEnd);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // Validate class if provided
    if (classId) {
      const classObj = await db.query.classes.findFirst({
        where: and(
          eq(schema.classes.id, classId),
          eq(schema.classes.schoolId, schoolId)
        ),
      });
      if (!classObj) {
        return res.status(400).json({ error: 'Class not found in this school' });
      }
    }

    let googleEventId: string | null = null;
    let googleMeetLink: string | null = null;

    // Create Google Calendar event with Meet link
    if (createGoogleMeet !== false) {
      const hasAccess = await hasCalendarAccess(userId);
      if (hasAccess) {
        // Get attendee emails
        let attendeeEmails: { email: string; displayName?: string }[] = [];
        if (attendeeIds && attendeeIds.length > 0) {
          const attendeeUsers = await db.query.users.findMany({
            where: (users, { inArray }) => inArray(users.id, attendeeIds),
          });
          attendeeEmails = attendeeUsers.map(u => ({
            email: u.email,
            displayName: u.name || undefined,
          }));
        }

        const calendarResult = await createCalendarMeeting(userId, {
          title,
          description,
          startTime,
          endTime,
          timezone: timezone || 'UTC',
          attendees: attendeeEmails,
          recurrence: recurrenceRule ? [recurrenceRule] : undefined,
          sendNotifications: true,
        });

        if (calendarResult) {
          googleEventId = calendarResult.eventId;
          googleMeetLink = calendarResult.meetLink;
        }
      }
    }

    // Create meeting in database
    const [meeting] = await db.insert(schema.meetings).values({
      schoolId,
      classId: classId || null,
      hostId: userId,
      title: title.trim(),
      description: description || null,
      type: (type as MeetingType) || 'class',
      scheduledStart: startTime,
      scheduledEnd: endTime,
      timezone: timezone || 'UTC',
      googleEventId,
      googleMeetLink,
      googleCalendarId: 'primary',
      settings: settings as MeetingSettings || undefined,
      recurrenceRule: recurrenceRule || null,
    }).returning();

    // Add host as participant
    await db.insert(schema.meetingParticipants).values({
      meetingId: meeting.id,
      userId,
      role: 'host',
      rsvpStatus: 'accepted',
      isRequired: true,
    });

    // Add other participants
    if (attendeeIds && attendeeIds.length > 0) {
      const participantValues = attendeeIds
        .filter((id: string) => id !== userId) // Don't duplicate host
        .map((id: string) => ({
          meetingId: meeting.id,
          userId: id,
          role: 'attendee' as const,
          rsvpStatus: 'pending' as const,
          isRequired: true,
        }));

      if (participantValues.length > 0) {
        await db.insert(schema.meetingParticipants).values(participantValues);
      }
    }

    // Send email invites
    const host = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    if (host && attendeeIds && attendeeIds.length > 0) {
      const attendees = await db.query.users.findMany({
        where: (users, { inArray }) => inArray(users.id, attendeeIds),
      });
      for (const attendee of attendees) {
        if (attendee.email) {
          sendMeetingInviteEmail({
            to: attendee.email,
            recipientName: attendee.name || 'Friend',
            meetingTitle: title,
            hostName: host.name || 'Host',
            scheduledStart: startTime,
            scheduledEnd: endTime,
            meetLink: googleMeetLink,
            description: description,
          }).catch(err => console.error(`[Meetings] Failed to send invite to ${attendee.email}`, err));
        }
      }
    }

    console.log('[Meetings] Created:', meeting.id, 'with Google Meet:', !!googleMeetLink);

    res.status(201).json({
      message: 'Meeting created',
      meeting: {
        ...meeting,
        googleMeetLink,
      },
    });

  } catch (error) {
    console.error('[Meetings] Create error:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

/**
 * List meetings for a school
 */
router.get('/:schoolId/meetings', requireAuth, loadSchool(), requireSchoolPermission('meetings:attend'), async (req: Request, res: Response) => {
  try {
    const schoolId = req.params.schoolId;
    const userId = req.userId!;
    const membership = req.membership!;
    const { status, classId, from, to, type } = req.query;

    let meetings = await db.query.meetings.findMany({
      where: eq(schema.meetings.schoolId, schoolId),
    });

    // Filter by status
    if (status && typeof status === 'string') {
      meetings = meetings.filter(m => m.status === status);
    }

    // Filter by class
    if (classId && typeof classId === 'string') {
      meetings = meetings.filter(m => m.classId === classId);
    }

    // Filter by type
    if (type && typeof type === 'string') {
      meetings = meetings.filter(m => m.type === type);
    }

    // Filter by date range
    if (from && typeof from === 'string') {
      const fromDate = new Date(from);
      meetings = meetings.filter(m => m.scheduledStart >= fromDate);
    }
    if (to && typeof to === 'string') {
      const toDate = new Date(to);
      meetings = meetings.filter(m => m.scheduledEnd <= toDate);
    }

    // For students, only show meetings they're invited to or public class meetings
    if (membership.role === 'student') {
      const participations = await db.query.meetingParticipants.findMany({
        where: eq(schema.meetingParticipants.userId, userId),
      });
      const participatingMeetingIds = participations.map(p => p.meetingId);

      // Also check if student is enrolled in the class
      const enrollments = await db.query.classEnrollments.findMany({
        where: and(
          eq(schema.classEnrollments.studentId, userId),
          eq(schema.classEnrollments.status, 'enrolled')
        ),
      });
      const enrolledClassIds = enrollments.map(e => e.classId);

      meetings = meetings.filter(m => 
        participatingMeetingIds.includes(m.id) ||
        (m.classId && enrolledClassIds.includes(m.classId))
      );
    }

    // Get host details
    const hostIds = [...new Set(meetings.map(m => m.hostId))];
    const hosts = hostIds.length > 0
      ? await db.query.users.findMany({
          where: (users, { inArray }) => inArray(users.id, hostIds),
        })
      : [];

    const meetingsWithDetails = meetings.map(meeting => ({
      ...meeting,
      host: hosts.find(h => h.id === meeting.hostId) || null,
    }));

    res.json({ meetings: meetingsWithDetails });

  } catch (error) {
    console.error('[Meetings] List error:', error);
    res.status(500).json({ error: 'Failed to list meetings' });
  }
});

/**
 * Get meeting details
 */
router.get('/meetings/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId!;

    const meeting = await db.query.meetings.findFirst({
      where: eq(schema.meetings.id, meetingId),
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check access
    const access = await canAccessMeeting(userId, meetingId);
    if (!access.canAccess) {
      return res.status(403).json({ error: 'You do not have access to this meeting' });
    }

    // Get participants
    const participants = await db.query.meetingParticipants.findMany({
      where: eq(schema.meetingParticipants.meetingId, meetingId),
    });

    // Get participant user details
    const participantUserIds = participants.filter(p => p.userId).map(p => p.userId!);
    const participantUsers = participantUserIds.length > 0
      ? await db.query.users.findMany({
          where: (users, { inArray }) => inArray(users.id, participantUserIds),
        })
      : [];

    const participantsWithDetails = participants.map(p => ({
      ...p,
      user: p.userId ? participantUsers.find(u => u.id === p.userId) : null,
    }));

    // Get host details
    const host = await db.query.users.findFirst({
      where: eq(schema.users.id, meeting.hostId),
    });

    // Get recordings if any
    const recordings = await db.query.meetingRecordings.findMany({
      where: eq(schema.meetingRecordings.meetingId, meetingId),
    });

    res.json({
      meeting,
      host,
      participants: participantsWithDetails,
      recordings,
      myRole: access.role,
      isHost: access.isHost,
    });

  } catch (error) {
    console.error('[Meetings] Get error:', error);
    res.status(500).json({ error: 'Failed to get meeting' });
  }
});

/**
 * Update meeting
 */
router.patch('/meetings/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId!;
    const { title, description, scheduledStart, scheduledEnd, status, settings } = req.body;

    const meeting = await db.query.meetings.findFirst({
      where: eq(schema.meetings.id, meetingId),
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Only host or school admins can update
    const access = await canAccessMeeting(userId, meetingId);
    if (!access.isHost && !['principal', 'vice_principal', 'dept_head'].includes(access.role || '')) {
      return res.status(403).json({ error: 'Only the host can update this meeting' });
    }

    const updates: Partial<NewMeeting> = {};
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (scheduledStart) updates.scheduledStart = new Date(scheduledStart);
    if (scheduledEnd) updates.scheduledEnd = new Date(scheduledEnd);
    if (status) updates.status = status;
    if (settings) updates.settings = settings;
    updates.updatedAt = new Date();

    const [updated] = await db.update(schema.meetings)
      .set(updates)
      .where(eq(schema.meetings.id, meetingId))
      .returning();

    // Update Google Calendar event if exists
    if (meeting.googleEventId && (title || description || scheduledStart || scheduledEnd)) {
      await updateCalendarMeeting(meeting.hostId, meeting.googleEventId, {
        title: title || undefined,
        description: description,
        startTime: scheduledStart ? new Date(scheduledStart) : undefined,
        endTime: scheduledEnd ? new Date(scheduledEnd) : undefined,
      });
    }

    res.json({
      message: 'Meeting updated',
      meeting: updated,
    });

  } catch (error) {
    console.error('[Meetings] Update error:', error);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

/**
 * Cancel/delete meeting
 */
router.delete('/meetings/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId!;
    const { cancel } = req.query; // ?cancel=true to just cancel, otherwise delete

    const meeting = await db.query.meetings.findFirst({
      where: eq(schema.meetings.id, meetingId),
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Only host can delete/cancel
    const access = await canAccessMeeting(userId, meetingId);
    if (!access.isHost && !['principal', 'vice_principal'].includes(access.role || '')) {
      return res.status(403).json({ error: 'Only the host can cancel this meeting' });
    }

    if (cancel === 'true') {
      // Just cancel, don't delete
      await db.update(schema.meetings)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(schema.meetings.id, meetingId));

      // Cancel Google Calendar event
      if (meeting.googleEventId) {
        await cancelCalendarMeeting(meeting.hostId, meeting.googleEventId);
      }

      res.json({ message: 'Meeting cancelled' });
    } else {
      // Delete completely
      await db.delete(schema.meetings).where(eq(schema.meetings.id, meetingId));

      // Delete Google Calendar event
      if (meeting.googleEventId) {
        await cancelCalendarMeeting(meeting.hostId, meeting.googleEventId);
      }

      res.json({ message: 'Meeting deleted' });
    }

  } catch (error) {
    console.error('[Meetings] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

// ============================================================================
// Participant Management
// ============================================================================

/**
 * Add participants to meeting
 */
router.post('/meetings/:id/participants', requireAuth, async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId!;
    const { userIds, emails } = req.body;

    const meeting = await db.query.meetings.findFirst({
      where: eq(schema.meetings.id, meetingId),
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Only host can add participants
    const access = await canAccessMeeting(userId, meetingId);
    if (!access.isHost && !['principal', 'vice_principal', 'dept_head'].includes(access.role || '')) {
      return res.status(403).json({ error: 'Only the host can add participants' });
    }

    const addedParticipants: NewMeetingParticipant[] = [];
    const attendeesForGoogle: { email: string; displayName?: string }[] = [];

    // Add by user IDs
    if (userIds && Array.isArray(userIds)) {
      const existingParticipants = await db.query.meetingParticipants.findMany({
        where: eq(schema.meetingParticipants.meetingId, meetingId),
      });
      const existingUserIds = existingParticipants.map(p => p.userId);

      const newUserIds = userIds.filter((id: string) => !existingUserIds.includes(id));
      
      if (newUserIds.length > 0) {
        const users = await db.query.users.findMany({
          where: (users, { inArray }) => inArray(users.id, newUserIds),
        });

        for (const user of users) {
          addedParticipants.push({
            meetingId,
            userId: user.id,
            role: 'attendee',
            rsvpStatus: 'pending',
          });
          attendeesForGoogle.push({ email: user.email, displayName: user.name || undefined });
        }
      }
    }

    // Add by emails (for external guests)
    if (emails && Array.isArray(emails)) {
      for (const email of emails) {
        if (typeof email === 'string' && email.includes('@')) {
          addedParticipants.push({
            meetingId,
            email: email.toLowerCase(),
            role: 'guest',
            rsvpStatus: 'pending',
          });
          attendeesForGoogle.push({ email: email.toLowerCase() });
        }
      }
    }

    if (addedParticipants.length > 0) {
      await db.insert(schema.meetingParticipants).values(addedParticipants);

      // Add to Google Calendar event
      if (meeting.googleEventId && attendeesForGoogle.length > 0) {
        await addAttendeesToMeeting(meeting.hostId, meeting.googleEventId, attendeesForGoogle);
      }
    }

    res.json({
      message: 'Participants added',
      added: addedParticipants.length,
    });

  } catch (error) {
    console.error('[Meetings] Add participants error:', error);
    res.status(500).json({ error: 'Failed to add participants' });
  }
});

/**
 * Update RSVP status
 */
router.patch('/meetings/:id/rsvp', requireAuth, async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId!;
    const { status } = req.body;

    if (!['accepted', 'declined', 'tentative'].includes(status)) {
      return res.status(400).json({ error: 'Invalid RSVP status' });
    }

    const [updated] = await db.update(schema.meetingParticipants)
      .set({ rsvpStatus: status, updatedAt: new Date() })
      .where(and(
        eq(schema.meetingParticipants.meetingId, meetingId),
        eq(schema.meetingParticipants.userId, userId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'You are not a participant in this meeting' });
    }

    res.json({ message: 'RSVP updated', status });

  } catch (error) {
    console.error('[Meetings] RSVP error:', error);
    res.status(500).json({ error: 'Failed to update RSVP' });
  }
});

/**
 * Mark attendance (when meeting starts/ends)
 */
router.post('/meetings/:id/attendance', requireAuth, async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const userId = req.userId!;
    const { action } = req.body; // 'join' or 'leave'

    if (!['join', 'leave'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use "join" or "leave"' });
    }

    const participant = await db.query.meetingParticipants.findFirst({
      where: and(
        eq(schema.meetingParticipants.meetingId, meetingId),
        eq(schema.meetingParticipants.userId, userId)
      ),
    });

    if (!participant) {
      return res.status(404).json({ error: 'You are not a participant in this meeting' });
    }

    if (action === 'join') {
      await db.update(schema.meetingParticipants)
        .set({ 
          joinedAt: new Date(),
          wasPresent: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.meetingParticipants.id, participant.id));

      // If first join, mark meeting as live
      const meeting = await db.query.meetings.findFirst({
        where: eq(schema.meetings.id, meetingId),
      });
      if (meeting && meeting.status === 'scheduled') {
        await db.update(schema.meetings)
          .set({ status: 'live', actualStart: new Date() })
          .where(eq(schema.meetings.id, meetingId));
      }

      res.json({ message: 'Joined meeting' });
    } else {
      const joinedAt = participant.joinedAt || new Date();
      const duration = Math.floor((Date.now() - joinedAt.getTime()) / 1000);

      await db.update(schema.meetingParticipants)
        .set({ 
          leftAt: new Date(),
          attendanceDuration: (participant.attendanceDuration || 0) + duration,
          updatedAt: new Date(),
        })
        .where(eq(schema.meetingParticipants.id, participant.id));

      res.json({ message: 'Left meeting', duration });
    }

  } catch (error) {
    console.error('[Meetings] Attendance error:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

/**
 * End meeting
 */
router.post('/meetings/:id/end', requireAuth, async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id as string;
    const userId = req.userId!;

    const meeting = await db.query.meetings.findFirst({
      where: eq(schema.meetings.id, meetingId),
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Only host can end meeting
    if (meeting.hostId !== userId) {
      return res.status(403).json({ error: 'Only the host can end the meeting' });
    }

    await db.update(schema.meetings)
      .set({ 
        status: 'ended', 
        actualEnd: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.meetings.id, meetingId));

    // Generate attendance report
    const participants = await db.query.meetingParticipants.findMany({
      where: eq(schema.meetingParticipants.meetingId, meetingId),
    });

    const attended = participants.filter(p => p.wasPresent);
    const absent = participants.filter(p => !p.wasPresent);
    const totalDuration = attended.reduce((sum, p) => sum + (p.attendanceDuration || 0), 0);

    await db.insert(schema.meetingAttendanceReports).values({
      meetingId: meetingId,
      totalInvited: participants.length,
      totalAttended: attended.length,
      totalAbsent: absent.length,
      averageDuration: attended.length > 0 ? Math.floor(totalDuration / attended.length) : 0,
    });

    // Send summary emails
    const participantUserIds = participants.map(p => p.userId).filter(id => id !== null) as string[];
    if (participantUserIds.length > 0) {
      const participantUsers = await db.query.users.findMany({
        where: (users, { inArray }) => inArray(users.id, participantUserIds),
      });
      const userMap = new Map(participantUsers.map(u => [u.id, u]));
      const durationMinutes = meeting.actualStart && meeting.actualEnd 
        ? Math.floor((meeting.actualEnd.getTime() - meeting.actualStart.getTime()) / 60000)
        : 0;
      
      for (const participant of participants) {
        if (participant.userId) {
          const user = userMap.get(participant.userId);
          if (user && user.email) {
             sendMeetingSummaryEmail({
               to: user.email,
               recipientName: user.name || 'Friend',
               meetingTitle: meeting.title,
               durationMinutes,
               participantsCount: attended.length,
             }).catch(err => console.error(`[Meetings] Failed to send summary to ${user.email}`, err));
          }
        } else if (participant.email) {
           sendMeetingSummaryEmail({
             to: participant.email,
             recipientName: 'Guest',
             meetingTitle: meeting.title,
             durationMinutes,
             participantsCount: attended.length,
           }).catch(err => console.error(`[Meetings] Failed to send summary to guest ${participant.email}`, err));
        }
      }
    }

    res.json({ 
      message: 'Meeting ended',
      stats: {
        totalInvited: participants.length,
        attended: attended.length,
        absent: absent.length,
      },
    });

  } catch (error) {
    console.error('[Meetings] End error:', error);
    res.status(500).json({ error: 'Failed to end meeting' });
  }
});

export default router;
