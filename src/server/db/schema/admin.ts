import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Platform Invitations
 * For inviting users to become platform admins/superadmins
 */
export const platformInvitations = pgTable('platform_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  role: text('role', { 
    enum: ['owner', 'superadmin', 'admin', 'support', 'moderator', 'user'] 
  }).notNull().default('user'),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type PlatformInvitation = typeof platformInvitations.$inferSelect;
export type NewPlatformInvitation = typeof platformInvitations.$inferInsert;
