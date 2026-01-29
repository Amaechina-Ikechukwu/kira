import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  originalFilename: text('original_filename').notNull(),
  cloudinaryUrl: text('cloudinary_url').notNull(),
  cloudinaryPublicId: text('cloudinary_public_id').notNull(),
  extractedText: text('extracted_text'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
