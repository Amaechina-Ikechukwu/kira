import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';

// ============================================================================
// Types
// ============================================================================

export interface CreateMeetingOptions {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone?: string;
  attendees?: { email: string; displayName?: string }[];
  recurrence?: string[]; // iCal RRULE format
  sendNotifications?: boolean;
}

export interface MeetingEventResult {
  eventId: string;
  meetLink: string;
  htmlLink: string;
  calendarId: string;
  hangoutLink?: string;
}

export interface UpdateMeetingOptions {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  attendees?: { email: string; displayName?: string }[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get OAuth2 client with user's tokens
 */
async function getAuthenticatedClient(userId: string): Promise<OAuth2Client | null> {
  // Get user's OAuth tokens
  const tokens = await db.query.oauthTokens.findFirst({
    where: eq(schema.oauthTokens.userId, userId),
  });

  if (!tokens) {
    console.log('[Calendar] No OAuth tokens found for user:', userId);
    return null;
  }

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken || undefined,
    token_type: tokens.tokenType || 'Bearer',
    expiry_date: tokens.expiresAt?.getTime(),
  });

  // Check if token needs refresh
  if (tokens.expiresAt && tokens.expiresAt < new Date()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update stored tokens
      await db.update(schema.oauthTokens)
        .set({
          accessToken: credentials.access_token!,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          updatedAt: new Date(),
        })
        .where(eq(schema.oauthTokens.userId, userId));

      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('[Calendar] Failed to refresh token:', error);
      return null;
    }
  }

  return oauth2Client;
}

/**
 * Get Google Calendar API client
 */
async function getCalendarClient(userId: string): Promise<calendar_v3.Calendar | null> {
  const auth = await getAuthenticatedClient(userId);
  if (!auth) return null;

  // Use type assertion to handle version mismatch between google-auth-library versions
  return google.calendar({ version: 'v3', auth: auth as any });
}

// ============================================================================
// Calendar Operations
// ============================================================================

/**
 * Create a Google Calendar event with Google Meet
 */
export async function createCalendarMeeting(
  userId: string,
  options: CreateMeetingOptions
): Promise<MeetingEventResult | null> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) {
    console.log('[Calendar] Could not get calendar client for user:', userId);
    return null;
  }

  try {
    const event: calendar_v3.Schema$Event = {
      summary: options.title,
      description: options.description,
      start: {
        dateTime: options.startTime.toISOString(),
        timeZone: options.timezone || 'UTC',
      },
      end: {
        dateTime: options.endTime.toISOString(),
        timeZone: options.timezone || 'UTC',
      },
      conferenceData: {
        createRequest: {
          requestId: `kira-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
      attendees: options.attendees?.map(a => ({
        email: a.email,
        displayName: a.displayName,
      })),
      recurrence: options.recurrence,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: options.sendNotifications ? 'all' : 'none',
    });

    const createdEvent = response.data;

    if (!createdEvent.id || !createdEvent.conferenceData?.entryPoints) {
      console.error('[Calendar] Event created but missing expected data:', createdEvent);
      return null;
    }

    // Find the Google Meet link
    const meetEntryPoint = createdEvent.conferenceData.entryPoints.find(
      ep => ep.entryPointType === 'video'
    );

    console.log('[Calendar] Created meeting:', createdEvent.id);

    return {
      eventId: createdEvent.id,
      meetLink: meetEntryPoint?.uri || createdEvent.hangoutLink || '',
      htmlLink: createdEvent.htmlLink || '',
      calendarId: 'primary',
      hangoutLink: createdEvent.hangoutLink || undefined,
    };
  } catch (error) {
    console.error('[Calendar] Failed to create meeting:', error);
    return null;
  }
}

/**
 * Update a Google Calendar event
 */
export async function updateCalendarMeeting(
  userId: string,
  eventId: string,
  options: UpdateMeetingOptions
): Promise<boolean> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) return false;

  try {
    const event: calendar_v3.Schema$Event = {};

    if (options.title) event.summary = options.title;
    if (options.description !== undefined) event.description = options.description;
    if (options.startTime) {
      event.start = { dateTime: options.startTime.toISOString() };
    }
    if (options.endTime) {
      event.end = { dateTime: options.endTime.toISOString() };
    }
    if (options.attendees) {
      event.attendees = options.attendees.map(a => ({
        email: a.email,
        displayName: a.displayName,
      }));
    }

    await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: event,
      sendUpdates: 'all',
    });

    console.log('[Calendar] Updated meeting:', eventId);
    return true;
  } catch (error) {
    console.error('[Calendar] Failed to update meeting:', error);
    return false;
  }
}

/**
 * Cancel a Google Calendar event
 */
export async function cancelCalendarMeeting(
  userId: string,
  eventId: string,
  sendNotifications = true
): Promise<boolean> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) return false;

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: sendNotifications ? 'all' : 'none',
    });

    console.log('[Calendar] Cancelled meeting:', eventId);
    return true;
  } catch (error) {
    console.error('[Calendar] Failed to cancel meeting:', error);
    return false;
  }
}

/**
 * Get event details from Google Calendar
 */
export async function getCalendarEvent(
  userId: string,
  eventId: string
): Promise<calendar_v3.Schema$Event | null> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) return null;

  try {
    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    });

    return response.data;
  } catch (error) {
    console.error('[Calendar] Failed to get event:', error);
    return null;
  }
}

/**
 * List upcoming calendar events
 */
export async function listUpcomingEvents(
  userId: string,
  maxResults = 10
): Promise<calendar_v3.Schema$Event[]> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) return [];

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    console.error('[Calendar] Failed to list events:', error);
    return [];
  }
}

/**
 * Add attendees to an existing event
 */
export async function addAttendeesToMeeting(
  userId: string,
  eventId: string,
  attendees: { email: string; displayName?: string }[]
): Promise<boolean> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) return false;

  try {
    // Get current event
    const event = await getCalendarEvent(userId, eventId);
    if (!event) return false;

    // Merge attendees
    const existingEmails = new Set(event.attendees?.map(a => a.email) || []);
    const newAttendees = attendees.filter(a => !existingEmails.has(a.email));

    if (newAttendees.length === 0) {
      return true; // No new attendees to add
    }

    const allAttendees = [
      ...(event.attendees || []),
      ...newAttendees.map(a => ({ email: a.email, displayName: a.displayName })),
    ];

    await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: { attendees: allAttendees },
      sendUpdates: 'all',
    });

    console.log('[Calendar] Added', newAttendees.length, 'attendees to meeting:', eventId);
    return true;
  } catch (error) {
    console.error('[Calendar] Failed to add attendees:', error);
    return false;
  }
}

/**
 * Remove attendee from an event
 */
export async function removeAttendeeFromMeeting(
  userId: string,
  eventId: string,
  attendeeEmail: string
): Promise<boolean> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) return false;

  try {
    const event = await getCalendarEvent(userId, eventId);
    if (!event) return false;

    const updatedAttendees = event.attendees?.filter(a => a.email !== attendeeEmail) || [];

    await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: { attendees: updatedAttendees },
      sendUpdates: 'all',
    });

    console.log('[Calendar] Removed attendee', attendeeEmail, 'from meeting:', eventId);
    return true;
  } catch (error) {
    console.error('[Calendar] Failed to remove attendee:', error);
    return false;
  }
}

/**
 * Check if user has calendar permissions
 */
export async function hasCalendarAccess(userId: string): Promise<boolean> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) return false;

  try {
    // Try to list a single event to verify access
    await calendar.events.list({
      calendarId: 'primary',
      maxResults: 1,
    });
    return true;
  } catch (error) {
    return false;
  }
}
