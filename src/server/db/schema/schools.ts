import { pgTable, text, timestamp, uuid, jsonb, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Schools / Learning Centers
 * The main organizational unit in Kira
 */
export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // e.g., "Springfield High School"
  type: text('type', { 
    enum: ['school', 'learning_center', 'academy', 'university', 'training_center'] 
  }).notNull().default('school'),
  customDomain: text('custom_domain'), // e.g. "school.edu"
  slug: text('slug').notNull().unique(), // URL-friendly identifier
  logoUrl: text('logo_url'),
  address: text('address'),
  city: text('city'),
  country: text('country'),
  website: text('website'),
  phone: text('phone'),
  principalId: uuid('principal_id').notNull().references(() => users.id),
  settings: jsonb('settings').$type<SchoolSettings>().default({
    allowSelfEnrollment: false,
    requireParentApproval: true,
    gradingSystem: 'percentage',
    academicYear: '2025-2026',
    defaultLanguage: 'en',
  }),
  plan: text('plan', { enum: ['free', 'pro', 'enterprise'] }).notNull().default('free'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Departments within a school
 * e.g., Mathematics, Science, English
 */
export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  headId: uuid('head_id').references(() => users.id),
  color: text('color'), // For UI display
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Classes / Courses within a school
 * e.g., "Algebra 101", "Physics 201"
 */
export const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  code: text('code'), // e.g., "MATH-101"
  description: text('description'),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  schedule: jsonb('schedule').$type<ClassSchedule>(),
  room: text('room'),
  capacity: text('capacity'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * School Memberships - Links users to schools with roles
 */
export const schoolMemberships = pgTable('school_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  role: text('role', { 
    enum: ['principal', 'vice_principal', 'dept_head', 'teacher', 'teaching_assistant', 'student'] 
  }).notNull().default('student'),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  status: text('status', { 
    enum: ['pending', 'active', 'suspended', 'graduated'] 
  }).notNull().default('active'),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  graduatedAt: timestamp('graduated_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueMembership: unique().on(table.userId, table.schoolId),
}));

/**
 * Class Enrollments - Links students to classes
 */
export const classEnrollments = pgTable('class_enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  grade: text('grade'),
  status: text('status', { enum: ['enrolled', 'completed', 'dropped'] }).notNull().default('enrolled'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueEnrollment: unique().on(table.studentId, table.classId),
}));

/**
 * School Invitations - For inviting users to join a school
 */
export const schoolInvitations = pgTable('school_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { 
    enum: ['vice_principal', 'dept_head', 'teacher', 'teaching_assistant', 'student'] 
  }).notNull().default('student'),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  token: text('token').notNull().unique(),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  message: text('message'), // Optional personal message
  metadata: jsonb('metadata'), // Store extra data like { assignedTeacherId: '...', autoJoinClassIds: [] }
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// Types
// ============================================================================

export interface SchoolSettings {
  allowSelfEnrollment: boolean;
  requireParentApproval: boolean;
  gradingSystem: 'percentage' | 'letter' | 'gpa';
  academicYear: string;
  defaultLanguage: string;
}

export interface ClassSchedule {
  days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  startTime: string; // "09:00"
  endTime: string;   // "10:30"
  timezone: string;
}

export type SchoolRole = 'principal' | 'vice_principal' | 'dept_head' | 'teacher' | 'teaching_assistant' | 'student';
export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'graduated';
export type EnrollmentStatus = 'enrolled' | 'completed' | 'dropped';
export type SchoolType = 'school' | 'learning_center' | 'academy' | 'university' | 'training_center';
export type SchoolPlan = 'free' | 'pro' | 'enterprise';

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
export type SchoolMembership = typeof schoolMemberships.$inferSelect;
export type NewSchoolMembership = typeof schoolMemberships.$inferInsert;
export type ClassEnrollment = typeof classEnrollments.$inferSelect;
export type NewClassEnrollment = typeof classEnrollments.$inferInsert;
export type SchoolInvitation = typeof schoolInvitations.$inferSelect;
export type NewSchoolInvitation = typeof schoolInvitations.$inferInsert;
