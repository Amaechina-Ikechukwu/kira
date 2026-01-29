import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';
import { documents } from './documents';

export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
  topic: text('topic').notNull(),
  lessonPlan: jsonb('lesson_plan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
