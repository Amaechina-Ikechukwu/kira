import { pgTable, text, timestamp, uuid, jsonb, boolean, integer, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { schools } from './schools';
import { classes } from './schools';

/**
 * Meetings - Google Meet sessions for classes
 */
export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'set null' }),
  hostId: uuid('host_id').notNull().references(() => users.id),
  
  // Meeting details
  title: text('title').notNull(),
  description: text('description'),
  type: text('type', { enum: ['class', 'tutoring', 'office_hours', 'parent_conference', 'staff', 'other'] }).notNull().default('class'),
  
  // Scheduling
  scheduledStart: timestamp('scheduled_start').notNull(),
  scheduledEnd: timestamp('scheduled_end').notNull(),
  actualStart: timestamp('actual_start'),
  actualEnd: timestamp('actual_end'),
  timezone: text('timezone').notNull().default('UTC'),
  
  // Google integration
  googleEventId: text('google_event_id').unique(),
  googleMeetLink: text('google_meet_link'),
  googleCalendarId: text('google_calendar_id'),
  
  // Status
  status: text('status', { 
    enum: ['scheduled', 'live', 'ended', 'cancelled'] 
  }).notNull().default('scheduled'),
  
  // Settings
  settings: jsonb('settings').$type<MeetingSettings>().default({
    allowGuests: false,
    recordingEnabled: true,
    autoAdmit: true,
    muteOnEntry: true,
    chatEnabled: true,
    screenShareEnabled: true,
  }),
  
  // Recurrence (for series meetings)
  recurrenceRule: text('recurrence_rule'), // iCal RRULE format
  parentMeetingId: uuid('parent_meeting_id').references((): any => meetings.id, { onDelete: 'cascade' }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Meeting Participants
 */
export const meetingParticipants = pgTable('meeting_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  
  // For external participants (guests)
  email: text('email'),
  name: text('name'),
  
  // Role in meeting
  role: text('role', { 
    enum: ['host', 'co_host', 'presenter', 'attendee', 'guest'] 
  }).notNull().default('attendee'),
  
  // Response
  rsvpStatus: text('rsvp_status', { 
    enum: ['pending', 'accepted', 'declined', 'tentative'] 
  }).notNull().default('pending'),
  
  // Attendance
  joinedAt: timestamp('joined_at'),
  leftAt: timestamp('left_at'),
  attendanceDuration: integer('attendance_duration'), // seconds
  
  // Flags
  isRequired: boolean('is_required').default(true),
  wasPresent: boolean('was_present').default(false),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueParticipant: unique().on(table.meetingId, table.userId),
}));

/**
 * Meeting Recordings
 */
export const meetingRecordings = pgTable('meeting_recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  
  // Storage
  cloudinaryUrl: text('cloudinary_url'),
  cloudinaryPublicId: text('cloudinary_public_id'),
  googleDriveFileId: text('google_drive_file_id'),
  
  // Metadata
  duration: integer('duration'), // seconds
  fileSize: integer('file_size'), // bytes
  format: text('format'), // mp4, webm, etc.
  
  // Processing status
  status: text('status', { 
    enum: ['uploading', 'processing', 'ready', 'failed'] 
  }).notNull().default('uploading'),
  
  // Transcription
  transcriptionStatus: text('transcription_status', { 
    enum: ['pending', 'processing', 'completed', 'failed'] 
  }).default('pending'),
  transcription: text('transcription'), // Full text
  transcriptionVtt: text('transcription_vtt'), // WebVTT format for captions
  
  // AI Summary
  summary: text('summary'),
  keyPoints: jsonb('key_points').$type<string[]>(),
  actionItems: jsonb('action_items').$type<ActionItem[]>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Meeting Attendance Reports
 * Aggregated attendance data for analytics
 */
export const meetingAttendanceReports = pgTable('meeting_attendance_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }).unique(),
  
  // Stats
  totalInvited: integer('total_invited').notNull().default(0),
  totalAttended: integer('total_attended').notNull().default(0),
  totalAbsent: integer('total_absent').notNull().default(0),
  averageDuration: integer('average_duration'), // seconds
  
  // Detailed breakdown
  attendanceDetails: jsonb('attendance_details').$type<AttendanceDetail[]>(),
  
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
});

// ============================================================================
// Types
// ============================================================================

export interface MeetingSettings {
  allowGuests: boolean;
  recordingEnabled: boolean;
  autoAdmit: boolean;
  muteOnEntry: boolean;
  chatEnabled: boolean;
  screenShareEnabled: boolean;
  breakoutRoomsEnabled?: boolean;
  maxParticipants?: number;
}

export interface ActionItem {
  task: string;
  assignee?: string;
  dueDate?: string;
  completed: boolean;
}

export interface AttendanceDetail {
  participantId: string;
  email: string;
  name?: string;
  wasPresent: boolean;
  joinedAt?: string;
  leftAt?: string;
  duration?: number;
}

export type MeetingType = 'class' | 'tutoring' | 'office_hours' | 'parent_conference' | 'staff' | 'other';
export type MeetingStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';
export type ParticipantRole = 'host' | 'co_host' | 'presenter' | 'attendee' | 'guest';
export type RSVPStatus = 'pending' | 'accepted' | 'declined' | 'tentative';
export type RecordingStatus = 'uploading' | 'processing' | 'ready' | 'failed';
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
export type MeetingParticipant = typeof meetingParticipants.$inferSelect;
export type NewMeetingParticipant = typeof meetingParticipants.$inferInsert;
export type MeetingRecording = typeof meetingRecordings.$inferSelect;
export type NewMeetingRecording = typeof meetingRecordings.$inferInsert;
export type MeetingAttendanceReport = typeof meetingAttendanceReports.$inferSelect;
export type NewMeetingAttendanceReport = typeof meetingAttendanceReports.$inferInsert;
