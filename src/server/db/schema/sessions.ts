import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email'),
  topic: text('topic'),
  currentStage: integer('current_stage').notNull().default(1),
  lessonPlan: jsonb('lesson_plan').notNull(),
  personalityTone: text('personality_tone').notNull().default('Hype Man'),
  isChallenge: text('is_challenge').default('false'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
