import { pgTable, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

// Session table for tracking student lesson progress
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // UUID
  studentId: text('student_id').notNull(),
  currentStage: integer('current_stage').default(1).notNull(),
  lessonPlan: jsonb('lesson_plan'), // AI-generated GameInterface JSON
  failedQuestions: jsonb('failed_questions'), // Questions from Google Sheets
  personalityTone: text('personality_tone').default('Hype Man'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports for use in application
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
